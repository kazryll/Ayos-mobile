import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "../config/env";

// Types
export interface CategoryMatch {
  categoryId: string;
  similarity: number;
  category: {
    name: string;
    text_for_embedding: string;
  };
}

export interface CategoryResult {
  categoryId: string;
  categoryName: string;
  confidence: number;
  method: 'embedding' | 'llm_validated';
  topMatches: CategoryMatch[];
  reasoning: string;
}

interface CategoryEmbeddings {
  generated_at: string;
  model: string;
  embeddings: Record<string, number[]>;
}

interface Category {
  category_id: string;
  name: string;
  text_for_embedding: string;
}

// Constants
const CONFIDENCE_LEVELS = {
  HIGH: 0.8,      // Use embedding result directly
  MEDIUM: 0.6,    // Validate with LLM
  LOW: 0.4,       // Flag for human review
  VERY_LOW: 0.0   // Reject or force manual categorization
};

// Cache for category embeddings and data
let cachedEmbeddings: CategoryEmbeddings | null = null;
let cachedCategories: Category[] | null = null;

/**
 * Get Gemini API key from environment
 */
function getApiKey(): string {
  return ENV.GEMINI_API_KEY || "";
}

/**
 * Preprocess text by normalizing whitespace, removing special characters, etc.
 */
export function preprocessText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')                    // Normalize whitespace
    .replace(/[^\w\s\u0100-\u017F]/g, ' ')   // Remove special chars, keep letters
    .replace(/\d+/g, ' ')                    // Replace numbers with space
    .replace(/\s+/g, ' ')                    // Clean up extra spaces again
    .trim();
}

/**
 * Generate embedding for given text using Gemini API
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // If no Gemini API key is configured, use a deterministic fallback embedding
  if (!ENV.GEMINI_API_KEY) {
    console.warn('⚠️ EXPO_PUBLIC_GEMINI_API_KEY not set — using fallback embedding');
    return generateFallbackEmbedding(text);
  }

  try {
    const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    const preprocessedText = preprocessText(text);
    const result = await model.embedContent(preprocessedText);

    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding with Gemini:', error);
    console.warn('⚠️ Falling back to fallback embedding method');
    return generateFallbackEmbedding(text);
  }
}

/**
 * Fallback embedding: inexpensive deterministic embedding used when API key is missing
 * Generates 768-dimensional embedding to match Gemini's text-embedding-004 output
 */
function generateFallbackEmbedding(text: string): number[] {
  const preprocessed = preprocessText(text || "");
  const words = preprocessed.split(' ').filter(Boolean);
  const dim = 768; // Match Gemini's embedding dimension
  const emb = new Array(dim).fill(0);

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const h = hashString(w);
    const idx = h % dim;
    emb[idx] += 1 / (i + 1);
  }

  // normalize
  const mag = Math.sqrt(emb.reduce((s, v) => s + v * v, 0));
  if (mag > 0) return emb.map((v) => v / mag);
  return emb;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Compute cosine similarity between two vectors
 */
export function computeCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Load category embeddings from file (with caching)
 */
async function loadCategoryEmbeddings(): Promise<CategoryEmbeddings> {
  if (cachedEmbeddings) {
    return cachedEmbeddings!;
  }

  try {
    // In React Native/Expo, use require() for local JSON files
    cachedEmbeddings = require('../data/categoryEmbeddings.json');
    return cachedEmbeddings!;
  } catch (error) {
    console.error('Error loading category embeddings:', error);
    throw new Error('Category embeddings not found. Please ensure categoryEmbeddings.json exists in /data folder.');
  }
}

/**
 * Load category information from file (with caching)
 */
async function loadCategories(): Promise<Category[]> {
  if (cachedCategories) {
    return cachedCategories!;
  }

  try {
    // In React Native/Expo, use require() for local JSON files
    cachedCategories = require('../data/reportCategories.json');
    return cachedCategories!;
  } catch (error) {
    console.error('Error loading categories:', error);
    throw new Error('Category data not found. Please ensure reportCategories.json exists in /data folder.');
  }
}

/**
 * Get category information by ID
 */
async function getCategoryInfo(categoryId: string): Promise<Category> {
  const categories = await loadCategories();
  const category = categories.find(c => c.category_id === categoryId);

  if (!category) {
    throw new Error(`Category not found: ${categoryId}`);
  }

  return category;
}

/**
 * Categorize report using embedding similarity
 */
