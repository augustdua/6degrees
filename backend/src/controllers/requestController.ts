import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

// Create request with credit deduction
export const createRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { target, message, credit_cost, target_cash_reward, target_organization_id } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate inputs
    if (!target || target.length < 10 || target.length > 200) {
      return res.status(400).json({ error: 'Target must be between 10 and 200 characters' });
    }

    if (message && message.length > 1000) {
      return res.status(400).json({ error: 'Message must be less than 1000 characters' });
    }

    if (!credit_cost || credit_cost < 10 || credit_cost > 1000) {
      return res.status(400).json({ error: 'Credit cost must be between 10 and 1000' });
    }

    if (target_cash_reward && (target_cash_reward < 10 || target_cash_reward > 10000)) {
      return res.status(400).json({ error: 'Target cash reward must be between 10 and 10000' });
    }

    // Generate shareable link
    const shareableLink = uuidv4();

    // Use database function to create request and deduct credits
    const { data, error } = await supabase.rpc('create_request_with_credits', {
      p_creator_id: userId,
      p_target: target,
      p_message: message || null,
      p_credit_cost: credit_cost,
      p_target_cash_reward: target_cash_reward || null,
      p_shareable_link: shareableLink,
      p_target_organization_id: target_organization_id || null
    });

    if (error) {
      console.error('Error creating request:', error);
      if (error.message?.includes('Insufficient credits')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to create request' });
    }

    // Get the created request
    const { data: request, error: fetchError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('id', data)
      .single();

    if (fetchError) {
      console.error('Error fetching created request:', fetchError);
      return res.status(500).json({ error: 'Request created but failed to fetch details' });
    }

    return res.status(201).json({ success: true, request });
  } catch (error) {
    console.error('Error in createRequest:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Update request (message, rewards, organizations)
export const updateRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { requestId } = req.params;
    const { message, target_cash_reward, target_organizations_data } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify request exists and user is the creator
    const { data: existingRequest, error: fetchError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('id', requestId)
      .eq('creator_id', userId)
      .single();

    if (fetchError || !existingRequest) {
      return res.status(404).json({ error: 'Request not found or unauthorized' });
    }

    // Only allow editing active requests
    if (existingRequest.status !== 'active') {
      return res.status(400).json({ error: 'Can only edit active requests' });
    }

    // Build update object with only provided fields
    const updateData: any = {};

    if (message !== undefined) {
      if (message && message.length > 1000) {
        return res.status(400).json({ error: 'Message must be less than 1000 characters' });
      }
      updateData.message = message;
    }

    if (target_cash_reward !== undefined) {
      if (target_cash_reward && (target_cash_reward < 10 || target_cash_reward > 10000)) {
        return res.status(400).json({ error: 'Target cash reward must be between 10 and 10000' });
      }
      updateData.target_cash_reward = target_cash_reward;
    }

    // Handle multiple organizations
    if (target_organizations_data !== undefined && Array.isArray(target_organizations_data)) {
      console.log('Processing organizations:', target_organizations_data.length, 'organizations');

      // Delete existing organization associations (ignore errors if none exist)
      const { error: deleteError } = await supabase
        .from('request_target_organizations')
        .delete()
        .eq('request_id', requestId);

      // Log but don't fail on delete errors (table might be empty)
      if (deleteError) {
        console.log('Note: Error deleting organization associations (might be empty):', deleteError.message);
      }

      // Process each organization and create if needed
      const finalOrgIds: string[] = [];

      for (const orgData of target_organizations_data) {
        let orgId = orgData.id;

        // If organizationId is null, create it in our database first
        if (!orgId) {
          console.log('Creating new organization:', orgData.name);

          const { data: newOrg, error: createError } = await supabase
            .from('organizations')
            .insert({
              name: orgData.name,
              logo_url: orgData.logo_url,
              domain: orgData.domain,
              website: orgData.website || (orgData.domain ? `https://${orgData.domain}` : null),
              industry: orgData.industry,
              description: orgData.description
            })
            .select('id')
            .single();

          if (createError) {
            console.error('Error creating organization:', createError);
            // Continue with other organizations instead of failing completely
            continue;
          }

          orgId = newOrg.id;
          console.log('Created organization with ID:', orgId);
        }

        finalOrgIds.push(orgId);
      }

      console.log('Final organization IDs to associate:', finalOrgIds);

      // Insert new associations
      if (finalOrgIds.length > 0) {
        const associations = finalOrgIds.map(orgId => ({
          request_id: requestId,
          organization_id: orgId
        }));

        console.log('Inserting associations:', associations);

        const { data: insertData, error: insertError } = await supabase
          .from('request_target_organizations')
          .insert(associations)
          .select();

        if (insertError) {
          console.error('Error inserting organization associations:', insertError);
          return res.status(500).json({
            error: 'Failed to update organizations',
            details: insertError.message
          });
        }

        console.log('Successfully inserted organizations:', insertData);

        // For backward compatibility, update the main organization_id with the first one
        updateData.target_organization_id = finalOrgIds[0];
      } else {
        // No organizations selected
        updateData.target_organization_id = null;
      }
    }

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    // Update the request
    const { data: updatedRequest, error: updateError } = await supabase
      .from('connection_requests')
      .update(updateData)
      .eq('id', requestId)
      .eq('creator_id', userId)
      .select(`
        *,
        target_organization:organizations!target_organization_id (
          id,
          name,
          logo_url,
          domain
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating request:', updateError);
      return res.status(500).json({ error: 'Failed to update request' });
    }

    console.log('Updated request with organization:', updatedRequest);

    return res.status(200).json({ success: true, request: updatedRequest });
  } catch (error) {
    console.error('Error in updateRequest:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyRequests = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({
    success: false,
    message: 'Request retrieval functionality not yet implemented'
  });
};

export const getRequestByLink = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({
    success: false,
    message: 'Request link functionality not yet implemented'
  });
};

export const joinChain = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({
    success: false,
    message: 'Chain joining functionality not yet implemented'
  });
};

export const completeChain = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { requestId } = req.params;
    const { chain_id } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!chain_id) {
      return res.status(400).json({ error: 'Chain ID is required' });
    }

    // Use the new credit distribution function
    const { data, error } = await supabase.rpc('complete_chain_and_distribute_credits', {
      chain_uuid: chain_id
    });

    if (error) {
      console.error('Error completing chain:', error);
      return res.status(500).json({ error: 'Failed to complete chain' });
    }

    return res.status(200).json({ success: true, message: 'Chain completed and credits distributed' });
  } catch (error) {
    console.error('Error in completeChain:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};