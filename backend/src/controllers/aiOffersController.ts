import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchPeople, ApolloSearchFilters, ApolloPerson } from '../services/apolloService';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// August Dua's user ID (app owner)
const AUGUST_USER_ID = 'dddffff1-bfed-40a6-a99c-28dccb4c5014';

interface ApolloFilters {
  person_titles?: string[];
  person_seniorities?: string[];
  person_locations?: string[];
  organization_locations?: string[];
  q_keywords?: string;
  organization_num_employees_ranges?: string[];
}

/**
 * Parse user prompt into Apollo search filters using Gemini
 */
const parsePromptToApolloFilters = async (prompt: string): Promise<ApolloFilters> => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const geminiPrompt = `You are a search query parser for Apollo.io People Search API.
Convert this natural language request into Apollo API filters.

User's request: "${prompt}"

Available filter fields:
- person_titles: Array of job titles (e.g., ["Partner", "VP", "Director"])
- person_seniorities: Array from: owner, founder, c_suite, partner, vp, head, director, manager, senior, entry, intern
- person_locations: Array of cities/countries where person lives (e.g., ["India", "Bangalore"])
- organization_locations: Array of company HQ locations (e.g., ["San Francisco", "USA"])
- q_keywords: Space-separated keywords for general search (e.g., "AI machine learning")
- organization_num_employees_ranges: Array of employee count ranges (e.g., ["50,500", "1000,5000"])

Return ONLY valid JSON with applicable fields. Only include fields that are relevant to the request.
Example output:
{
  "person_titles": ["Partner", "Principal"],
  "person_seniorities": ["partner", "vp", "director"],
  "person_locations": ["India"],
  "q_keywords": "venture capital AI"
}

Return ONLY the JSON object, no other text.`;

  const result = await model.generateContent(geminiPrompt);
  const response = await result.response;
  const text = response.text();

  // Clean and parse response
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

  return JSON.parse(cleanedText);
};

