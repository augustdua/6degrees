import OpenAI from 'openai';
import { supabase } from '../config/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface ConnectionScore {
  organizationScore: number;
  roleScore: number;
  reasoning: string;
}

interface ScoreBreakdown {
  connectionId: string;
  organizationName: string;
  position: string;
  organizationScore: number;
  roleScore: number;
  totalScore: number;
  reasoning: string;
}

/**
 * Score a single professional connection using OpenAI
 */
export async function scoreConnection(
  organizationName: string,
  position: string,
  organizationDomain?: string
): Promise<ConnectionScore> {
  try {
    const prompt = `Analyze this professional connection and provide scores (0-50 each):

Organization: ${organizationName}${organizationDomain ? ` (${organizationDomain})` : ''}
Role/Position: ${position}

Score the organization prestige/impact (0-50):
- Consider: company size, market position, reputation, funding, public/private status
- Fortune 500, FAANG, unicorns, major tech companies = 45-50
- Well-known companies, funded startups, recognized brands = 35-44
- Mid-sized companies, growing startups = 25-34
- Small companies/early startups = 15-24
- Unknown/local businesses = 5-14

Score the role seniority (0-50):
- C-Level (CEO, CTO, CFO, Founder, President, etc.) = 45-50
- VP/SVP/EVP = 38-44
- Director/Head = 30-37
- Senior Manager/Lead/Principal = 22-29
- Manager/Specialist/Senior IC = 15-21
- Individual Contributor/Engineer/Designer = 8-14
- Entry level/Intern/Junior = 5-7

Return ONLY valid JSON in this exact format:
{"organizationScore": <number 0-50>, "roleScore": <number 0-50>, "reasoning": "<brief 1-2 sentence explanation>"}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at evaluating professional connections and company prestige. Always return valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    const parsed = JSON.parse(content);
    
    // Validate scores are in range
    const orgScore = Math.max(0, Math.min(50, parsed.organizationScore));
    const roleScore = Math.max(0, Math.min(50, parsed.roleScore));

    return {
      organizationScore: orgScore,
      roleScore: roleScore,
      reasoning: parsed.reasoning || 'No reasoning provided'
    };
  } catch (error) {
    console.error('Error scoring connection with OpenAI:', error);
    
    // Fallback to basic heuristic scoring if OpenAI fails
    return {
      organizationScore: 20, // Default mid-low score
      roleScore: 15,
      reasoning: 'Unable to calculate precise score. Using default values.'
    };
  }
}

/**
 * Score and cache a featured connection
 */
export async function scoreAndCacheFeaturedConnection(
  userId: string,
  featuredConnectionId: string,
  organizationName: string,
  position: string,
  organizationDomain?: string
): Promise<void> {
  // Check if score already exists and is recent (less than 30 days old)
  const { data: existingScore } = await supabase
    .from('featured_connection_scores')
    .select('*')
    .eq('user_id', userId)
    .eq('featured_connection_id', featuredConnectionId)
    .single();

  if (existingScore) {
    const ageInDays = (Date.now() - new Date(existingScore.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays < 30) {
      console.log(`Using cached score for connection ${featuredConnectionId}`);
      return;
    }
  }

  // Score the connection using OpenAI
  const score = await scoreConnection(organizationName, position, organizationDomain);

  // Upsert the score to cache
  const { error } = await supabase
    .from('featured_connection_scores')
    .upsert({
      user_id: userId,
      featured_connection_id: featuredConnectionId,
      organization_name: organizationName,
      position: position,
      organization_domain: organizationDomain,
      organization_score: score.organizationScore,
      role_score: score.roleScore,
      ai_reasoning: score.reasoning
    }, {
      onConflict: 'user_id,featured_connection_id'
    });

  if (error) {
    console.error('Error caching connection score:', error);
    throw error;
  }
}

/**
 * Calculate a user's total social capital score
 */
export async function calculateUserScore(userId: string): Promise<number> {
  // Get all featured connections with their organization data
  const { data: featuredConnections, error: fetchError } = await supabase
    .from('user_featured_connections')
    .select(`
      id,
      featured_user_id,
      users!user_featured_connections_featured_user_id_fkey(
        id,
        user_organizations(
          position,
          is_current,
          organizations(
            name,
            domain
          )
        )
      )
    `)
    .eq('user_id', userId)
    .not('featured_user_id', 'is', null);

  if (fetchError) {
    console.error('Error fetching featured connections:', fetchError);
    throw fetchError;
  }

  if (!featuredConnections || featuredConnections.length === 0) {
    // No featured connections, score is 0
    await supabase
      .from('users')
      .update({
        social_capital_score: 0,
        social_capital_score_updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    return 0;
  }

  // Score each connection
  for (const connection of featuredConnections) {
    const user = connection.users as any;
    if (!user || !user.user_organizations || user.user_organizations.length === 0) {
      continue;
    }

    // Get the most relevant organization (current or most recent)
    const currentOrg = user.user_organizations.find((uo: any) => uo.is_current);
    const orgData = currentOrg || user.user_organizations[0];

    if (orgData?.organizations) {
      await scoreAndCacheFeaturedConnection(
        userId,
        connection.id,
        orgData.organizations.name,
        orgData.position || 'Professional',
        orgData.organizations.domain
      );
    }
  }

  // Use the database RPC function to calculate total score
  const { data: result, error: calcError } = await supabase
    .rpc('calculate_social_capital_score', { p_user_id: userId });

  if (calcError) {
    console.error('Error calculating social capital score:', calcError);
    throw calcError;
  }

  return result?.score || 0;
}

/**
 * Recalculate a user's social capital score (triggered when featured connections change)
 */
export async function recalculateScore(userId: string): Promise<void> {
  try {
    await calculateUserScore(userId);
  } catch (error) {
    console.error('Error recalculating social capital score:', error);
    // Don't throw - allow the operation to continue even if scoring fails
  }
}

/**
 * Get detailed score breakdown for a user
 */
export async function getScoreBreakdown(userId: string): Promise<{
  score: number;
  breakdown: ScoreBreakdown[];
  updatedAt: string | null;
}> {
  // Get user's current score
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('social_capital_score, social_capital_score_updated_at')
    .eq('id', userId)
    .single();

  if (userError) {
    throw userError;
  }

  // Get breakdown from cache
  const { data: scores, error: scoresError } = await supabase
    .from('featured_connection_scores')
    .select('*')
    .eq('user_id', userId)
    .order('total_score', { ascending: false });

  if (scoresError) {
    throw scoresError;
  }

  const breakdown: ScoreBreakdown[] = (scores || []).map(s => ({
    connectionId: s.featured_connection_id,
    organizationName: s.organization_name,
    position: s.position,
    organizationScore: s.organization_score,
    roleScore: s.role_score,
    totalScore: s.organization_score + s.role_score,
    reasoning: s.ai_reasoning || ''
  }));

  return {
    score: user?.social_capital_score || 0,
    breakdown,
    updatedAt: user?.social_capital_score_updated_at || null
  };
}

