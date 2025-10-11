import axios, { AxiosError } from 'axios';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';
const HEYGEN_API_URL = 'https://api.heygen.com';
const DEFAULT_VOICE_ID = process.env.HEYGEN_DEFAULT_VOICE_ID || '2d5b0e6cf36f460aa7fc47e3eee4ba54';

const axiosHeygen = axios.create({
  baseURL: HEYGEN_API_URL,
  timeout: 60000, // 60s for long operations
  headers: {
    'accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Api-Key': HEYGEN_API_KEY
  }
});

// Retry helper with exponential backoff
async function retryRequest<T>(
  fn: () => Promise<T>,
  maxRetries: number = 6,
  baseDelay: number = 500
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isAxiosError = error instanceof AxiosError;
      if (attempt === maxRetries - 1 || (isAxiosError && error.response?.status && error.response.status < 500)) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// Poll generation until complete
async function pollGeneration(generationId: string, maxWaitSeconds: number = 120): Promise<any> {
  const startTime = Date.now();
  while (true) {
    const response = await retryRequest(() =>
      axiosHeygen.get(`/v2/photo_avatar/generation/${generationId}`)
    );

    const status = response.data?.data?.status;

    if (status === 'success') {
      return response.data;
    }

    if (status === 'failed') {
      throw new Error(`Generation failed: ${JSON.stringify(response.data)}`);
    }

    if ((Date.now() - startTime) / 1000 > maxWaitSeconds) {
      throw new Error('Generation polling timed out');
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Poll group training until ready
async function pollGroupTrained(groupId: string, maxWaitSeconds: number = 180): Promise<void> {
  const startTime = Date.now();
  while (true) {
    const response = await retryRequest(() =>
      axiosHeygen.get('/v2/avatar_group.list')
    );

    const groups = response.data?.data?.avatar_group_list || [];
    const group = groups.find((g: any) => g.id === groupId);

    if (group?.train_status === 'ready') {
      return;
    }

    if ((Date.now() - startTime) / 1000 > maxWaitSeconds) {
      throw new Error('Training polling timed out');
    }

    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

export interface PhotoAvatarRequest {
  name: string;
  age?: string;
  gender?: string;
  ethnicity?: string;
  orientation?: string;
  pose?: string;
  style?: string;
  appearance?: string;
}

export interface GenerateLookRequest {
  groupId: string;
  prompt: string;
  orientation?: string;
  pose?: string;
  style?: string;
}

export interface CreateVideoRequest {
  talkingPhotoId: string;
  inputText: string;
  voiceId?: string;
}

/**
 * Upload an image asset to HeyGen
 * Downloads the image from URL and uploads to HeyGen
 */
export async function uploadAsset(imageUrl: string): Promise<string> {
  console.log(`Uploading asset from URL: ${imageUrl}`);

  // Download the image first
  const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  const imageBuffer = Buffer.from(imageResponse.data);
  const contentType = imageResponse.headers['content-type'] || 'image/jpeg';

  console.log(`Downloaded image: ${imageBuffer.length} bytes, type: ${contentType}`);

  // Upload to HeyGen using their upload endpoint
  const uploadAxios = axios.create({
    baseURL: 'https://upload.heygen.com',
    timeout: 60000,
    headers: {
      'X-Api-Key': HEYGEN_API_KEY,
      'Content-Type': contentType
    }
  });

  const response = await retryRequest(() =>
    uploadAxios.post('/v1/asset', imageBuffer)
  );

  const imageKey = response.data?.data?.image_key || response.data?.image_key;
  if (!imageKey) {
    throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
  }

  console.log(`Asset uploaded successfully: ${imageKey}`);
  return imageKey;
}

/**
 * Generate cartoon photo avatars from user's photo
 */
export async function generatePhotoAvatar(request: PhotoAvatarRequest): Promise<{
  generationId: string;
  imageKeyList: string[];
  imageUrlList: string[];
}> {
  const payload = {
    name: request.name,
    age: request.age || 'Young Adult',
    gender: request.gender || 'Man',
    ethnicity: request.ethnicity || 'South Asian',
    orientation: request.orientation || 'square',
    pose: request.pose || 'half_body',
    style: request.style || 'Cartoon',
    appearance: request.appearance || 'Flat-shaded cartoon portrait, bold outlines, cel-shaded lighting, saturated colors, minimal texture, soft gradient background, friendly expression'
  };

  console.log('Generating photo avatar with payload:', payload);

  const response = await retryRequest(() =>
    axiosHeygen.post('/v2/photo_avatar/photo/generate', payload)
  );

  const generationId = response.data?.data?.generation_id;
  if (!generationId) {
    throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
  }

  console.log(`Photo avatar generation started: ${generationId}`);

  // Poll until completion
  const completed = await pollGeneration(generationId);
  const imageKeyList = completed.data?.image_key_list || [];
  const imageUrlList = completed.data?.image_url_list || [];

  return {
    generationId,
    imageKeyList,
    imageUrlList
  };
}

/**
 * Create an avatar group from generated photo
 */
export async function createAvatarGroup(name: string, imageKey: string): Promise<string> {
  console.log(`Creating avatar group: ${name} with image key: ${imageKey}`);

  const response = await retryRequest(() =>
    axiosHeygen.post('/v2/photo_avatar/avatar_group/create', {
      name,
      image_key: imageKey
    })
  );

  const groupId = response.data?.data?.group_id || response.data?.data?.id;
  if (!groupId) {
    throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
  }

  console.log(`Avatar group created: ${groupId}`);
  return groupId;
}

/**
 * Add additional looks to an avatar group
 */
export async function addLooksToGroup(groupId: string, name: string, imageKeys: string[]): Promise<any> {
  console.log(`Adding ${imageKeys.length} looks to group: ${groupId}`);

  const response = await retryRequest(() =>
    axiosHeygen.post('/v2/photo_avatar/avatar_group/add', {
      group_id: groupId,
      name,
      image_keys: imageKeys
    })
  );

  return response.data;
}

/**
 * Train an avatar group
 */
export async function trainAvatarGroup(groupId: string, waitForCompletion: boolean = true): Promise<void> {
  console.log(`Training avatar group: ${groupId}`);

  await retryRequest(() =>
    axiosHeygen.post('/v2/photo_avatar/train', {
      group_id: groupId
    })
  );

  if (waitForCompletion) {
    console.log('Waiting for training to complete...');
    await pollGroupTrained(groupId);
    console.log('Training completed successfully');
  }
}

/**
 * Generate a new look (outfit/style) for trained avatar group
 */
export async function generateLook(request: GenerateLookRequest): Promise<{
  generationId: string;
  imageKeyList: string[];
  imageUrlList: string[];
}> {
  const payload = {
    group_id: request.groupId,
    prompt: request.prompt,
    orientation: request.orientation || 'square',
    pose: request.pose || 'half_body',
    style: request.style || 'Cartoon'
  };

  console.log('Generating new look with payload:', payload);

  const response = await retryRequest(() =>
    axiosHeygen.post('/v2/photo_avatar/look/generate', payload)
  );

  const generationId = response.data?.data?.generation_id;
  if (!generationId) {
    throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
  }

  console.log(`Look generation started: ${generationId}`);

  // Poll until completion
  const completed = await pollGeneration(generationId);
  const imageKeyList = completed.data?.image_key_list || [];
  const imageUrlList = completed.data?.image_url_list || [];

  return {
    generationId,
    imageKeyList,
    imageUrlList
  };
}

/**
 * Get avatars (talking photos) from a group
 */
export async function getGroupAvatars(groupId: string): Promise<any[]> {
  console.log(`Fetching avatars for group: ${groupId}`);

  const response = await retryRequest(() =>
    axiosHeygen.get(`/v2/avatar_group/${groupId}/avatars`)
  );

  return response.data?.data?.avatar_list || [];
}

/**
 * Add motion to a talking photo
 */
export async function addMotion(lookId: string): Promise<any> {
  console.log(`Adding motion to look: ${lookId}`);

  const response = await retryRequest(() =>
    axiosHeygen.post('/v2/photo_avatar/add_motion', {
      id: lookId
    })
  );

  return response.data;
}

/**
 * Add sound effect to a talking photo
 */
export async function addSoundEffect(lookId: string): Promise<any> {
  console.log(`Adding sound effect to look: ${lookId}`);

  const response = await retryRequest(() =>
    axiosHeygen.post('/v2/photo_avatar/add_sound_effect', {
      id: lookId
    })
  );

  return response.data;
}

/**
 * Get look details
 */
export async function getLookDetails(lookId: string): Promise<any> {
  const response = await retryRequest(() =>
    axiosHeygen.get(`/v2/photo_avatar/${lookId}`)
  );

  return response.data;
}

/**
 * Create a talking-photo video
 */
export async function createTalkingPhotoVideo(request: CreateVideoRequest): Promise<string> {
  const voiceId = request.voiceId || DEFAULT_VOICE_ID;

  if (!voiceId) {
    throw new Error('voice_id is required (no default configured)');
  }

  const payload = {
    video_inputs: [
      {
        character: {
          type: 'talking_photo',
          talking_photo_id: request.talkingPhotoId
        },
        voice: {
          type: 'text',
          input_text: request.inputText,
          voice_id: voiceId
        }
      }
    ],
    dimension: {
      width: 720,
      height: 1280  // Vertical video for mobile/feed
    },
    aspect_ratio: '9:16'
  };

  console.log('Creating talking photo video:', {
    talkingPhotoId: request.talkingPhotoId,
    textLength: request.inputText.length
  });

  const response = await retryRequest(() =>
    axiosHeygen.post('/v2/video/generate', payload)
  );

  const videoId = response.data?.data?.video_id;
  if (!videoId) {
    throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
  }

  console.log(`Talking photo video generation started: ${videoId}`);
  return videoId;
}

/**
 * List all avatar groups for debugging
 */
export async function listAvatarGroups(): Promise<any[]> {
  const response = await retryRequest(() =>
    axiosHeygen.get('/v2/avatar_group.list')
  );

  return response.data?.data?.avatar_group_list || [];
}
