/**
 * Apollo.io API Service
 * 
 * Provides integration with Apollo's People Search and Enrichment APIs.
 * - Search API: FREE, returns obfuscated data for prospecting
 * - Enrichment API: PAID (credits), returns full contact details
 */

const APOLLO_API_BASE = 'https://api.apollo.io/api/v1';

interface ApolloSearchFilters {
  person_titles?: string[];
  person_seniorities?: string[];
  person_locations?: string[];
  organization_locations?: string[];
  q_keywords?: string;
  organization_num_employees_ranges?: string[];
  q_organization_domains_list?: string[];
  contact_email_status?: string[];
  include_similar_titles?: boolean;
  per_page?: number;
  page?: number;
}

interface ApolloOrganization {
  name: string;
  has_industry: boolean;
  has_phone: boolean;
  has_city: boolean;
  has_state: boolean;
  has_country: boolean;
  has_zip_code: boolean;
  has_revenue: boolean;
  has_employee_count: boolean;
}

interface ApolloPerson {
  id: string;
  first_name: string;
  last_name_obfuscated: string;
  title: string;
  last_refreshed_at: string;
  has_email: boolean;
  has_city: boolean;
  has_state: boolean;
  has_country: boolean;
  has_direct_phone: string;
  organization: ApolloOrganization;
}

interface ApolloSearchResponse {
  total_entries: number;
  people: ApolloPerson[];
}

interface ApolloEnrichedPerson {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  linkedin_url: string | null;
  title: string;
  email_status: string;
  photo_url: string | null;
  twitter_url: string | null;
  github_url: string | null;
  facebook_url: string | null;
  headline: string;
  email: string;
  organization_id: string;
  city: string;
  state: string;
  country: string;
  employment_history: Array<{
    organization_name: string;
    title: string;
    start_date: string;
    end_date: string | null;
    current: boolean;
  }>;
  organization: {
    id: string;
    name: string;
    website_url: string;
    linkedin_url: string;
    logo_url: string;
    primary_domain: string;
  };
}

interface ApolloEnrichResponse {
  person: ApolloEnrichedPerson;
}

/**
 * Get the Apollo API key from environment
 */
const getApiKey = (): string => {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    throw new Error('APOLLO_API_KEY environment variable is not set');
  }
  return apiKey;
};

/**
 * Search for people in Apollo's database
 * This endpoint is FREE and does not consume credits
 * Returns obfuscated last names and no contact details
 */
export const searchPeople = async (filters: ApolloSearchFilters): Promise<ApolloSearchResponse> => {
  const apiKey = getApiKey();
  
  // Set defaults
  const searchParams: ApolloSearchFilters = {
    per_page: filters.per_page || 10,
    page: filters.page || 1,
    include_similar_titles: filters.include_similar_titles ?? true,
    ...filters
  };

  console.log('🔍 Apollo Search - Filters:', JSON.stringify(searchParams, null, 2));

  try {
    const response = await fetch(`${APOLLO_API_BASE}/mixed_people/api_search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'accept': 'application/json'
      },
      body: JSON.stringify({
        api_key: apiKey,
        ...searchParams
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Apollo Search Error:', response.status, errorText);
      throw new Error(`Apollo API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as ApolloSearchResponse;
    console.log(`✅ Apollo Search - Found ${data.people?.length || 0} people (total: ${data.total_entries})`);
    
    return data;
  } catch (error: any) {
    console.error('Apollo Search Failed:', error.message);
    throw error;
  }
};

/**
 * Enrich a person's data using their Apollo ID
 * This endpoint COSTS CREDITS - only call when user requests intro
 */
export const enrichPerson = async (apolloId: string): Promise<ApolloEnrichedPerson | null> => {
  const apiKey = getApiKey();

  console.log(`🔍 Apollo Enrich - Person ID: ${apolloId}`);

  try {
    const response = await fetch(`${APOLLO_API_BASE}/people/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'accept': 'application/json'
      },
      body: JSON.stringify({
        api_key: apiKey,
        id: apolloId,
        reveal_personal_emails: false, // Set to true if needed (costs more)
        reveal_phone_number: false // Set to true if needed (requires webhook)
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Apollo Enrich Error:', response.status, errorText);
      throw new Error(`Apollo Enrich API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as ApolloEnrichResponse;
    console.log(`✅ Apollo Enrich - Got data for: ${data.person?.name || 'Unknown'}`);
    
    return data.person || null;
  } catch (error: any) {
    console.error('Apollo Enrich Failed:', error.message);
    throw error;
  }
};

/**
 * Transform Apollo search result to offer-compatible format
 */
export const transformApolloPersonToOffer = (person: ApolloPerson, generationId: string, userId: string) => {
  return {
    apollo_person_id: person.id,
    title: `Connect with ${person.first_name} ${person.last_name_obfuscated}`,
    description: `${person.title} at ${person.organization?.name || 'Unknown Company'}. ${person.has_email ? 'Email available.' : ''} ${person.has_direct_phone === 'Yes' ? 'Phone available.' : ''}`.trim(),
    target_organization: person.organization?.name || 'Unknown',
    target_position: person.title,
    target_logo_url: person.organization?.name 
      ? `https://img.logo.dev/${person.organization.name.toLowerCase().replace(/\s+/g, '')}.com?token=pk_dvr547hlTjGTLwg7G9xcbQ`
      : null,
    first_name: person.first_name,
    last_name_obfuscated: person.last_name_obfuscated,
    has_email: person.has_email,
    has_phone: person.has_direct_phone === 'Yes',
    has_city: person.has_city,
    has_state: person.has_state,
    has_country: person.has_country,
    last_refreshed_at: person.last_refreshed_at,
    ai_generation_id: generationId,
    is_apollo_sourced: true,
    apollo_enriched: false,
    tags: [`for_you_${userId}`]
  };
};

export type { ApolloSearchFilters, ApolloPerson, ApolloEnrichedPerson, ApolloSearchResponse };





