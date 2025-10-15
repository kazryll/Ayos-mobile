// services/geminiService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIAnalysis, IssueCategory, IssuePriority } from '../types/reporting';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyCppYlivAYheRY_dFvf-Nj1BA2YdmjSwQQ');

export const analyzeIssueWithAI = async (userDescription: string): Promise<AIAnalysis> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
      Analyze the following community issue report and categorize it. Return a JSON response with this exact structure:
      
      {
        "category": "main_category_here",
        "subcategory": "subcategory_here",
        "summary": "brief_summary_here",
        "priority": "low/medium/high",
        "suggested_actions": ["action1", "action2", "action3"]
      }
      
      Available categories: 
      - Infrastructure (Roads, Bridges, Buildings)
      - Utilities (Water, Electricity, Internet)
      - Environment (Waste, Pollution, Green Spaces)
      - Public Safety (Crime, Emergency, Traffic)
      - Social Services (Healthcare, Education, Welfare)
      - Other
      
      User's description: "${userDescription}"
      
      Please analyze and respond with valid JSON only.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const rawAnalysis = JSON.parse(jsonMatch[0]);
      
      // Map to our proper types
      return {
        category: mapToIssueCategory(rawAnalysis.category),
        subcategory: rawAnalysis.subcategory || 'General',
        summary: rawAnalysis.summary || 'No summary provided',
        priority: mapToIssuePriority(rawAnalysis.priority),
        suggested_actions: rawAnalysis.suggested_actions || []
      };
    }
    
    throw new Error('Invalid response format from AI');
    
  } catch (error) {
    console.error('AI Analysis Error:', error);
    throw new Error('Failed to analyze issue with AI. Please try again.');
  }
};

// Helper function to map string to IssueCategory enum
const mapToIssueCategory = (category: string): IssueCategory => {
  const categoryMap: { [key: string]: IssueCategory } = {
    'infrastructure': IssueCategory.INFRASTRUCTURE,
    'utilities': IssueCategory.UTILITIES,
    'environment': IssueCategory.ENVIRONMENT,
    'public safety': IssueCategory.PUBLIC_SAFETY,
    'social services': IssueCategory.SOCIAL_SERVICES,
    'other': IssueCategory.OTHER
  };
  
  const normalizedCategory = category.toLowerCase();
  return categoryMap[normalizedCategory] || IssueCategory.OTHER;
};

// Helper function to map string to IssuePriority enum
const mapToIssuePriority = (priority: string): IssuePriority => {
  const priorityMap: { [key: string]: IssuePriority } = {
    'low': IssuePriority.LOW,
    'medium': IssuePriority.MEDIUM,
    'high': IssuePriority.HIGH
  };
  
  const normalizedPriority = priority.toLowerCase();
  return priorityMap[normalizedPriority] || IssuePriority.MEDIUM;
};