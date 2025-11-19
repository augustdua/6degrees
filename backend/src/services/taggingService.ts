import OpenAI from 'openai';
import { supabase } from '../config/supabase';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Cache for all available tags
let tagsCache: string[] | null = null;
let tagsCacheTimestamp: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Get all available tags from database
 */
export async function getAllTags(): Promise<string[]> {
  const now = Date.now();
  
  // Return cached tags if still valid
  if (tagsCache && (now - tagsCacheTimestamp) < CACHE_DURATION) {
    return tagsCache;
  }

  try {
    const { data, error } = await supabase
      .from('tags')
      .select('name')
      .order('name');

    if (error) throw error;

    tagsCache = data.map(tag => tag.name);
    tagsCacheTimestamp = now;

    return tagsCache;
  } catch (error) {
    console.error('Error fetching tags:', error);
    return [];
  }
}

/**
 * Get popular tags based on usage
 */
export async function getPopularTags(limit: number = 20): Promise<Array<{ name: string; count: number }>> {
  try {
    const { data, error } = await supabase
      .rpc('get_popular_tags', { limit_count: limit });

    if (error) throw error;

    return data.map((item: any) => ({
      name: item.tag_name,
      count: parseInt(item.usage_count)
    }));
  } catch (error) {
    console.error('Error fetching popular tags:', error);
    return [];
  }
}

/**
 * Auto-tag content using OpenAI
 * Analyzes title and description to suggest relevant tags
 */
export async function autoTagContent(title: string, description?: string): Promise<string[]> {
  try {
    // Get all available tags
    const availableTags = await getAllTags();
    
    if (availableTags.length === 0) {
      console.warn('No tags available in database');
      return [];
    }

    // Prepare content for analysis
    const content = description 
      ? `Title: ${title}\n\nDescription: ${description}`
      : `Title: ${title}`;

    // Create prompt for OpenAI
    const prompt = `You are a content categorization expert. Analyze the following content and select the most relevant tags from the provided list.

Content to analyze:
${content}

Available tags:
${availableTags.join(', ')}

Instructions:
- Select 3-7 tags that best describe this content
- Focus on the main topics, industries, roles, and technologies mentioned
- Return ONLY the tag names as a JSON array
- Tags must be exact matches from the available tags list
- If no tags match well, return an empty array

Response format: ["Tag1", "Tag2", "Tag3"]`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a precise content categorization assistant. You analyze text and select relevant tags from a predefined list. Always respond with valid JSON arrays containing only exact tag matches.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 200,
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0].message.content;
    
    if (!responseText) {
      console.warn('Empty response from OpenAI');
      return [];
    }

    // Parse the response
    let suggestedTags: string[];
    try {
      const parsed = JSON.parse(responseText);
      // Handle different response formats
      suggestedTags = Array.isArray(parsed) ? parsed : (parsed.tags || []);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('Response text:', responseText);
      return [];
    }

    // Validate that suggested tags exist in available tags
    const validTags = suggestedTags.filter(tag => 
      availableTags.some(availableTag => 
        availableTag.toLowerCase() === tag.toLowerCase()
      )
    );

    // Return exact matches from available tags (preserve correct casing)
    const finalTags = validTags.map(tag => {
      const match = availableTags.find(availableTag => 
        availableTag.toLowerCase() === tag.toLowerCase()
      );
      return match || tag;
    });

    console.log(`Auto-tagged content with ${finalTags.length} tags:`, finalTags);

    return finalTags.slice(0, 7); // Limit to 7 tags max

  } catch (error: any) {
    console.error('Error in autoTagContent:', error);
    
    // Fallback: return empty array instead of failing
    if (error?.code === 'insufficient_quota' || error?.status === 429) {
      console.warn('OpenAI quota exceeded, falling back to keyword matching');
      return keywordBasedTagging(title, description);
    }
    
    return [];
  }
}

/**
 * Fallback: Simple keyword-based tagging
 * Used when OpenAI API is unavailable
 */
function keywordBasedTagging(title: string, description?: string): string[] {
  const content = `${title} ${description || ''}`.toLowerCase();
  const tags: string[] = [];

  // Simple keyword matching
  const keywordMap: Record<string, string[]> = {
    'AI': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning'],
    'Crypto, NFTs, & Web3': ['crypto', 'cryptocurrency', 'nft', 'web3', 'blockchain', 'bitcoin', 'ethereum'],
    'Fundraising': ['fundraising', 'raise', 'funding', 'investment', 'capital'],
    'Startups': ['startup', 'early stage', 'pre-seed', 'seed'],
    'Marketing & Growth': ['marketing', 'growth', 'user acquisition', 'seo', 'sem'],
    'Product': ['product', 'product management', 'product manager', 'pm'],
    'SaaS': ['saas', 'software as a service', 'b2b software'],
    'E-Commerce': ['ecommerce', 'e-commerce', 'online store', 'shopify'],
    'Fashion': ['fashion', 'apparel', 'clothing', 'style'],
    'HealthTech': ['health', 'healthcare', 'medical', 'telemedicine'],
    'Venture Capital': ['vc', 'venture capital', 'investor'],
    'CEO': ['ceo', 'chief executive'],
    'CTO': ['cto', 'chief technology'],
    'CFO': ['cfo', 'chief financial'],
    'CMO': ['cmo', 'chief marketing']
  };

  for (const [tag, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(keyword => content.includes(keyword))) {
      tags.push(tag);
    }
  }

  return tags.slice(0, 5);
}

/**
 * Update tag usage count
 */
export async function updateTagUsage(tagNames: string[]): Promise<void> {
  try {
    // Use RPC function to increment usage count
    for (const tagName of tagNames) {
      await supabase.rpc('increment_tag_usage', { tag_name: tagName });
    }
  } catch (error) {
    console.error('Error updating tag usage:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Invalidate tags cache (call when tags are updated)
 */
export function invalidateTagsCache(): void {
  tagsCache = null;
  tagsCacheTimestamp = 0;
}

