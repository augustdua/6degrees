import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// August Dua's user ID (app owner)
const AUGUST_USER_ID = 'dddffff1-bfed-40a6-a99c-28dccb4c5014';

interface GeneratedOffer {
  title: string;
  description: string;
  target_organization: string;
  target_position: string;
  asking_price_inr: number;
  tags: string[];
}

/**
 * Generate 3 personalized offers using Gemini based on user prompt
 */
export const generateOffers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { prompt } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
      res.status(400).json({ error: 'Please provide a detailed prompt (at least 10 characters)' });
      return;
    }

    console.log(`🤖 Generating AI offers for user ${userId} with prompt: "${prompt.substring(0, 50)}..."`);

    // Call Gemini API - using 'gemini-2.5-flash' as requested
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const geminiPrompt = `You are an AI assistant for a professional networking platform called 6Degrees. 
Users can create "offers" where they offer to introduce someone to their professional connections.

Based on this user request, generate exactly 3 compelling professional networking offers:

User's request: "${prompt}"

Requirements:
- Each offer should be unique and valuable
- Titles should be catchy and specific (max 60 characters)
- Descriptions should explain the value proposition (100-200 characters)
- Include realistic company/organization names
- Include realistic job titles/positions
- Price should be between 1000-8000 INR
- Include 2-3 relevant tags from this list: Startups, Fundraising, AI, Tech, Product, Marketing, Finance, Career, Consulting, Engineering, Design, Sales, Leadership, Mentorship, Networking

Return ONLY a valid JSON array with exactly 3 objects in this format:
[
  {
    "title": "Connect with Senior PM at Google",
    "description": "Get insider tips on breaking into product management at top tech companies. Learn about interview prep and day-to-day responsibilities.",
    "target_organization": "Google",
    "target_position": "Senior Product Manager",
    "asking_price_inr": 3000,
    "tags": ["Product", "Tech", "Career"]
  }
]

Return ONLY the JSON array, no other text.`;

    const result = await model.generateContent(geminiPrompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    let generatedOffers: GeneratedOffer[];
    try {
      // Clean up the response (remove markdown code blocks if present)
      let cleanedText = text.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.slice(7);
      }
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.slice(3);
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.slice(0, -3);
      }
      cleanedText = cleanedText.trim();

      generatedOffers = JSON.parse(cleanedText);

      if (!Array.isArray(generatedOffers) || generatedOffers.length !== 3) {
        throw new Error('Expected exactly 3 offers');
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text);
      res.status(500).json({ error: 'Failed to parse AI response' });
      return;
    }

    // 1. Create a new generation record
    const { data: generation, error: genError } = await supabase
      .from('ai_offer_generations')
      .insert({
        user_id: userId,
        prompt: prompt.trim()
      })
      .select()
      .single();

    if (genError || !generation) {
      console.error('Error creating generation record:', genError);
      // Fallback: If table doesn't exist yet (migration issue), proceed without history tracking
      // This ensures the core feature still works if SQL wasn't run yet
      if (genError?.code === '42P01') {
        console.warn('ai_offer_generations table missing, skipping history tracking');
      } else {
        res.status(500).json({ error: 'Failed to start generation' });
        return;
      }
    }

    // Save offers to database
    const offersToInsert = generatedOffers.map((offer, index) => ({
      offer_creator_id: AUGUST_USER_ID,
      connection_user_id: AUGUST_USER_ID, // Self-connection for demo
      title: offer.title.substring(0, 100),
      description: offer.description.substring(0, 500),
      target_organization: offer.target_organization,
      target_position: offer.target_position,
      target_logo_url: `https://logo.clearbit.com/${offer.target_organization.toLowerCase().replace(/\s+/g, '')}.com`,
      asking_price_inr: Math.min(Math.max(offer.asking_price_inr || 2000, 1000), 10000),
      currency: 'INR',
      status: 'active',
      is_demo: true,
      tags: [...offer.tags, `for_you_${userId}`],
      approved_by_target: true,
      target_approved_at: new Date().toISOString(),
      // Only add generation ID if it was created successfully
      ...(generation ? { ai_generation_id: generation.id } : {})
    }));

    const { data: insertedOffers, error: insertError } = await supabase
      .from('offers')
      .insert(offersToInsert)
      .select('*');

    if (insertError) {
      console.error('Error inserting offers:', insertError);
      res.status(500).json({ error: 'Failed to save generated offers' });
      return;
    }

    console.log(`✅ Generated ${insertedOffers?.length || 0} AI offers for user ${userId}`);

    res.json({
      success: true,
      offers: insertedOffers,
      prompt: prompt.substring(0, 100)
    });

  } catch (error: any) {
    console.error('Error generating AI offers:', error);
    res.status(500).json({ error: error.message || 'Failed to generate offers' });
  }
};

/**
 * Get personalized "For You" offers for the current user
 */
export const getForYouOffers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const generationId = req.query.generationId as string;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    console.log(`🔍 Fetching For You offers for user ${userId} ${generationId ? `(Gen: ${generationId})` : '(Latest)'}`);

    // Use a raw filter for JSONB array containment
    const userTag = `for_you_${userId}`;
    
    let query = supabase
      .from('offers')
      .select(`
        *,
        creator:users!offers_offer_creator_id_fkey(
          id, first_name, last_name, profile_picture_url, bio
        )
      `)
      .eq('is_demo', true)
      .eq('offer_creator_id', AUGUST_USER_ID);

    // Filter by generation ID if provided, otherwise filter by user tag and get recent ones
    if (generationId) {
      // When loading from history, only filter by generation ID (no need for userTag since generation is already user-specific)
      query = query.eq('ai_generation_id', generationId);
      console.log(`🔍 Filtering by generation ID: ${generationId}`);
    } else {
      // When loading latest, use the user tag filter
      query = query
        .filter('tags', 'cs', `["${userTag}"]`)
        .order('created_at', { ascending: false })
        .limit(10);
    }
    
    const { data: offers, error } = await query;
    
    console.log(`🔍 Query result: ${offers?.length || 0} offers`);
    console.log(`🔍 Query error: ${error ? JSON.stringify(error) : 'none'}`);
    console.log(`🔍 Raw offers data: ${JSON.stringify(offers?.slice(0, 2))}`);

    if (error) {
      console.error('Error fetching For You offers:', JSON.stringify(error));
      // Return empty array instead of error - no offers generated yet is fine
      res.json({
        offers: [],
        hasOffers: false,
        message: 'No personalized offers yet. Generate some!',
        debug: { error: error.message, code: error.code }
      });
      return;
    }

    console.log(`✅ Found ${offers?.length || 0} For You offers for user ${userId}`);

    res.json({
      offers: offers || [],
      hasOffers: (offers?.length || 0) > 0
    });

  } catch (error: any) {
    console.error('Error in getForYouOffers:', error);
    // Graceful degradation - return empty instead of 500
    res.json({
      offers: [],
      hasOffers: false,
      error: 'Could not load offers'
    });
  }
};

/**
 * Get generation history for the current user
 */
export const getGenerationHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { data: history, error } = await supabase
      .from('ai_offer_generations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      // If table doesn't exist yet, return empty history gracefully
      if (error.code === '42P01') {
        res.json({ history: [] });
        return;
      }
      console.error('Error fetching history:', error);
      res.status(500).json({ error: 'Failed to fetch history' });
      return;
    }

    res.json({ history: history || [] });
  } catch (error: any) {
    console.error('Error in getGenerationHistory:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};

