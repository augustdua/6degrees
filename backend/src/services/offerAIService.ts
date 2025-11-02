import OpenAI from 'openai';

// OpenAI Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.warn('WARNING: OPENAI_API_KEY not set. Offer use case generation will not work.');
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

/**
 * Generate use cases/questions for an offer based on target profile
 * Returns 3 example questions that can be asked to the target person
 * This is a separate service from the app's AI assistant
 */
export async function generateOfferUseCases(targetProfile: {
  position?: string;
  organization?: string;
  description?: string;
  title?: string;
  relationshipDescription?: string;
}): Promise<string[]> {
  try {
    const prompt = `You are helping create professional networking opportunities. Based on this profile, generate exactly 3 specific, actionable questions that someone might ask this person during an intro call.

Target Profile:
- Position: ${targetProfile.position || 'Not specified'}
- Organization: ${targetProfile.organization || 'Not specified'}
- Description: ${targetProfile.description || targetProfile.title || 'No description'}
- Relationship Context: ${targetProfile.relationshipDescription || 'Professional connection'}

Requirements:
- Generate exactly 3 questions
- Questions should be specific to their role/industry/expertise
- Questions should be actionable and valuable
- Keep each question under 15 words
- Return as JSON: {"questions": ["question 1", "question 2", "question 3"]}

Example:
{"questions": ["How did you transition from data science to product management?", "What strategies have worked best for building ML teams?", "What are the biggest challenges in scaling data infrastructure?"]}

Return ONLY valid JSON, no other text.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a professional networking assistant. Generate specific, valuable questions for intro calls. Always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const parsed = JSON.parse(response);
    
    // Handle different response formats
    let questions: string[] = [];
    if (parsed.questions && Array.isArray(parsed.questions)) {
      questions = parsed.questions;
    } else if (parsed.use_cases && Array.isArray(parsed.use_cases)) {
      questions = parsed.use_cases;
    } else if (Array.isArray(parsed)) {
      questions = parsed;
    } else {
      // Try to find any array in the response
      const values = Object.values(parsed);
      const arrayValue = values.find(v => Array.isArray(v)) as string[] | undefined;
      if (arrayValue) {
        questions = arrayValue;
      }
    }

    // Ensure we have exactly 3 questions (trim or pad as needed)
    if (questions.length === 0) {
      // Fallback questions
      questions = [
        `What insights can you share about ${targetProfile.organization || 'your organization'}?`,
        `How can I best leverage your expertise in ${targetProfile.position || 'your field'}?`,
        `What advice would you give to someone in my position?`,
      ];
    } else if (questions.length < 3) {
      // Pad with generic questions if needed
      while (questions.length < 3) {
        questions.push(`What has been your biggest learning in ${targetProfile.organization || 'your career'}?`);
      }
    } else if (questions.length > 3) {
      // Trim to 3
      questions = questions.slice(0, 3);
    }

    return questions;
  } catch (error: any) {
    console.error('Error generating use cases:', error);
    // Return fallback questions on error
    return [
      `What insights can you share about ${targetProfile.organization || 'your organization'}?`,
      `How can I best leverage your expertise in ${targetProfile.position || 'your field'}?`,
      `What advice would you give to someone in my position?`,
    ];
  }
}