/**
 * Generate personalized offers using Apollo.io real people data
 * Pipeline: User Prompt → Gemini (parse) → Apollo Search (free) → Store in DB
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

    console.log(`🤖 Generating Apollo offers for user ${userId} with prompt: "${prompt.substring(0, 50)}..."`);

    // Step 1: Use Gemini to parse prompt into Apollo filters
    console.log('📝 Step 1: Parsing prompt with Gemini...');
    let apolloFilters: ApolloFilters;
    try {
      apolloFilters = await parsePromptToApolloFilters(prompt);
      console.log('✅ Parsed filters:', JSON.stringify(apolloFilters));
    } catch (parseError: any) {
      console.error('Failed to parse prompt:', parseError);
      res.status(500).json({ error: 'Failed to understand your request. Please try rephrasing.' });
      return;
    }

    // Step 2: Search Apollo for real people
    console.log('🔍 Step 2: Searching Apollo for real people...');
    let apolloPeople: ApolloPerson[];
    try {
      const searchFilters: ApolloSearchFilters = {
        ...apolloFilters,
        per_page: 10, // Get 10 results
        page: 1,
        contact_email_status: ['verified', 'likely to engage'] // Prefer people with valid emails
      };
      
      const searchResult = await searchPeople(searchFilters);
      apolloPeople = searchResult.people || [];
      
      if (apolloPeople.length === 0) {
        res.status(404).json({ 
          error: 'No matching professionals found. Try broadening your search criteria.',
          filters: apolloFilters 
        });
        return;
      }
      
      console.log(`✅ Found ${apolloPeople.length} people from Apollo`);
    } catch (apolloError: any) {
      console.error('Apollo search failed:', apolloError);
      res.status(500).json({ error: 'Failed to search for professionals. Please try again.' });
      return;
    }

    // Step 3: Create generation record
    console.log('💾 Step 3: Creating generation record...');
    const { data: generation, error: genError } = await supabase
      .from('ai_offer_generations')
      .insert({
        user_id: userId,
        prompt: prompt.trim()
      })
      .select()
      .single();

    if (genError && genError.code !== '42P01') {
      console.error('Error creating generation record:', genError);
      res.status(500).json({ error: 'Failed to start generation' });
      return;
    }

    // Step 4: Transform Apollo people to offers and save
    console.log('💾 Step 4: Saving offers to database...');
    const offersToInsert = apolloPeople.map((person) => ({
      offer_creator_id: AUGUST_USER_ID,
      connection_user_id: AUGUST_USER_ID,
      title: `Connect with ${person.first_name} ${person.last_name_obfuscated}`,
      description: `${person.title} at ${person.organization?.name || 'their company'}. ${person.has_email ? '✓ Email available.' : ''} ${person.has_direct_phone === 'Yes' ? '✓ Phone available.' : ''}`.trim(),
      target_organization: person.organization?.name || 'Unknown',
      target_position: person.title,
      target_logo_url: person.organization?.name 
        ? `https://img.logo.dev/${person.organization.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com?token=pk_X6aFkpBfREmT_FscNvvDKA`
        : null,
      asking_price_inr: 3000, // Fixed price for now
      currency: 'INR',
      status: 'active',
      is_demo: true,
      is_apollo_sourced: true,
      apollo_person_id: person.id,
      apollo_enriched: false,
      first_name: person.first_name,
      last_name_obfuscated: person.last_name_obfuscated,
      has_email: person.has_email,
      has_phone: person.has_direct_phone === 'Yes',
      tags: [`for_you_${userId}`],
      approved_by_target: true,
      target_approved_at: new Date().toISOString(),
      ...(generation ? { ai_generation_id: generation.id } : {})
    }));

    const { data: insertedOffers, error: insertError } = await supabase
      .from('offers')
      .insert(offersToInsert)
      .select('*');

    if (insertError) {
      console.error('Error inserting offers:', insertError);
      res.status(500).json({ error: 'Failed to save offers' });
      return;
    }

    console.log(`✅ Generated ${insertedOffers?.length || 0} Apollo-sourced offers for user ${userId}`);

    res.json({
      success: true,
      offers: insertedOffers,
      prompt: prompt.substring(0, 100),
      source: 'apollo',
      totalFound: apolloPeople.length
    });

  } catch (error: any) {
    console.error('Error generating Apollo offers:', error);
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
    
    // Simple query without relationship join - we'll add creator info manually
    let query = supabase
      .from('offers')
      .select('*')
      .eq('is_demo', true)
      .eq('offer_creator_id', AUGUST_USER_ID);

    // Always get ALL offers for this user (no limit), ordered by newest first
    // The frontend will handle scrolling to specific generations
    query = query
      .filter('tags', 'cs', `["${userTag}"]`)
      .order('created_at', { ascending: false });
    
    console.log(`🔍 Fetching all offers for user, generationId for scroll: ${generationId || 'none'}`);
    
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

    // Add creator info and format for frontend
    const offersWithCreator = (offers || []).map(offer => ({
      ...offer,
      // For Apollo-sourced offers, the "creator" is the platform owner
      creator: {
        id: AUGUST_USER_ID,
        first_name: 'August',
        last_name: 'Dua',
        profile_picture_url: 'https://tfbwfcnjdmbqmoyljeys.supabase.co/storage/v1/object/public/profile-pictures/dddffff1-bfed-40a6-a99c-28dccb4c5014/dddffff1-bfed-40a6-a99c-28dccb4c5014-1762273441317.jpg',
        bio: 'Hey! I am studying math at TUM, I have work experience in risk consulting and i-gaming.'
      },
      // Apollo-specific display fields
      display_name: offer.is_apollo_sourced 
        ? `${offer.first_name} ${offer.last_name_obfuscated}` 
        : null,
      is_real_person: offer.is_apollo_sourced || false
    }));

    res.json({
      offers: offersWithCreator,
      hasOffers: offersWithCreator.length > 0,
      scrollToGenerationId: generationId || null // Frontend uses this to scroll
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

