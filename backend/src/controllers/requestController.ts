import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';
import { generateHeyGenVideo, checkHeyGenVideoStatus, getHeyGenAvatars, getHeyGenVoices } from '../services/heygenService';
import multer from 'multer';
import path from 'path';

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

// Generate AI video for request
export const generateVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { requestId } = req.params;
    const { avatarId, voiceId, script } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the request
    const { data: request, error: fetchError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('id', requestId)
      .eq('creator_id', userId)
      .single();

    if (fetchError || !request) {
      return res.status(404).json({ error: 'Request not found or unauthorized' });
    }

    // Use provided script or generate default
    const videoScript = script || (
      request.message
        ? `Hi! I'm looking to connect with ${request.target}. ${request.message}`
        : `Hi! I'm looking to connect with ${request.target}. Can you help me reach them?`
    );

    // Generate video
    const videoId = await generateHeyGenVideo({
      script: videoScript,
      avatarId,
      voiceId
    });

    // Update request with video info
    const { error: updateError } = await supabase
      .from('connection_requests')
      .update({
        heygen_video_id: videoId,
        heygen_avatar_id: avatarId,
        heygen_voice_id: voiceId,
        video_script: videoScript,
        video_type: 'ai_generated',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating request with video ID:', updateError);
      return res.status(500).json({ error: 'Failed to update request' });
    }

    return res.status(200).json({
      success: true,
      videoId,
      message: 'Video generation started. Check status using the video status endpoint.'
    });
  } catch (error: any) {
    console.error('Error in generateVideo:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// Check video generation status
export const getVideoStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { requestId } = req.params;

    // Get the request
    const { data: request, error: fetchError } = await supabase
      .from('connection_requests')
      .select('heygen_video_id, video_url')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (!request.heygen_video_id) {
      return res.status(400).json({ error: 'No video generation in progress' });
    }

    // If already completed, return cached URL
    if (request.video_url) {
      return res.status(200).json({
        status: 'completed',
        videoUrl: request.video_url
      });
    }

    // Check HeyGen status
    const status = await checkHeyGenVideoStatus(request.heygen_video_id);

    // If completed, save the URL
    if (status.status === 'completed' && status.videoUrl) {
      await supabase
        .from('connection_requests')
        .update({
          video_url: status.videoUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);
    }

    return res.status(200).json(status);
  } catch (error: any) {
    console.error('Error in getVideoStatus:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// Get available avatars
export const getAvatars = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const avatars = await getHeyGenAvatars();
    return res.status(200).json({ avatars });
  } catch (error: any) {
    console.error('Error in getAvatars:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// Get available voices
export const getVoices = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const voices = await getHeyGenVoices();
    return res.status(200).json({ voices });
  } catch (error: any) {
    console.error('Error in getVoices:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// Configure multer for video uploads (memory storage)
const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  }
});

export const videoUploadMiddleware = videoUpload.single('video');

// Upload video for request
export const uploadVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { requestId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    // Verify request exists and user is the creator
    const { data: request, error: fetchError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('id', requestId)
      .eq('creator_id', userId)
      .single();

    if (fetchError || !request) {
      return res.status(404).json({ error: 'Request not found or unauthorized' });
    }

    // Generate unique filename
    const fileExt = path.extname(req.file.originalname);
    const fileName = `${requestId}-${Date.now()}${fileExt}`;
    const filePath = `request-videos/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('6DegreeRequests')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading to Supabase storage:', uploadError);
      return res.status(500).json({ error: 'Failed to upload video' });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('6DegreeRequests')
      .getPublicUrl(filePath);

    const videoUrl = urlData.publicUrl;

    // Update request with video URL; handle possible CHECK constraint on video_type
    let { error: updateError } = await supabase
      .from('connection_requests')
      .update({
        video_url: videoUrl,
        video_type: 'user_uploaded',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    // If constraint violation, retry without changing video_type
    if (updateError && updateError.code === '23514') {
      const retry = await supabase
        .from('connection_requests')
        .update({
          video_url: videoUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);
      updateError = retry.error;
    }

    if (updateError) {
      console.error('Error updating request with video URL:', updateError);
      return res.status(500).json({ error: 'Failed to update request' });
    }

    return res.status(200).json({
      success: true,
      videoUrl,
      message: 'Video uploaded successfully'
    });
  } catch (error: any) {
    console.error('Error in uploadVideo:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};