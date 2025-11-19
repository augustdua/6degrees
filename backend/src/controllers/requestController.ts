import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';
import { generateHeyGenVideo, checkHeyGenVideoStatus, getHeyGenVoices } from '../services/heygenService';
import { createTalkingPhotoVideo } from '../services/heygenPhotoAvatarService';
import multer from 'multer';
import path from 'path';

// Get request by ID (minimal fields for sharing/video)
export const getRequestById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { requestId } = req.params as { requestId: string };
    if (!requestId) {
      return res.status(400).json({ success: false, message: 'requestId is required' });
    }

    const { data, error } = await supabase
      .from('connection_requests')
      .select('id, target, message, video_url, video_thumbnail_url, shareable_link')
      .eq('id', requestId)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    return res.status(200).json({ success: true, request: data });
  } catch (e: any) {
    console.error('getRequestById error:', e);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

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

    // Auto-tag the request using AI
    let tags: string[] = [];
    try {
      const { autoTagContent } = await import('../services/taggingService');
      tags = await autoTagContent(target, message || undefined);
      console.log(`Auto-tagged request with ${tags.length} tags:`, tags);
    } catch (error) {
      console.error('Error auto-tagging request (continuing without tags):', error);
      // Continue without tags if auto-tagging fails
    }

    // Create request with credit deduction using RPC function
    const { data: requestId, error } = await supabase.rpc('create_request_with_credits', {
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
      // Check if it's insufficient credits error
      if (error.message && error.message.includes('Insufficient credits')) {
        return res.status(400).json({ error: 'Insufficient credits' });
      }
      return res.status(500).json({ error: 'Failed to create request' });
    }

    // Fetch the created request
    const { data: request, error: fetchError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      console.error('Error fetching created request:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch created request' });
    }

    // Update request with tags if we have any
    if (tags.length > 0) {
      const { error: updateError } = await supabase
        .from('connection_requests')
        .update({ tags: JSON.stringify(tags) })
        .eq('id', requestId);
      
      if (updateError) {
        console.error('Error updating request tags:', updateError);
        // Don't fail the request creation if tagging fails
      } else {
        // Add tags to the response object
        request.tags = tags;
      }
    }

    return res.status(201).json({ request });
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
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: requests, error } = await supabase
      .from('connection_requests')
      .select(`
        *,
        target_organization:organizations!target_organization_id (
          id,
          name,
          logo_url,
          domain
        )
      `)
      .eq('creator_id', userId)
      .neq('status', 'deleted')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user requests:', error);
      return res.status(500).json({ error: 'Failed to fetch requests' });
    }

    return res.status(200).json({ requests: requests || [] });
  } catch (error) {
    console.error('Error in getMyRequests:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRequestByLink = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { linkId } = req.params as { linkId: string };

    if (!linkId) {
      return res.status(400).json({ success: false, message: 'linkId is required' });
    }

    // 1) Try direct match on connection_requests.link_id (canonical)
    let { data: request, error } = await supabase
      .from('connection_requests')
      .select('id, target, message, video_url, video_thumbnail_url, shareable_link')
      .eq('link_id', linkId)
      .single();

    // 2) If not found, try suffix match on shareable_link to be domain-agnostic
    if ((!request || error) && !request) {
      const { data: bySuffix, error: suffixErr } = await supabase
        .from('connection_requests')
        .select('id, target, message, video_url, video_thumbnail_url, shareable_link')
        .like('shareable_link', `%/r/${linkId}`)
        .maybeSingle();

      if (!suffixErr && bySuffix) {
        request = bySuffix as any;
        error = null as any;
      }
    }

    // 3) If still not found, search chains.participants[].shareableLink that includes /r/:linkId
    if ((!request || error) && !request) {
      const { data: chains, error: chainErr } = await supabase
        .from('chains')
        .select('id, request_id, participants')
        .not('participants', 'is', null);

      if (!chainErr && Array.isArray(chains)) {
        const found = chains.find((c: any) => {
          const participants = Array.isArray(c.participants) ? c.participants : [];
          return participants.some((p: any) => String(p?.shareableLink || '').includes(`/r/${linkId}`));
        });

        if (found) {
          const { data: reqData } = await supabase
            .from('connection_requests')
            .select('id, target, message, video_url, video_thumbnail_url, shareable_link')
            .eq('id', found.request_id)
            .single();
          if (reqData) {
            request = reqData as any;
          }
        }
      }
    }

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found for provided link' });
    }

    return res.status(200).json({ success: true, request });
  } catch (e: any) {
    console.error('getRequestByLink error:', e);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
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

// Generate AI video for request using user's personal talking photo avatar
export const generateVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('');
    console.log('🎬🎬🎬🎬🎬🎬🎬🎬🎬🎬🎬🎬🎬🎬🎬🎬🎬🎬🎬🎬');
    console.log('🎬 VIDEO GENERATION REQUEST RECEIVED');
    console.log('🎬🎬🎬🎬🎬🎬🎬🎬🎬🎬🎬🎬🎬🎬🎬🎬🎬🎬🎬🎬');
    
    const userId = req.user?.id;
    const { requestId } = req.params;
    const { talkingPhotoId, avatarId, voiceId, script } = req.body;

    console.log('🎤 REQUEST BODY:', JSON.stringify(req.body, null, 2));
    console.log('🎤 VOICE ID FROM FRONTEND:', voiceId);
    console.log('🎤 AVATAR/PHOTO ID:', talkingPhotoId || avatarId);

    if (!userId) {
      console.log('❌ Unauthorized - no user ID');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('👤 User ID:', userId);
    console.log('📝 Request ID:', requestId);

    // Get the request
    const { data: request, error: fetchError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('id', requestId)
      .eq('creator_id', userId)
      .single();

    if (fetchError || !request) {
      console.log('❌ Request not found or unauthorized');
      return res.status(404).json({ error: 'Request not found or unauthorized' });
    }

    // Use provided script or generate default
    const videoScript = script || (
      request.message
        ? `Hi! I'm looking to connect with ${request.target}. ${request.message}`
        : `Hi! I'm looking to connect with ${request.target}. Can you help me reach them?`
    );

    console.log('📄 Script length:', videoScript.length, 'characters');

    let videoId: string;

    // If talkingPhotoId is provided, use the new talking photo video API
    if (talkingPhotoId) {
      console.log('');
      console.log('🎭 USING TALKING PHOTO VIDEO API');
      console.log('🎭 Photo ID:', talkingPhotoId);
      console.log('🎤 Voice ID TO BE USED:', voiceId);
      console.log('🎤 Voice ID is undefined?', voiceId === undefined);
      console.log('🎤 Voice ID is null?', voiceId === null);
      console.log('🎤 Voice ID value:', JSON.stringify(voiceId));

      videoId = await createTalkingPhotoVideo({
        talkingPhotoId,
        inputText: videoScript,
        voiceId
      });

      // Update request with video info
      const { error: updateError } = await supabase
        .from('connection_requests')
        .update({
          heygen_video_id: videoId,
          heygen_avatar_id: talkingPhotoId,
          heygen_voice_id: voiceId || null,
          video_script: videoScript,
          video_type: 'ai_generated',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error updating request with video ID:', updateError);
        return res.status(500).json({ error: 'Failed to update request' });
      }
    } else {
      // Fallback to old avatar-based generation for backward compatibility
      console.log(`Using legacy avatar generation for user ${userId}`);

      videoId = await generateHeyGenVideo({
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
    const { requestId, videoId } = req.params;

    console.log(`📹 Checking video status for request ${requestId}, videoId: ${videoId || 'from DB'}`);

    // Get the request
    const { data: request, error: fetchError } = await supabase
      .from('connection_requests')
      .select('heygen_video_id, video_url')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      console.error(`❌ Request not found: ${requestId}`, fetchError);
      return res.status(404).json({ error: 'Request not found' });
    }

    // Use videoId from params if provided, otherwise use from database
    const heygenVideoId = videoId || request.heygen_video_id;

    if (!heygenVideoId) {
      return res.status(400).json({ error: 'No video generation in progress' });
    }

    // If already completed, return cached URL
    if (request.video_url && !videoId) {
      console.log(`✅ Returning cached video URL:`, request.video_url);
      return res.status(200).json({
        status: 'completed',
        videoUrl: request.video_url
      });
    }

    // Check HeyGen status
    console.log(`🔍 Checking HeyGen status for video ID: ${heygenVideoId}`);
    const status = await checkHeyGenVideoStatus(heygenVideoId);
    console.log(`📊 HeyGen status:`, status);

    // If completed, save the URL and thumbnail
    if (status.status === 'completed' && status.videoUrl) {
      let finalVideoUrl = status.videoUrl;
      
      // If it's a HeyGen temporary URL, download and upload to Supabase for permanent storage
      if (finalVideoUrl.includes('heygen.ai') || finalVideoUrl.includes('resource.heygen')) {
        console.log('🔄 Downloading HeyGen video and uploading to Supabase for permanent storage...');
        
        try {
          const axios = require('axios');
          const videoResponse = await axios.get(finalVideoUrl, { responseType: 'arraybuffer' });
          const videoBuffer = Buffer.from(videoResponse.data);
          
          console.log(`📦 Downloaded video: ${videoBuffer.length} bytes`);
          
          // Get the request to find creator_id
          const { data: requestData } = await supabase
            .from('connection_requests')
            .select('creator_id')
            .eq('id', requestId)
            .single();
          
          if (requestData) {
            const bucketName = process.env.SUPABASE_VIDEO_BUCKET || '6DegreeRequests';
            const fileName = `ai-videos/${requestData.creator_id}/${requestId}-${Date.now()}.mp4`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from(bucketName)
              .upload(fileName, videoBuffer, {
                contentType: 'video/mp4',
                upsert: true
              });
            
            if (uploadError) {
              console.error('❌ Supabase upload error:', uploadError);
            } else {
              const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(fileName);
              
              console.log(`✅ Video uploaded to Supabase: ${publicUrl}`);
              finalVideoUrl = publicUrl;
            }
          }
        } catch (uploadErr: any) {
          console.error('❌ Error uploading to Supabase:', uploadErr);
          console.log('⚠️ Continuing with HeyGen URL (temporary)');
        }
      }
      
      console.log(`💾 Saving video URL to database:`, finalVideoUrl);
      console.log(`🖼️  Saving thumbnail URL:`, status.thumbnailUrl || 'none provided');
      
      const { error: updateError } = await supabase
        .from('connection_requests')
        .update({
          video_url: finalVideoUrl,
          video_thumbnail_url: status.thumbnailUrl || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);
      
      if (updateError) {
        console.error('❌ Failed to update video URL in database:', updateError);
      }
    }

    return res.status(200).json(status);
  } catch (error: any) {
    console.error('❌ Error in getVideoStatus:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// Get available avatars
export const getAvatars = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's avatar group ID from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('heygen_avatar_group_id, heygen_avatar_photo_id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    // If user doesn't have an avatar group, return empty array
    if (!userData.heygen_avatar_group_id) {
      console.log(`User ${userId} has no avatar group yet`);
      return res.status(200).json({ avatars: [] });
    }

    // Fetch only avatars from THIS USER's group
    console.log(`Fetching avatars for user ${userId} from group ${userData.heygen_avatar_group_id}`);
    const { getGroupAvatars } = require('../services/heygenPhotoAvatarService');
    const groupAvatars = await getGroupAvatars(userData.heygen_avatar_group_id);

    // Normalize the avatar data to match the expected format
    const avatars = groupAvatars.map((avatar: any) => ({
      avatar_id: avatar.id,
      avatar_name: avatar.name || 'My Avatar',
      gender: avatar.gender || null,
      preview_image_url: avatar.image_url || avatar.motion_preview_url,
      preview_video_url: avatar.motion_preview_url,
      premium: false,
      is_public: false,
      is_user_avatar: true, // Flag to identify this is the user's own avatar
      tags: Array.isArray(avatar.tags) ? avatar.tags : [],
      style: avatar.is_motion ? 'Animated' : 'Photo Avatar'
    }));

    console.log(`Returning ${avatars.length} avatars for user ${userId}`);
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

const thumbnailUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for images
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files are allowed.'));
    }
  }
});

export const videoUploadMiddleware = videoUpload.single('video');
export const thumbnailUploadMiddleware = thumbnailUpload.single('video');

// Handle direct upload (video + thumbnail already uploaded to Supabase from frontend)
export const handleDirectUpload = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { requestId } = req.params;
    // Accept both videoUrl and video_url from frontend
    const { videoUrl, video_url, thumbnailUrl, thumbnail_url } = req.body;
    let finalVideoUrl = videoUrl || video_url;
    const finalThumbnailUrl = thumbnailUrl || thumbnail_url;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!finalVideoUrl) {
      return res.status(400).json({ error: 'Video URL required' });
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

    // If the video URL is from HeyGen (temporary), download and upload to Supabase
    if (finalVideoUrl.includes('heygen.ai') || finalVideoUrl.includes('resource.heygen')) {
      console.log('🔄 Downloading HeyGen video and uploading to Supabase for permanent storage...');

      try {
        // Download video from HeyGen
        const axios = require('axios');
        const videoResponse = await axios.get(finalVideoUrl, { responseType: 'arraybuffer' });
        const videoBuffer = Buffer.from(videoResponse.data);

        console.log(`📦 Downloaded video: ${videoBuffer.length} bytes`);

        // Upload to Supabase Storage
        const bucketName = process.env.SUPABASE_VIDEO_BUCKET || '6DegreeRequests';
        const fileName = `ai-videos/${userId}/${requestId}-${Date.now()}.mp4`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(fileName, videoBuffer, {
            contentType: 'video/mp4',
            upsert: true
          });

        if (uploadError) {
          console.error('❌ Supabase upload error:', uploadError);
          throw new Error(`Failed to upload to Supabase: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(fileName);

        console.log(`✅ Video uploaded to Supabase: ${publicUrl}`);
        finalVideoUrl = publicUrl;
      } catch (uploadErr: any) {
        console.error('❌ Error uploading to Supabase:', uploadErr);
        // Continue with HeyGen URL if upload fails
        console.log('⚠️ Continuing with HeyGen URL (temporary)');
      }
    }

    // Update request with video and thumbnail URLs
    // Only set thumbnail if we have a real image URL (not the video URL)
    let { error: updateError } = await supabase
      .from('connection_requests')
      .update({
        video_url: finalVideoUrl,
        video_thumbnail_url: finalThumbnailUrl || null,
        video_type: 'ai_generated',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    // If constraint violation, retry without changing video_type
    if (updateError && updateError.code === '23514') {
      const retry = await supabase
        .from('connection_requests')
        .update({
          video_url: finalVideoUrl,
          video_thumbnail_url: finalThumbnailUrl || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);
      updateError = retry.error;
    }

    if (updateError) {
      console.error('Error updating request:', updateError);
      return res.status(500).json({ error: 'Failed to update request' });
    }

    return res.status(200).json({
      success: true,
      message: 'Video saved successfully',
      videoUrl: finalVideoUrl
    });
  } catch (error: any) {
    console.error('Error in handleDirectUpload:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

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

    // Generate unique filename with user-specific folder
    const fileExt = path.extname(req.file.originalname);
    const fileName = `${requestId}-${Date.now()}${fileExt}`;
    const filePath = `request-videos/${userId}/${fileName}`;

    // Upload to Supabase Storage
    const bucketName = process.env.SUPABASE_VIDEO_BUCKET || '6DegreeRequests';
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading to Supabase storage:', uploadError);
      console.error('Bucket name:', bucketName);
      console.error('Upload error details:', JSON.stringify(uploadError, null, 2));
      return res.status(500).json({
        error: 'Failed to upload video',
        details: uploadError.message,
        bucket: bucketName
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    const videoUrl = urlData.publicUrl;

    // Set thumbnail to null - frontend will auto-generate it from the video
    const videoThumbnailUrl = null;

    // Update request with video URL and thumbnail; handle possible CHECK constraint on video_type
    let { error: updateError } = await supabase
      .from('connection_requests')
      .update({
        video_url: videoUrl,
        video_thumbnail_url: videoThumbnailUrl,
        video_type: 'user_recorded',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    // If constraint violation, retry without changing video_type
    if (updateError && updateError.code === '23514') {
      const retry = await supabase
        .from('connection_requests')
        .update({
          video_url: videoUrl,
          video_thumbnail_url: videoThumbnailUrl,
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

// Upload thumbnail for request
export const uploadThumbnail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { requestId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No thumbnail file provided' });
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

    // Generate unique filename with user-specific folder
    const fileName = `${requestId}-${Date.now()}.jpg`;
    const filePath = `thumbnails/${userId}/${fileName}`;

    // Upload to Supabase Storage
    const bucketName = process.env.SUPABASE_VIDEO_BUCKET || '6DegreeRequests';
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, req.file.buffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading thumbnail to Supabase storage:', uploadError);
      return res.status(500).json({
        error: 'Failed to upload thumbnail',
        details: uploadError.message
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    const thumbnailUrl = urlData.publicUrl;

    // Update request with thumbnail URL
    const { error: updateError } = await supabase
      .from('connection_requests')
      .update({
        video_thumbnail_url: thumbnailUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating request with thumbnail URL:', updateError);
      return res.status(500).json({ error: 'Failed to update request' });
    }

    return res.status(200).json({
      success: true,
      thumbnailUrl,
      message: 'Thumbnail uploaded successfully'
    });
  } catch (error: any) {
    console.error('Error in uploadThumbnail:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// Update request tags
export const updateRequestTags = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { requestId } = req.params;
    const { tags } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags must be an array' });
    }

    // Check if user is the creator of this request
    const { data: request, error: fetchError } = await supabase
      .from('connection_requests')
      .select('creator_id')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      console.error('Error fetching request:', fetchError);
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.creator_id !== userId) {
      return res.status(403).json({ error: 'You can only update tags for your own requests' });
    }

    // Update tags
    const { data: updatedRequest, error: updateError } = await supabase
      .from('connection_requests')
      .update({ tags: JSON.stringify(tags) })
      .eq('id', requestId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating request tags:', updateError);
      return res.status(500).json({ error: 'Failed to update request tags' });
    }

    return res.status(200).json(updatedRequest);
  } catch (error) {
    console.error('Error in updateRequestTags:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};