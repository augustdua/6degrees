import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';
import multer from 'multer';
import {
  uploadAsset,
  generatePhotoAvatar,
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
 * Generate cartoon avatar from user's uploaded photo URL
 * Step 1: Upload user photo to HeyGen, then create avatar group directly
 */
export const generateUserAvatar = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    console.log(`Uploading and creating avatar for user ${userId}`);

    // Step 1: Upload the user's photo to HeyGen
    const imageKey = await uploadAsset(imageUrl);

    console.log(`Image uploaded to HeyGen with key: ${imageKey}`);

    // Store the image key in user profile
    const { error: updateError } = await supabase
      .from('users')
      .update({
        heygen_avatar_image_key: imageKey
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
  } catch (error: any) {
    console.error('Error in generateUserAvatar:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Create and train avatar group
 * Step 2: Create group from uploaded image key and train
 */
export const createAndTrainAvatar = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { imageKeys } = req.body;

    // Get user info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name, heygen_avatar_group_id, heygen_avatar_image_key')
      .eq('id', userId)
      .single();

    if (userError) {
      throw new Error('Failed to fetch user data');
    }

    // Check if user already has an avatar group
    if (userData.heygen_avatar_group_id) {
      return res.status(400).json({
        error: 'User already has an avatar group',
        groupId: userData.heygen_avatar_group_id
      });
    }

    // Use provided imageKeys or fall back to stored image key
    const keysToUse = imageKeys || (userData.heygen_avatar_image_key ? [userData.heygen_avatar_image_key] : null);

    if (!keysToUse || keysToUse.length === 0) {
      return res.status(400).json({ error: 'No image key found. Please upload a photo first.' });
    }

    const groupName = `${userData.first_name} ${userData.last_name} Avatar`.trim();

    console.log(`Creating avatar group for user ${userId}: ${groupName} with image key: ${keysToUse[0]}`);

    // Step 1: Create group with first image
    const groupId = await createAvatarGroup(groupName, keysToUse[0]);

    // Step 2: Add remaining images if any
    if (keysToUse.length > 1) {
      await addLooksToGroup(groupId, `${groupName} - Additional Looks`, keysToUse.slice(1));
    }

    // Step 3: Update user with group ID and mark training as started
    await supabase
      .from('users')
      .update({
        heygen_avatar_group_id: groupId,
        heygen_avatar_training_started_at: new Date().toISOString()
      })
      .eq('id', userId);

    // Step 4: Start training (async, don't wait)
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

        // Update user profile with trained avatar
        await supabase
          .from('users')
          .update({
            heygen_avatar_trained: true,
            heygen_avatar_photo_id: firstAvatar?.id || null
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
      message: 'Avatar group created and training started. Check status with /api/users/avatar/status'
    });
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

        // Update user profile
        await supabase
          .from('users')
          .update({
            heygen_avatar_trained: true,
            heygen_avatar_photo_id: firstAvatar?.id || null
          })
          .eq('id', userId);

        return res.status(200).json({
          hasAvatar: true,
          trained: true,
          groupId: userData.heygen_avatar_group_id,
          photoId: firstAvatar?.id,
          previewUrl: userData.heygen_avatar_preview_url
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