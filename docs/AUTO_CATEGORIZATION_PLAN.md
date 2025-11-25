# AI Auto-Categorization Implementation Plan

## Overview

Implement a hybrid approach combining embedding-based similarity matching with optional LLM validation for accurate and efficient report categorization.

## Dataset

- **Source**: `data/reportCategories.json`
- **Structure**: 11 categories with `category_id`, `name`, and `text_for_embedding`
- **Categories**: waste_sanitation, water_drainage, electricity_lighting, public_infrastructure, transportation_traffic, amenities_environment, public_health_safety, animal_veterinary, public_order_minor, social_welfare_accessibility, governance_transparency

---

## Architecture

```
┌─────────────────────┐
│   New Report Text   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────┐
│  Text Preprocessing         │
│  - Normalize                │
│  - Remove noise             │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Generate Report Embedding  │
│  (Gemini Embedding API)     │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Compute Cosine Similarity  │
│  with Category Embeddings   │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Get Top 3 Matches          │
└──────────┬──────────────────┘
           │
           ├─── High Confidence (>= 0.8) ────► Return Best Match
           │
           └─── Medium/Low Confidence (<0.8) ─┐
                                              │
                                              ▼
                                    ┌───────────────────┐
                                    │  LLM Validation   │
                                    │  (Gemini Flash)   │
                                    └─────────┬─────────┘
                                              │
                                              ▼
                                    ┌───────────────────┐
                                    │  Final Category   │
                                    └───────────────────┘
```

---

## Phase 1: Setup & Infrastructure

### 1.1 Create AI Service File

**File**: `src/lib/services/ai-categorization.ts`

**Purpose**: Centralize all AI categorization logic

**Key Functions**:

```typescript
- preprocessText(text: string): string
- generateEmbedding(text: string): Promise<number[]>
- computeCosineSimilarity(vecA: number[], vecB: number[]): number
- categorizeBySimilarity(reportText: string): Promise<CategoryMatch[]>
- validateWithLLM(reportText: string, topMatches: CategoryMatch[]): Promise<string>
- categorizeReport(reportText: string): Promise<CategoryResult>
```

### 1.2 Environment Variables

Add to `.env`:

```
VITE_GEMINI_API_KEY=your_api_key_here
```

### 1.3 Dependencies

Check if we need to install:

- `@google/generative-ai` (if not already installed)

---

## Phase 2: Category Embeddings Pre-computation

### 2.1 Create Embeddings Generator Script

**File**: `scripts/generate-category-embeddings.ts`

**Purpose**: One-time script to generate embeddings for all categories

**Process**:

1. Read `data/reportCategories.json`
2. For each category:
   - Extract `text_for_embedding`
   - Call Gemini Embedding API
   - Store embedding vector
3. Save to `data/categoryEmbeddings.json`

**Output Format** (`data/categoryEmbeddings.json`):

```json
{
  "generated_at": "2025-11-25T10:00:00Z",
  "model": "text-embedding-004",
  "embeddings": {
    "waste_sanitation": [0.123, -0.456, 0.789, ...],
    "water_drainage": [0.234, -0.567, 0.890, ...],
    ...
  }
}
```

### 2.2 Embedding Regeneration

- Create npm script: `npm run generate-embeddings`
- Regenerate when:
  - Categories are added/modified
  - Embedding model is upgraded
  - `text_for_embedding` is changed

---

## Phase 3: Core Categorization Logic

### 3.1 Text Preprocessing

```typescript
function preprocessText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/[^\w\s\u0100-\u017F]/g, "") // Remove special chars, keep letters
    .replace(/\d+/g, " ") // Replace numbers with space
    .trim();
}
```

### 3.2 Embedding Generation

```typescript
async function generateEmbedding(text: string): Promise<number[]> {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

  const result = await model.embedContent(preprocessText(text));
  return result.embedding.values;
}
```

### 3.3 Cosine Similarity Computation

```typescript
function computeCosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}
```

### 3.4 Similarity-Based Categorization

```typescript
async function categorizeBySimilarity(
  reportText: string
): Promise<CategoryMatch[]> {
  // 1. Load category embeddings
  const categoryEmbeddings = await loadCategoryEmbeddings();

  // 2. Generate report embedding
  const reportEmbedding = await generateEmbedding(reportText);

  // 3. Compute similarities
  const similarities = Object.entries(categoryEmbeddings.embeddings).map(
    ([categoryId, embedding]) => ({
      categoryId,
      similarity: computeCosineSimilarity(reportEmbedding, embedding),
      category: getCategoryInfo(categoryId),
    })
  );

  // 4. Sort by similarity (descending)
  return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, 3); // Top 3
}
```

