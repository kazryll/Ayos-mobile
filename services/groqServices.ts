// services/groqService.ts
import { ENV } from "../config/env";
import { AIAnalysis, IssueCategory, IssuePriority } from "../types/reporting";

const GROQ_API_KEY = "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";
const GEMINI_API_KEY = ENV.GEMINI_API_KEY;

const SYSTEM_PROMPT = `You are an AI assistant for AYOS, a citizen reporting app in the Philippines.
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

Return ONLY the JSON object, no other text.`;

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
            content: SYSTEM_PROMPT
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
    console.log('🔄 Falling back to Google Gemini AI...');

    // Fallback to Google Gemini
    try {
      return await analyzeWithGemini(userDescription);
    } catch (geminiError: any) {
      console.error('❌ Gemini AI Error:', geminiError.message);
      throw new Error(`Both AI services failed. Groq: ${error.message}, Gemini: ${geminiError.message}`);
    }
  }
};

const analyzeWithGemini = async (userDescription: string): Promise<AIAnalysis> => {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${SYSTEM_PROMPT}\n\nAnalyze this community issue report: "${userDescription}"\n\nIMPORTANT: Return ONLY the complete JSON object with all fields. Do not truncate.`
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 800,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Check if response was blocked or incomplete
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('Gemini API returned no candidates');
  }

  const candidate = data.candidates[0];

  // Check for finish reason issues
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    console.warn('⚠️ Gemini response incomplete:', candidate.finishReason);
  }

  const content = candidate.content.parts[0].text;
  console.log('📝 Raw Gemini response:', content);

  let parsedResponse;
  try {
    parsedResponse = JSON.parse(content);
  } catch (parseError) {
    console.error('❌ JSON parse error:', parseError);
    console.log('Attempting to fix incomplete JSON...');

    // Try to fix common JSON issues
    let fixedContent = content.trim();

    // If response is incomplete, try to close it
    if (!fixedContent.endsWith('}')) {
      // Count open and close braces
      const openBraces = (fixedContent.match(/{/g) || []).length;
      const closeBraces = (fixedContent.match(/}/g) || []).length;

      // Add missing closing braces
      for (let i = 0; i < openBraces - closeBraces; i++) {
        fixedContent += '}';
      }
    }

    // Try parsing again
    try {
      parsedResponse = JSON.parse(fixedContent);
      console.log('✅ Successfully fixed incomplete JSON');
    } catch (retryError) {
      throw new Error(`Failed to parse Gemini JSON response: ${parseError}`);
    }
  }

  const result: AIAnalysis = {
    category: mapToIssueCategory(parsedResponse.category || 'other'),
    subcategory: parsedResponse.subcategory || 'General issue',
    summary: parsedResponse.summary || userDescription.substring(0, 100),
    priority: mapToIssuePriority(parsedResponse.priority || 'medium'),
    suggested_actions: parsedResponse.suggested_actions || ['Review the issue', 'Contact relevant department'],
    keywords: parsedResponse.keywords || [],
    location: parsedResponse.location || '',
    urgency_assessment: parsedResponse.urgency_assessment || 'Needs assessment'
  };

  console.log('🎯 Final Gemini analysis result:', result);
  return result;
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

export const generateReportTitle = async (summary: string): Promise<string> => {
  try {
    console.log('📝 Generating title from summary:', summary);

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
            content: "Generate a short and descriptive title (max 6–10 words) that summarizes the main issue in the user's report. Focus on the specific problem, location (if mentioned), and urgency, and avoid overly long phrases or unnecessary details. The title should be clear, professional, and easily readable for LGU table view. Return ONLY the title text, no quotes, no extra text."
          },
          {
            role: "user",
            content: `Create a title based on this summary: "${summary}"`
          }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.2,
        max_tokens: 50,
        stream: false,
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const title = data.choices[0].message.content.trim().replace(/^["']|["']$/g, '');

    console.log('✅ Generated title:', title);
    return title;

  } catch (error: any) {
    console.error('❌ Title generation failed with Groq, trying Gemini:', error.message);

    // Fallback to Gemini
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate a short and descriptive title (max 4–8 words) that summarizes the main issue. Focus on the specific problem, location (if mentioned), and urgency. The title should be clear, professional, and easily readable for LGU table view. Return ONLY the title text, no quotes.\n\nSummary: "${summary}"`
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 100,
            thinkingConfig: {
              thinkingBudget: 30
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 Gemini title response:', JSON.stringify(data, null, 2));

      // Check if response was blocked or incomplete
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('Gemini API returned no candidates');
      }

      const candidate = data.candidates[0];

      // Check for finish reason issues
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        console.warn('⚠️ Gemini title response incomplete:', candidate.finishReason);
      }

      // Check if content.parts exists
      if (!candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error('Gemini response has no content parts');
      }

      const title = candidate.content.parts[0].text.trim().replace(/^["']|["']$/g, '');

      console.log('✅ Generated title with Gemini:', title);
      return title;

    } catch (geminiError: any) {
      console.error('❌ Both AI services failed for title generation. Gemini error:', geminiError.message);
      // Return a fallback title based on the summary
      return summary.substring(0, 60) + (summary.length > 60 ? '...' : '');
    }
  }
};