// services/groqService.ts
import { AIAnalysis, IssueCategory, IssuePriority } from "../types/reporting";

const GROQ_API_KEY = "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";

export const analyzeIssueWithAI = async (userDescription: string): Promise<AIAnalysis> => {
  try {
    console.log('🚀 Analyzing with Groq AI...');
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `You are an AI assistant for AYOS, a citizen reporting app in the Philippines. 
            Analyze the user's description and return ONLY valid JSON with this exact structure:
            {
              "category": "infrastructure/utilities/environment/public safety/social services/other",
              "subcategory": "specific issue type",
              "summary": "brief summary",
              "priority": "low/medium/high",
              "suggested_actions": ["action1", "action2", "action3"],
              "keywords": ["keyword1", "keyword2", "keyword3"],
              "location": "extracted location or area",
              "urgency_assessment": "brief urgency description"
            }
            
            Return ONLY the JSON object, no other text.`
          },
          {
            role: "user",
            content: `Analyze this community issue report: "${userDescription}"`
          }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.1,
        max_tokens: 500,
        stream: false,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('📝 Raw AI response:', content);
    
    const parsedResponse = JSON.parse(content);
    
    const result: AIAnalysis = {
      category: mapToIssueCategory(parsedResponse.category),
      subcategory: parsedResponse.subcategory,
      summary: parsedResponse.summary,
      priority: mapToIssuePriority(parsedResponse.priority),
      suggested_actions: parsedResponse.suggested_actions,
      keywords: parsedResponse.keywords || [],
      location: parsedResponse.location || '',
      urgency_assessment: parsedResponse.urgency_assessment || ''
    };

    console.log('🎯 Final analysis result:', result);
    return result;
    
  } catch (error: any) {
    console.error('❌ Groq AI Error:', error.message);
    throw new Error(`AI analysis failed: ${error.message}`);
  }
};

const mapToIssueCategory = (category: string): IssueCategory => {
  const normalized = category.toLowerCase().trim();
  const map: { [key: string]: IssueCategory } = {
    infrastructure: IssueCategory.INFRASTRUCTURE,
    utilities: IssueCategory.UTILITIES,
    environment: IssueCategory.ENVIRONMENT,
    "public safety": IssueCategory.PUBLIC_SAFETY,
    "social_services": IssueCategory.SOCIAL_SERVICES,
    other: IssueCategory.OTHER,
  };
  return map[normalized] || IssueCategory.OTHER;
};

const mapToIssuePriority = (priority: string): IssuePriority => {
  const normalized = priority.toLowerCase().trim();
  const map: { [key: string]: IssuePriority } = {
    low: IssuePriority.LOW,
    medium: IssuePriority.MEDIUM, 
    high: IssuePriority.HIGH,
  };
  return map[normalized] || IssuePriority.MEDIUM;
};