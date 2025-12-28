import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Logo.dev API token for fetching organization logos
const LOGO_DEV_TOKEN = process.env.LOGO_DEV_TOKEN || 'pk_dvr547hlTjGTLwg7G9xcbQ';

// Extend Request type to include user
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Search organizations (public endpoint)
// First checks our database, then enriches with other public sources.
router.get('/search', async (req: Request, res: Response): Promise<any> => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // First, search our local database
    const { data: localResults, error: localError } = await supabase.rpc('search_organizations', {
      search_query: q
    });

    if (localError) {
      console.error('Error searching local organizations:', localError);
    }

    // Fill in missing logo_urls for local results using logo.dev
    // If logo_url is null but domain exists, generate logo.dev URL
    const localResultsWithLogos = (localResults || []).map((org: any) => ({
      ...org,
      logo_url: org.logo_url || (org.domain ? `https://img.logo.dev/${org.domain}?token=${LOGO_DEV_TOKEN}` : null)
    }));

    // Also fetch universities
    let universityResults: any[] = [];
    try {
      const uniResponse = await fetch(
        `https://universities.hipolabs.com/search?name=${encodeURIComponent(q)}`
      );
      if (uniResponse.ok) {
        const universities = (await uniResponse.json()) as any[];
        universityResults = universities.map((u: any) => {
          const domain = Array.isArray(u.domains) && u.domains.length > 0 ? u.domains[0] : null;
          const website = Array.isArray(u.web_pages) && u.web_pages.length > 0 ? u.web_pages[0] : (domain ? `https://${domain}` : '');

          // Use logo.dev for better logo coverage
          const logo_url = domain ? `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}` : null;

          return {
            id: null,
            name: u.name,
            logo_url: logo_url,
            domain: domain,
            industry: 'Education',
            description: null,
            website,
            source: 'universities'
          };
        });
      }
    } catch (uniError) {
      console.warn('Universities API error:', uniError);
    }

    // Merge results, prioritizing local DB results
    const localDomains = new Set((localResults || []).map((r: any) => r.domain));
    // Merge results, removing duplicates by domain or name (case-insensitive)
    const merged: any[] = [];
    const seen = new Set<string>();
    const addUnique = (arr: any[]) => {
      for (const r of arr) {
        const key = (r.domain || r.name || '').toLowerCase();
        if (!key) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(r);
      }
    };

    addUnique(localResultsWithLogos);
    addUnique(universityResults);

    const mergedResults = merged.slice(0, 20);

    res.json({ organizations: mergedResults.slice(0, 20) });
  } catch (error) {
    console.error('Error in organization search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's organizations
router.get('/user/:userId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('user_organizations')
      .select(`
        id,
        position,
        start_date,
        end_date,
        is_current,
        organization_type,
        created_at,
        organization:organizations (
          id,
          name,
          logo_url,
          domain,
          industry,
          description,
          website
        )
      `)
      .eq('user_id', userId)
      .order('is_current', { ascending: false })
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching user organizations:', error);
      return res.status(500).json({ error: 'Failed to fetch user organizations' });
    }

    res.json({ organizations: data || [] });
  } catch (error) {
    console.error('Error in get user organizations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add organization to user profile (authenticated)
router.post('/user/add', authenticate, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    const { organizationId, organizationData, position, startDate, endDate, isCurrent, organizationType } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!position) {
      return res.status(400).json({ error: 'Position is required' });
    }

    let finalOrganizationId = organizationId;

    // If organizationId is null, it means this is a new org from external search results
    // Create it in our database first
    if (!organizationId && organizationData) {
      // Generate logo_url from domain if missing
      const logoUrl = organizationData.logo_url || 
        (organizationData.domain ? `https://img.logo.dev/${organizationData.domain}?token=${LOGO_DEV_TOKEN}` : null);
      
      const { data: newOrg, error: createError } = await supabase
        .from('organizations')
        .insert({
          name: organizationData.name,
          logo_url: logoUrl,
          domain: organizationData.domain,
          website: organizationData.website,
          industry: organizationData.industry,
          description: organizationData.description
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating organization:', createError);
        return res.status(500).json({ error: 'Failed to create organization' });
      }

      finalOrganizationId = newOrg.id;
    }

    if (!finalOrganizationId) {
      return res.status(400).json({ error: 'Organization ID or data is required' });
    }

    // Insert user organization
    const { data, error } = await supabase
      .from('user_organizations')
      .insert({
        user_id: userId,
        organization_id: finalOrganizationId,
        position,
        start_date: startDate || null,
        end_date: endDate || null,
        is_current: isCurrent !== undefined ? isCurrent : true,
        organization_type: organizationType || 'work'
      })
      .select(`
        id,
        position,
        start_date,
        end_date,
        is_current,
        organization_type,
        organization:organizations (
          id,
          name,
          logo_url,
          domain,
          industry
        )
      `)
      .single();

    if (error) {
      console.error('Error adding user organization:', error);
      return res.status(500).json({ error: 'Failed to add organization' });
    }

    res.json({ organization: data });
  } catch (error) {
    console.error('Error in add user organization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user organization (authenticated)
router.put('/user/:userOrgId', authenticate, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    const { userOrgId } = req.params;
    const { position, startDate, endDate, isCurrent } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Update user organization
    const { data, error } = await supabase
      .from('user_organizations')
      .update({
        position,
        start_date: startDate || null,
        end_date: endDate || null,
        is_current: isCurrent !== undefined ? isCurrent : true
      })
      .eq('id', userOrgId)
      .eq('user_id', userId) // Ensure user owns this record
      .select(`
        id,
        position,
        start_date,
        end_date,
        is_current,
        organization_type,
        organization:organizations (
          id,
          name,
          logo_url,
          domain,
          industry
        )
      `)
      .single();

    if (error) {
      console.error('Error updating user organization:', error);
      return res.status(500).json({ error: 'Failed to update organization' });
    }

    res.json({ organization: data });
  } catch (error) {
    console.error('Error in update user organization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user organization (authenticated)
router.delete('/user/:userOrgId', authenticate, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    const { userOrgId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('user_organizations')
      .delete()
      .eq('id', userOrgId)
      .eq('user_id', userId); // Ensure user owns this record

    if (error) {
      console.error('Error deleting user organization:', error);
      return res.status(500).json({ error: 'Failed to delete organization' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in delete user organization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
