import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticate } from '../middleware/auth';

const router = express.Router();

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
// First checks our database, then falls back to Clearbit API for real company data
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

    // Then, fetch from Clearbit Company Autocomplete API
    // This API is free and provides real company data
    let clearbitResults: any[] = [];
    try {
      const clearbitResponse = await fetch(
        `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(q)}`
      );

      if (clearbitResponse.ok) {
        const companies = (await clearbitResponse.json()) as any[];
        clearbitResults = companies.map((company: any) => ({
          id: null, // Not in our DB yet
          name: company.name,
          logo_url: company.logo,
          domain: company.domain,
          industry: null,
          description: null,
          website: `https://${company.domain}`,
          source: 'clearbit'
        }));
      }
    } catch (clearbitError) {
      console.warn('Clearbit API error:', clearbitError);
      // Continue without Clearbit results
    }

    // Merge results, prioritizing local DB results
    const localDomains = new Set((localResults || []).map((r: any) => r.domain));
    const mergedResults = [
      ...(localResults || []),
      ...clearbitResults.filter((r: any) => !localDomains.has(r.domain))
    ];

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
    const { organizationId, organizationData, position, startDate, endDate, isCurrent } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!position) {
      return res.status(400).json({ error: 'Position is required' });
    }

    let finalOrganizationId = organizationId;

    // If organizationId is null, it means this is a new org from Clearbit
    // Create it in our database first
    if (!organizationId && organizationData) {
      const { data: newOrg, error: createError } = await supabase
        .from('organizations')
        .insert({
          name: organizationData.name,
          logo_url: organizationData.logo_url,
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
        is_current: isCurrent !== undefined ? isCurrent : true
      })
      .select(`
        id,
        position,
        start_date,
        end_date,
        is_current,
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
