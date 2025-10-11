import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';
import multer from 'multer';
import {
  uploadAsset,
  generatePhotoAvatar,
  generatePhotoAvatarFromImage,
  createAvatarGroup,
  addLooksToGroup,
  trainAvatarGroup,
  generateLook,
  getGroupAvatars,
  listAvatarGroups
} from '../services/heygenPhotoAvatarService';

// Configure multer for photo uploads (memory storage)
const photoUpload = multer({
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

export const photoUploadMiddleware = photoUpload.single('photo');

// Stub controller - to be implemented with Supabase
export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({
    success: false,
    message: 'Profile update functionality not yet implemented'
  });
};

export const getUserById = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({
    success: false,
    message: 'User retrieval functionality not yet implemented'
  });
};

export const searchUsers = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({
    success: false,
    message: 'User search functionality not yet implemented'
  });
};

/**
 * Upload user photo and generate cartoon avatar
 * Step 1: Generate photo avatars (returns 3-4 seed images)
 */
export const uploadAvatarPhoto = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No photo file uploaded' });
    }

    // Get user preferences from request body
    const { age, gender, ethnicity, style, appearance } = req.body;

    // For now, we'll use a data URL approach since HeyGen expects image URLs or keys
    // In production, upload to Supabase storage first, then pass URL to HeyGen
    const photoBuffer = req.file.buffer;
    const photoBase64 = photoBuffer.toString('base64');
    const photoDataUrl = `data:${req.file.mimetype};base64,${photoBase64}`;

    // Note: HeyGen API typically needs a publicly accessible URL or uses their upload flow
    // For now, return guidance that frontend should upload to Supabase storage first
    return res.status(400).json({
      error: 'Direct photo upload not yet implemented. Please upload to Supabase storage first and provide URL.',
      guidance: 'Upload photo to Supabase storage bucket, then call /api/users/avatar/generate with image_url'
    });
  } catch (error: any) {
    console.error('Error in uploadAvatarPhoto:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Generate avatar from user's photo OR generate AI avatar with customization
 * Two modes:
 * - 'photo': Upload user photo to HeyGen (no customization during generation)
 * - 'ai-generate': Text-to-image generation with customization (no photo upload)
 */
export const generateUserAvatar = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { mode, imageUrl, age, gender, ethnicity, style, orientation, pose, appearance } = req.body;

    if (!mode || (mode !== 'photo' && mode !== 'ai-generate')) {
      return res.status(400).json({ error: 'mode must be "photo" or "ai-generate"' });
    }

    if (mode === 'photo') {
      // === Photo Upload Mode ===
      // Upload user's actual photo to HeyGen, NO customization

      if (!imageUrl) {
        return res.status(400).json({ error: 'imageUrl is required for photo mode' });
      }

      console.log(`📸 Photo mode: Uploading user photo for user ${userId}`);

      const imageKey = await uploadAsset(imageUrl);
      console.log(`✅ Image uploaded to HeyGen with key: ${imageKey}`);

      // Store the image key ONLY (no customization params for photo mode)
      const { error: updateError } = await supabase
        .from('users')
        .update({
          heygen_avatar_image_key: imageKey,
          heygen_avatar_mode: 'photo'
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Failed to update user avatar data:', updateError);
      }

      return res.status(200).json({
        success: true,
        imageKey,
        message: 'Photo uploaded to HeyGen successfully. Now call /train to create and train the avatar group.'
      });

    } else {
      // === AI Generate Mode ===
      // Text-to-image generation with customization parameters

      console.log(`🎨 AI Generate mode: Creating avatar for user ${userId} with customization:`, {
        age, gender, ethnicity, style, orientation, pose, appearance
      });

      // Store customization parameters (no image key for AI generation)
      const { error: updateError } = await supabase
        .from('users')
        .update({
          heygen_avatar_mode: 'ai-generate',
          heygen_avatar_age: age || 'Young Adult',
          heygen_avatar_gender: gender || 'Man',
          heygen_avatar_ethnicity: ethnicity || 'Unspecified',
          heygen_avatar_style: style || 'Realistic',
          heygen_avatar_orientation: orientation || 'square',
          heygen_avatar_pose: pose || 'half_body',
          heygen_avatar_appearance: appearance || ''
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Failed to update user avatar data:', updateError);
      }

      return res.status(200).json({
        success: true,
        message: 'Avatar customization saved. Now call /train to generate and train the avatar group.'
      });
    }
  } catch (error: any) {
    console.error('Error in generateUserAvatar:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Create and train avatar group
 * Handles both photo upload and AI generation modes
 */
export const createAndTrainAvatar = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { regenerate, mode } = req.body;

    // Get user info including mode and customization parameters
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name, heygen_avatar_group_id, heygen_avatar_mode, heygen_avatar_image_key, heygen_avatar_age, heygen_avatar_gender, heygen_avatar_ethnicity, heygen_avatar_style, heygen_avatar_orientation, heygen_avatar_pose, heygen_avatar_appearance')
      .eq('id', userId)
      .single();

    if (userError) {
      throw new Error('Failed to fetch user data');
    }

    // Check if user already has an avatar group
    if (userData.heygen_avatar_group_id && !regenerate) {
      return res.status(400).json({
        error: 'User already has an avatar group',
        groupId: userData.heygen_avatar_group_id
      });
    }

    // If regenerating, clear old avatar data first
    if (regenerate && userData.heygen_avatar_group_id) {
      console.log(`Regenerating avatar for user ${userId}, clearing old group ${userData.heygen_avatar_group_id}`);
      await supabase
        .from('users')
        .update({
          heygen_avatar_group_id: null,
          heygen_avatar_photo_id: null,
          heygen_avatar_preview_url: null,
          heygen_avatar_trained: false,
          heygen_avatar_training_started_at: null
        })
        .eq('id', userId);
    }

    const groupName = `${userData.first_name} ${userData.last_name} Avatar`.trim();
    const avatarMode = mode || userData.heygen_avatar_mode || 'photo';

    if (avatarMode === 'photo') {
      // === Photo Upload Mode ===
      // Create avatar group directly from uploaded image key (NO customization)

      if (!userData.heygen_avatar_image_key) {
        return res.status(400).json({ error: 'No image key found. Please upload a photo first.' });
      }

      console.log(`📸 Photo mode: Creating avatar group for user ${userId} from uploaded photo`);

      // Create group directly from the uploaded image (no generation step)
      const groupId = await createAvatarGroup(groupName, userData.heygen_avatar_image_key);

      console.log(`✅ Avatar group created: ${groupId}`);

      // Update user with group ID and mark training as started
      await supabase
        .from('users')
        .update({
          heygen_avatar_group_id: groupId,
          heygen_avatar_training_started_at: new Date().toISOString()
        })
        .eq('id', userId);

      // Start training (async, don't wait)
      trainAvatarGroup(groupId, false).catch(err => {
        console.error(`Training failed for group ${groupId}:`, err);
      });

      // Poll training completion in background
      setTimeout(async () => {
        try {
          await trainAvatarGroup(groupId, true);

          // Get the first talking photo from the group
          const avatars = await getGroupAvatars(groupId);
          const firstAvatar = avatars[0];

          console.log(`Avatar data:`, JSON.stringify(firstAvatar, null, 2));

          // Update user profile with trained avatar
          await supabase
            .from('users')
            .update({
              heygen_avatar_trained: true,
              heygen_avatar_photo_id: firstAvatar?.id || null,
              heygen_avatar_preview_url: firstAvatar?.image_url || firstAvatar?.motion_preview_url || null
            })
            .eq('id', userId);

          console.log(`Training completed for user ${userId}, group ${groupId}`);
        } catch (error) {
          console.error(`Background training failed for user ${userId}:`, error);
        }
      }, 5000);

      return res.status(200).json({
        success: true,
        groupId,
        message: 'Avatar group created from your photo and training started. Check status with /api/users/avatar/status'
      });

    } else {
      // === AI Generate Mode ===
      // Generate photo avatars using text-to-image with customization

      console.log(`🎨 AI Generate mode: Generating avatar for user ${userId} with customization:`, {
        age: userData.heygen_avatar_age,
        gender: userData.heygen_avatar_gender,
        ethnicity: userData.heygen_avatar_ethnicity,
        style: userData.heygen_avatar_style,
        orientation: userData.heygen_avatar_orientation,
        pose: userData.heygen_avatar_pose,
        appearance: userData.heygen_avatar_appearance
      });

      // Generate photo avatars using text-to-image (returns multiple images)
      const photoAvatarResult = await generatePhotoAvatar({
        name: groupName,
        age: userData.heygen_avatar_age || 'Young Adult',
        gender: userData.heygen_avatar_gender || 'Man',
        ethnicity: userData.heygen_avatar_ethnicity || 'Unspecified',
        style: userData.heygen_avatar_style || 'Realistic',
        orientation: userData.heygen_avatar_orientation || 'square',
        pose: userData.heygen_avatar_pose || 'half_body',
        appearance: userData.heygen_avatar_appearance
      });

      console.log(`✅ Photo avatar generation completed. Generated ${photoAvatarResult.imageKeyList.length} images`);

      // Create group with the first generated image
      const groupId = await createAvatarGroup(groupName, photoAvatarResult.imageKeyList[0]);

      // Add remaining generated images as additional looks
      if (photoAvatarResult.imageKeyList.length > 1) {
        await addLooksToGroup(groupId, `${groupName} - Additional Looks`, photoAvatarResult.imageKeyList.slice(1));
      }

      // Update user with group ID and mark training as started
      await supabase
        .from('users')
        .update({
          heygen_avatar_group_id: groupId,
          heygen_avatar_training_started_at: new Date().toISOString()
        })
        .eq('id', userId);

      // Start training (async, don't wait)
      trainAvatarGroup(groupId, false).catch(err => {
        console.error(`Training failed for group ${groupId}:`, err);
      });

      // Poll training completion in background
      setTimeout(async () => {
        try {
          await trainAvatarGroup(groupId, true);

          // Get the first talking photo from the group
          const avatars = await getGroupAvatars(groupId);
          const firstAvatar = avatars[0];

          console.log(`Avatar data:`, JSON.stringify(firstAvatar, null, 2));

          // Update user profile with trained avatar
          await supabase
            .from('users')
            .update({
              heygen_avatar_trained: true,
              heygen_avatar_photo_id: firstAvatar?.id || null,
              heygen_avatar_preview_url: firstAvatar?.image_url || firstAvatar?.motion_preview_url || null
            })
            .eq('id', userId);

          console.log(`Training completed for user ${userId}, group ${groupId}`);
        } catch (error) {
          console.error(`Background training failed for user ${userId}:`, error);
        }
      }, 5000);

      return res.status(200).json({
        success: true,
        groupId,
        message: 'AI avatar generated and training started. Check status with /api/users/avatar/status'
      });
    }
  } catch (error: any) {
    console.error('Error in createAndTrainAvatar:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Check avatar training status
 */
export const getAvatarStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('heygen_avatar_group_id, heygen_avatar_photo_id, heygen_avatar_trained, heygen_avatar_training_started_at, heygen_avatar_preview_url')
      .eq('id', userId)
      .single();

    if (userError) {
      throw new Error('Failed to fetch user data');
    }

    if (!userData.heygen_avatar_group_id) {
      return res.status(200).json({
        hasAvatar: false,
        message: 'No avatar created yet'
      });
    }

    // If already marked as trained, return success
    if (userData.heygen_avatar_trained) {
      return res.status(200).json({
        hasAvatar: true,
        trained: true,
        groupId: userData.heygen_avatar_group_id,
        photoId: userData.heygen_avatar_photo_id,
        previewUrl: userData.heygen_avatar_preview_url
      });
    }

    // Check training status from HeyGen
    try {
      const groups = await listAvatarGroups();
      const userGroup = groups.find(g => g.id === userData.heygen_avatar_group_id);

      if (userGroup?.train_status === 'ready') {
        // Get the first talking photo
        const avatars = await getGroupAvatars(userData.heygen_avatar_group_id);
        const firstAvatar = avatars[0];

        const previewUrl = firstAvatar?.image_url || firstAvatar?.motion_preview_url || null;

        // Update user profile
        await supabase
          .from('users')
          .update({
            heygen_avatar_trained: true,
            heygen_avatar_photo_id: firstAvatar?.id || null,
            heygen_avatar_preview_url: previewUrl
          })
          .eq('id', userId);

        return res.status(200).json({
          hasAvatar: true,
          trained: true,
          groupId: userData.heygen_avatar_group_id,
          photoId: firstAvatar?.id,
          previewUrl: previewUrl
        });
      }

      return res.status(200).json({
        hasAvatar: true,
        trained: false,
        groupId: userData.heygen_avatar_group_id,
        trainStatus: userGroup?.train_status || 'training',
        trainingStartedAt: userData.heygen_avatar_training_started_at
      });
    } catch (error) {
      console.error('Error checking training status from HeyGen:', error);
      return res.status(200).json({
        hasAvatar: true,
        trained: false,
        groupId: userData.heygen_avatar_group_id,
        trainStatus: 'unknown',
        trainingStartedAt: userData.heygen_avatar_training_started_at
      });
    }
  } catch (error: any) {
    console.error('Error in getAvatarStatus:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Generate a new look (outfit/style) for user's avatar
 */
/**
 * Refresh avatar data from HeyGen (for debugging)
 */
export const refreshAvatarData = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('heygen_avatar_group_id')
      .eq('id', userId)
      .single();

    if (userError || !userData.heygen_avatar_group_id) {
      return res.status(400).json({ error: 'No avatar group found' });
    }

    // Get avatars from the group
    const avatars = await getGroupAvatars(userData.heygen_avatar_group_id);
    const firstAvatar = avatars[0];

    if (!firstAvatar) {
      return res.status(404).json({ error: 'No avatars found in group' });
    }

    const previewUrl = firstAvatar.image_url || firstAvatar.motion_preview_url || null;

    // Update database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        heygen_avatar_photo_id: firstAvatar.id,
        heygen_avatar_preview_url: previewUrl
      })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({
      success: true,
      photoId: firstAvatar.id,
      previewUrl: previewUrl,
      avatarData: firstAvatar
    });
  } catch (error: any) {
    console.error('Error in refreshAvatarData:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const generateNewLook = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompt, orientation, pose, style } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('heygen_avatar_group_id, heygen_avatar_trained')
      .eq('id', userId)
      .single();

    if (userError || !userData.heygen_avatar_group_id) {
      return res.status(400).json({ error: 'No avatar group found. Please create an avatar first.' });
    }

    if (!userData.heygen_avatar_trained) {
      return res.status(400).json({ error: 'Avatar is still training. Please wait.' });
    }

    console.log(`Generating new look for user ${userId}`);

    const result = await generateLook({
      groupId: userData.heygen_avatar_group_id,
      prompt,
      orientation,
      pose,
      style
    });

    return res.status(200).json({
      success: true,
      generationId: result.generationId,
      imageKeyList: result.imageKeyList,
      imageUrlList: result.imageUrlList
    });
  } catch (error: any) {
    console.error('Error in generateNewLook:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};