export async function categorizeBySimilarity(
  reportText: string
): Promise<CategoryMatch[]> {
  try {
    // 1. Load category embeddings
    const categoryEmbeddings = await loadCategoryEmbeddings();

    // 2. Generate report embedding
    const reportEmbedding = await generateEmbedding(reportText);

    // 3. Compute similarities for all categories
    const similarities = await Promise.all(
      Object.entries(categoryEmbeddings.embeddings).map(
        async ([categoryId, embedding]) => {
          const category = await getCategoryInfo(categoryId);
          return {
            categoryId,
            similarity: computeCosineSimilarity(reportEmbedding, embedding),
            category: {
              name: category.name,
              text_for_embedding: category.text_for_embedding
            }
          };
        }
      )
    );

    // 4. Sort by similarity (descending) and return top 3
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
  } catch (error) {
    console.error('Error in categorizeBySimilarity:', error);
    throw error;
  }
}

/**
 * Validate categorization using LLM for borderline cases
 */
export async function validateWithLLM(
  reportText: string,
  topMatches: CategoryMatch[]
): Promise<string> {
  try {
    // If Gemini key is not configured, skip LLM validation and fallback to best embedding match
    if (!ENV.GEMINI_API_KEY) {
      console.warn('⚠️ EXPO_PUBLIC_GEMINI_API_KEY not set — skipping LLM validation, using embedding match');
      return topMatches[0].categoryId;
    }

    const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const categoryList = topMatches
      .map((m, i) =>
        `${i + 1}. ${m.categoryId}: ${m.category.name} (${(m.similarity * 100).toFixed(1)}% similarity)\n   Description: ${m.category.text_for_embedding}`
      )
      .join('\n\n');

    const prompt = `You are a report classification system for a local government unit (LGU).

Given this citizen report:
"${reportText}"

Top category matches from embedding similarity analysis:
${categoryList}

Based on the report content, return ONLY the single best matching category_id from the list above.
Return just the category_id (e.g., "waste_sanitation"), nothing else - no explanation, no formatting, no punctuation.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();

    // Validate response is one of the top matches
    const validIds = topMatches.map(m => m.categoryId);
    const cleanResponse = response.replace(/['"]/g, '').trim();

    if (validIds.includes(cleanResponse)) {
      return cleanResponse;
    }

    // If LLM returns invalid response, use best embedding match
    console.warn(`LLM returned invalid category: ${response}. Using best embedding match.`);
    return topMatches[0].categoryId;
  } catch (error) {
    console.error('Error in validateWithLLM:', error);
    // Fallback to best embedding match on error
    return topMatches[0].categoryId;
  }
}

/**
 * Main categorization function - determines best category for a report
 */
export async function categorizeReport(reportText: string): Promise<CategoryResult> {
  try {
    // Validate input
    if (!reportText || reportText.trim().length === 0) {
      throw new Error('Report text cannot be empty');
    }

    // 1. Get top 3 matches by similarity
    const topMatches = await categorizeBySimilarity(reportText);

    if (topMatches.length === 0) {
      throw new Error('No category matches found');
    }

    const bestMatch = topMatches[0];
    const confidence = bestMatch.similarity;

    // 2. High confidence → use embedding result directly
    if (confidence >= CONFIDENCE_LEVELS.HIGH) {
      return {
        categoryId: bestMatch.categoryId,
        categoryName: bestMatch.category.name,
        confidence,
        method: 'embedding',
        topMatches,
        reasoning: `Strong embedding match with ${(confidence * 100).toFixed(1)}% similarity. Keywords and context align well with ${bestMatch.category.name}.`
      };
    }

    // 3. Medium/Low confidence → validate with LLM
    console.log(`Confidence ${(confidence * 100).toFixed(1)}% below threshold. Validating with LLM...`);

    const validatedCategoryId = await validateWithLLM(reportText, topMatches);
    const validatedMatch = topMatches.find(m => m.categoryId === validatedCategoryId);

    return {
      categoryId: validatedCategoryId,
      categoryName: validatedMatch?.category.name || bestMatch.category.name,
      confidence: validatedMatch?.similarity || confidence,
      method: 'llm_validated',
      topMatches,
      reasoning: `LLM analysis selected "${validatedMatch?.category.name}" from top ${topMatches.length} candidates. Confidence: ${(confidence * 100).toFixed(1)}%.`
    };
  } catch (error) {
    console.error('Error in categorizeReport:', error);
    throw error;
  }
}

/**
 * Clear cached embeddings and categories (useful for testing)
 */
export function clearCache(): void {
  cachedEmbeddings = null;
  cachedCategories = null;
}

/**
 * Get confidence level description
 */
export function getConfidenceLevel(confidence: number): string {
  if (confidence >= CONFIDENCE_LEVELS.HIGH) return 'High';
  if (confidence >= CONFIDENCE_LEVELS.MEDIUM) return 'Medium';
  if (confidence >= CONFIDENCE_LEVELS.LOW) return 'Low';
  return 'Very Low';
}