### 3.5 LLM Validation (Optional)

```typescript
async function validateWithLLM(
  reportText: string,
  topMatches: CategoryMatch[]
): Promise<string> {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const categoryList = topMatches
    .map(
      (m) =>
        `- ${m.categoryId}: ${m.category.name} (${(m.similarity * 100).toFixed(
          1
        )}% match)`
    )
    .join("\n");

  const prompt = `You are a report classification system.

Given this citizen report:
"${reportText}"

Top category matches from embedding similarity:
${categoryList}

Return ONLY the best matching category_id from the list above. No explanation, just the category_id.`;

  const result = await model.generateContent(prompt);
  const response = result.response.text().trim();

  // Validate response is one of the top matches
  const validIds = topMatches.map((m) => m.categoryId);
  return validIds.includes(response) ? response : topMatches[0].categoryId;
}
```

### 3.6 Main Categorization Function

```typescript
interface CategoryResult {
  categoryId: string;
  categoryName: string;
  confidence: number;
  method: "embedding" | "llm_validated";
  topMatches: CategoryMatch[];
  reasoning?: string;
}

async function categorizeReport(reportText: string): Promise<CategoryResult> {
  // 1. Get top 3 matches by similarity
  const topMatches = await categorizeBySimilarity(reportText);

  const bestMatch = topMatches[0];
  const confidence = bestMatch.similarity;

  // 2. High confidence → use embedding result directly
  if (confidence >= 0.8) {
    return {
      categoryId: bestMatch.categoryId,
      categoryName: bestMatch.category.name,
      confidence,
      method: "embedding",
      topMatches,
      reasoning: `Strong embedding match (${(confidence * 100).toFixed(
        1
      )}% similarity)`,
    };
  }

  // 3. Medium/Low confidence → validate with LLM
  const validatedCategoryId = await validateWithLLM(reportText, topMatches);
  const validatedMatch = topMatches.find(
    (m) => m.categoryId === validatedCategoryId
  );

  return {
    categoryId: validatedCategoryId,
    categoryName: validatedMatch?.category.name || bestMatch.category.name,
    confidence: validatedMatch?.similarity || confidence,
    method: "llm_validated",
    topMatches,
    reasoning: `LLM validation selected ${validatedCategoryId} from top matches`,
  };
}
```

---

## Phase 4: Developer Tools Integration

### 4.1 Update DeveloperTools.tsx

Replace mock implementation in `handleAutoCategorize`:

```typescript
const handleAutoCategorize = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsCategorizing(true);

  try {
    // Call AI categorization service
    const result = await AICategorizationService.categorizeReport(
      categorizationInput
    );

    // Format results for UI
    const formattedResults = result.topMatches.map((match, index) => ({
      category: match.category.name,
      confidence: match.similarity,
      reasoning:
        index === 0 && result.method === "llm_validated"
          ? `${result.reasoning} (Validated by LLM)`
          : `Embedding similarity: ${(match.similarity * 100).toFixed(1)}%. ${
              match.category.text_for_embedding
            }`,
    }));

    setCategorizationResults(formattedResults);

    toast({
      title: "Categorization Complete",
      description: `Best match: ${result.categoryName} (${result.method})`,
    });
  } catch (error) {
    console.error("Categorization error:", error);
    toast({
      title: "Categorization Failed",
      description:
        error instanceof Error ? error.message : "Failed to categorize report",
      variant: "destructive",
    });
  } finally {
    setIsCategorizing(false);
  }
};
```

---

## Phase 5: Integration with Report Creation

### 5.1 Update ReportService

Add auto-categorization to `createReport`:

```typescript
static async createReport(data: CreateReportData): Promise<string> {
  // Auto-categorize if no category provided
  if (!data.aiGeneratedAnalysis?.category) {
    const categorization = await AICategorizationService.categorizeReport(
      data.originalDescription
    );

    data.aiGeneratedAnalysis = {
      ...data.aiGeneratedAnalysis,
      category: categorization.categoryId as ReportCategory,
      // Store confidence for analytics
      metadata: {
        categorizationConfidence: categorization.confidence,
        categorizationMethod: categorization.method
      }
    };
  }

  // ... rest of report creation
}
```

---

## Phase 6: Performance & Optimization

### 6.1 Caching Strategy

