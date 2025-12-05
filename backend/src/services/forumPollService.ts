import OpenAI from 'openai';

// OpenAI Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.warn('WARNING: OPENAI_API_KEY not set. Forum poll generation will not work.');
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export interface GeneratedPoll {
  question: string;
  options: string[];
}

/**
 * Generate a 4-option poll based on post content
 * Uses OpenAI to create an engaging, contextual poll for the networking community
 */
export async function generateForumPoll(postContent: string, communitySlug?: string): Promise<GeneratedPoll> {
  try {
    const communityContext = getCommunityContext(communitySlug);
    
    const prompt = `You are creating an engaging poll for a professional networking community forum. Based on the following post, generate a relevant poll question with exactly 4 options.

Post Content:
"${postContent}"

Community Context: ${communityContext}

Guidelines:
- The poll question should spark discussion and engagement
- Options should be distinct, balanced, and relevant to the post
- Keep the question under 100 characters
- Each option should be under 50 characters
- Options should cover different perspectives or choices
- Make it interesting and thought-provoking
- Avoid yes/no questions - make it more nuanced

Return ONLY valid JSON with this exact structure:
{"question": "Your poll question here?", "options": ["Option 1", "Option 2", "Option 3", "Option 4"]}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating engaging community polls. Generate polls that encourage participation and spark meaningful discussions. Always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(response);
    
    // Validate the response structure
    if (!parsed.question || !Array.isArray(parsed.options) || parsed.options.length !== 4) {
      throw new Error('Invalid poll structure from OpenAI');
    }

    return {
      question: parsed.question.slice(0, 200), // Trim if too long
      options: parsed.options.map((opt: string) => opt.slice(0, 100)), // Trim options
    };
  } catch (error: any) {
    console.error('Error generating poll:', error);
    // Return a fallback poll based on content type
    return generateFallbackPoll(postContent);
  }
}

/**
 * Get community-specific context for better poll generation
 */
function getCommunityContext(communitySlug?: string): string {
  switch (communitySlug) {
    case 'build-in-public':
      return 'Building in Public community - users share their startup/project journeys, daily progress, wins, and challenges';
    case 'network':
      return 'Networking community - users seeking connections, introductions, and professional opportunities';
    case 'wins':
      return 'Wins & Brags community - users celebrating achievements, milestones, and successes';
    case 'failures':
      return 'Failures & Lessons community - users sharing setbacks, learnings, and growth experiences';
    default:
      return 'Professional networking and building in public community';
  }
}

/**
 * Generate a fallback poll if OpenAI fails
 */
function generateFallbackPoll(postContent: string): GeneratedPoll {
  // Simple keyword-based fallback
  const content = postContent.toLowerCase();
  
  if (content.includes('startup') || content.includes('business') || content.includes('company')) {
    return {
      question: "What's most important for startup success?",
      options: ['Strong team', 'Great product', 'Market timing', 'Funding'],
    };
  }
  
  if (content.includes('learn') || content.includes('skill') || content.includes('course')) {
    return {
      question: "What's your preferred way to learn new skills?",
      options: ['Online courses', 'Building projects', 'Reading books', 'Mentorship'],
    };
  }
  
  if (content.includes('network') || content.includes('connect') || content.includes('intro')) {
    return {
      question: 'How do you prefer to make professional connections?',
      options: ['Events & meetups', 'LinkedIn/social', 'Warm intros', 'Cold outreach'],
    };
  }
  
  // Generic fallback
  return {
    question: "What resonates most with you about this post?",
    options: ['Totally agree', 'Partially agree', 'Different perspective', 'Want to learn more'],
  };
}