- Cache category embeddings in memory on app startup
- No need to reload from file on every request

### 6.2 Batch Processing

For bulk imports, process multiple reports in parallel:

```typescript
async function batchCategorize(reports: string[]): Promise<CategoryResult[]> {
  return Promise.all(reports.map((r) => categorizeReport(r)));
}
```

### 6.3 Error Handling

- Fallback to default category if API fails
- Log low-confidence categorizations for review
- Implement retry logic for transient API errors

---

## Phase 7: Monitoring & Improvement

### 7.1 Confidence Thresholds

```typescript
const CONFIDENCE_LEVELS = {
  HIGH: 0.8, // Use embedding result directly
  MEDIUM: 0.6, // Validate with LLM
  LOW: 0.4, // Flag for human review
  VERY_LOW: 0.0, // Reject or force manual categorization
};
```

### 7.2 Analytics Tracking

Store with each report:

- Categorization confidence score
- Method used (embedding vs LLM)
- All top 3 matches
- Time taken for categorization

### 7.3 Feedback Loop

Add UI for officers to mark incorrect categorizations:

- Log to Firestore: `miscategorized_reports` collection
- Use for periodic retraining/refinement
- Update `text_for_embedding` based on common errors

---

## Implementation Timeline

### Week 1: Foundation

- [ ] Set up AI service file structure
- [ ] Implement embedding generation
- [ ] Create category embeddings script
- [ ] Generate initial embeddings

### Week 2: Core Logic

- [ ] Implement cosine similarity
- [ ] Build similarity-based categorization
- [ ] Add LLM validation
- [ ] Test with sample reports

### Week 3: Integration

- [ ] Integrate with Developer Tools
- [ ] Add to report creation flow
- [ ] Implement caching
- [ ] Error handling

### Week 4: Testing & Refinement

- [ ] Test with real reports
- [ ] Tune confidence thresholds
- [ ] Add analytics tracking
- [ ] Document for team

---

## Cost Estimation

### Gemini API Costs

- **Embedding Generation**: ~$0.000025 per request (1,000 chars)
- **LLM Validation**: ~$0.001 per request (Flash model)

### Per Report

- 1 embedding generation (report): $0.000025
- 1 LLM validation (if needed): $0.001
- **Total per report**: ~$0.001025 (worst case)

### Monthly (1000 reports)

- ~$1.03 per 1000 reports
- Very cost-effective for high accuracy

---

## Testing Strategy

### Unit Tests

- Text preprocessing
- Cosine similarity computation
- Embedding generation (mocked)
- Result formatting

### Integration Tests

- End-to-end categorization
- API error handling
- Fallback mechanisms

### Manual Testing

Create test cases for each category:

```javascript
const testCases = [
  {
    text: "There's garbage piling up on our street corner",
    expected: "waste_sanitation",
  },
  {
    text: "Streetlight is broken near the park",
    expected: "electricity_lighting",
  },
  // ... one for each category
];
```

---

## Future Enhancements

1. **Multi-label Classification**: Reports can belong to multiple categories
2. **Priority Prediction**: Predict urgency alongside category
3. **Location-based Context**: Factor in barangay/location patterns
4. **Temporal Analysis**: Track category trends over time
5. **Multilingual Support**: Handle Tagalog/local dialect reports
6. **Image-based Categorization**: Use Gemini Vision for image analysis

---

## Success Metrics

- **Accuracy**: >85% correct categorization
- **Confidence**: >70% of reports with confidence >0.8
- **Speed**: <2 seconds per report
- **Cost**: <$2/month for typical usage
- **User Satisfaction**: Officer feedback on accuracy

---

## Risk Mitigation

| Risk               | Impact | Mitigation                                           |
| ------------------ | ------ | ---------------------------------------------------- |
| API Rate Limits    | High   | Implement queuing, caching, batch processing         |
| Low Accuracy       | High   | Regular retraining, feedback loop, LLM validation    |
| API Costs          | Medium | Monitor usage, optimize thresholds, cache embeddings |
| Category Ambiguity | Medium | Multi-label support, confidence thresholds           |
| Network Failures   | Low    | Retry logic, fallback categories, offline mode       |

---

## Next Steps

1. **Get API Key**: Ensure Gemini API access is set up
2. **Generate Embeddings**: Run script to create `categoryEmbeddings.json`
3. **Implement Core**: Build `ai-categorization.ts` service
4. **Test**: Validate with real report examples
5. **Deploy**: Integrate into production workflow
