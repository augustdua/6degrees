import axios from 'axios';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';
const HEYGEN_API_URL = 'https://api.heygen.com';

// Simple in-memory cache to avoid slow repeated fetches
let avatarsCache: any[] | null = null;
let avatarsCacheExpiresAt = 0; // epoch ms
let avatarsRefreshing = false;

const axiosHeygen = axios.create({
  baseURL: HEYGEN_API_URL,
  timeout: 10000 // 10s per request
});

export interface HeyGenVideoRequest {
  script: string;
  avatarId?: string;
  voiceId?: string;
}

export interface HeyGenVideoStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

/**
 * Generate an AI video using HeyGen API
 */
export async function generateHeyGenVideo(request: HeyGenVideoRequest): Promise<string> {
  const avatarId = request.avatarId || 'Daisy-inskirt-20220818';
  const voiceId = request.voiceId || '2d5b0e6cf36f460aa7fc47e3eee4ba54';

  try {
    const response = await axios.post(
      `${HEYGEN_API_URL}/v2/video/generate`,
      {
        video_inputs: [
          {
            character: {
              type: 'avatar',
              avatar_id: avatarId,
              avatar_style: 'normal'
            },
            voice: {
              type: 'text',
              input_text: request.script,
              voice_id: voiceId
            },
            background: {
              type: 'color',
              value: '#FFFFFF'
            }
          }
        ],
        dimension: {
          width: 720,
          height: 1280  // Vertical video for mobile/feed
        },
        aspect_ratio: '9:16'
      },
      {
        headers: {
          'X-Api-Key': HEYGEN_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('HeyGen video generation started:', response.data);
    return response.data.data.video_id;
  } catch (error: any) {
    console.error('Error generating HeyGen video:', error.response?.data || error.message);
    throw new Error(`Failed to generate video: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Check the status of a HeyGen video
 */
export async function checkHeyGenVideoStatus(videoId: string): Promise<HeyGenVideoStatus> {
  try {
    const response = await axios.get(
      `${HEYGEN_API_URL}/v1/video_status.get?video_id=${videoId}`,
      {
        headers: {
          'X-Api-Key': HEYGEN_API_KEY
        }
      }
    );

    const data = response.data.data;

    if (data.status === 'completed') {
      return {
        status: 'completed',
        videoUrl: data.video_url
      };
    } else if (data.status === 'failed') {
      return {
        status: 'failed',
        error: data.error || 'Video generation failed'
      };
    } else if (data.status === 'processing') {
      return {
        status: 'processing'
      };
    } else {
      return {
        status: 'pending'
      };
    }
  } catch (error: any) {
    console.error('Error checking HeyGen video status:', error.response?.data || error.message);
    throw new Error(`Failed to check video status: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Get list of available HeyGen avatars with full details including tags
 * Uses hybrid approach: returns base avatars immediately, fetches groups in background
 */
export async function getHeyGenAvatars() {
  try {
    // Serve from cache (fast path)
    const now = Date.now();
    if (avatarsCache && avatarsCacheExpiresAt > now) {
      console.log(`Returning ${avatarsCache.length} cached avatars`);
      return avatarsCache;
    }

    console.log('Fetching base HeyGen avatars...');

    // A) Fetch base avatars quickly (returns avatars + talking_photos)
    const baseResp = await axiosHeygen.get(`/v2/avatars`, { headers: { 'X-Api-Key': HEYGEN_API_KEY } });
    const base = baseResp.data?.data || {};
    const avatars = Array.isArray(base.avatars) ? base.avatars : [];
    const talkingPhotos = Array.isArray(base.talking_photos) ? base.talking_photos : [];

    // B) Normalize base avatars
    const normalizedBase = [
      // regular avatars
      ...avatars.map((a: any) => ({
        avatar_id: a.avatar_id,
        avatar_name: a.avatar_name,
        gender: a.gender || null,
        preview_image_url: a.preview_image_url,
        preview_video_url: a.preview_video_url,
        premium: a.premium === true ? true : false,
        is_public: false,
        tags: Array.isArray(a.tags) ? a.tags : [],
        style: undefined as string | undefined
      })),
      // talking photos as animated avatars
      ...talkingPhotos.map((p: any) => ({
        avatar_id: p.talking_photo_id,
        avatar_name: p.talking_photo_name,
        gender: null,
        preview_image_url: p.preview_image_url,
        preview_video_url: undefined,
        premium: false,
        is_public: false,
        tags: Array.isArray(p.tags) ? p.tags : [],
        style: 'Animated' as const
      }))
    ];

    console.log(`Returning ${normalizedBase.length} base avatars immediately`);

    // Set quick cache with base results (30 seconds) and return immediately
    avatarsCache = normalizedBase;
    avatarsCacheExpiresAt = now + 30 * 1000; // 30 second TTL for base cache

    // C) Kick off background refresh to enrich with public group avatars (extends TTL to 10 min)
    if (!avatarsRefreshing) {
      avatarsRefreshing = true;
      console.log('Starting background fetch of avatar groups...');
      (async () => {
        try {
          const groupsResp = await axiosHeygen.get(`/v2/avatar_group.list`, {
            headers: { 'X-Api-Key': HEYGEN_API_KEY },
            params: { include_public: true }
          });
          const groups: any[] = groupsResp.data?.data?.avatar_group_list || [];
          console.log(`Found ${groups.length} avatar groups, fetching avatars...`);

          const groupIds = groups.map(g => g.id);
          const batches: string[][] = [];
          for (let i = 0; i < groupIds.length; i += 10) {
            batches.push(groupIds.slice(i, i + 10));
          }

          const groupResults: any[] = [];
          for (const batch of batches) {
            const settled = await Promise.allSettled(batch.map(async (id) => {
              const r = await axiosHeygen.get(`/v2/avatar_group/${id}/avatars`, {
                headers: { 'X-Api-Key': HEYGEN_API_KEY }
              });
              const list: any[] = r.data?.data?.avatar_list || [];
              return list.map(item => ({
                avatar_id: item.id,
                avatar_name: item.name,
                gender: item.gender || null,
                preview_image_url: item.image_url,
                preview_video_url: item.motion_preview_url,
                premium: false,
                is_public: true,
                tags: Array.isArray(item.tags) ? item.tags : [],
                style: item.is_motion ? 'Animated' : undefined
              }));
            }));
            for (const s of settled) {
              if (s.status === 'fulfilled') groupResults.push(...s.value);
            }
          }

          console.log(`Background fetch complete: ${groupResults.length} avatars from groups`);

          // Merge and deduplicate
          const merged = [...normalizedBase, ...groupResults];
          const uniqueMap = new Map<string, any>();
          for (const a of merged) {
            if (a && a.avatar_id) {
              if (!uniqueMap.has(a.avatar_id) || a.is_public) {
                uniqueMap.set(a.avatar_id, a);
              }
            }
          }

          avatarsCache = Array.from(uniqueMap.values());
          avatarsCacheExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
          console.log(`Cache updated with ${avatarsCache.length} total avatars`);
        } catch (e) {
          console.error('Background avatar fetch failed:', e);
          // keep base cache
        } finally {
          avatarsRefreshing = false;
        }
      })();
    }

    return normalizedBase;
  } catch (error: any) {
    console.error('Error fetching HeyGen avatars:', error.response?.data || error.message);
    // Soft fallback to default list
    try {
      const fallback = await axiosHeygen.get(`/v2/avatars`, { headers: { 'X-Api-Key': HEYGEN_API_KEY } });
      const avatars = fallback.data?.data?.avatars || [];
      return avatars.map((a: any) => ({
        avatar_id: a.avatar_id,
        avatar_name: a.avatar_name,
        gender: a.gender || null,
        preview_image_url: a.preview_image_url,
        preview_video_url: a.preview_video_url,
        premium: a.premium || false,
        is_public: false,
        tags: Array.isArray(a.tags) ? a.tags : [],
        style: undefined
      }));
    } catch {
      return [{
        avatar_id: 'Daisy-inskirt-20220818',
        avatar_name: 'Daisy',
        gender: 'female',
        preview_image_url: '',
        premium: false,
        is_public: false,
        tags: [],
        style: undefined
      }];
    }
  }
}

/**
 * Get list of available HeyGen voices with locale information
 */
export async function getHeyGenVoices() {
  try {
    // Fetch voices and locales in parallel
    const [voicesResp, localesResp] = await Promise.all([
      axios.get(`${HEYGEN_API_URL}/v2/voices`, {
        headers: { 'X-Api-Key': HEYGEN_API_KEY }
      }),
      axios.get(`${HEYGEN_API_URL}/v2/voices/locales`, {
        headers: { 'X-Api-Key': HEYGEN_API_KEY }
      }).catch(() => ({ data: { data: [] } })) // Gracefully handle if locales endpoint fails
    ]);

    const voices = voicesResp.data.data?.voices || [];
    const locales = localesResp.data.data || [];

    // Create a map of locale codes to their labels for easy lookup
    const localeMap = new Map();
    if (Array.isArray(locales)) {
      locales.forEach((loc: any) => {
        if (loc.locale) {
          localeMap.set(loc.locale, {
            label: loc.label || loc.locale,
            language: loc.language || loc.locale.split('-')[0]
          });
        }
      });
    }

    // Enrich voices with locale/country information
    return voices.map((voice: any) => {
      // Extract country from language field if it contains locale code (e.g., "English (US)")
      let country = null;
      let displayLanguage = voice.language || voice.voice_name || '';

      // Check if voice has locale information
      if (voice.locale && localeMap.has(voice.locale)) {
        const localeInfo = localeMap.get(voice.locale);
        country = localeInfo.label;
        displayLanguage = localeInfo.language;
      } else if (voice.language) {
        // Try to extract country from language string (e.g., "English (US)" -> "US")
        const countryMatch = voice.language.match(/\(([^)]+)\)/);
        if (countryMatch) {
          country = countryMatch[1];
        }
      }

      return {
        voice_id: voice.voice_id,
        voice_name: voice.voice_name || voice.name || 'Voice',
        language: displayLanguage,
        locale: voice.locale || null,
        country: country,
        gender: voice.gender || null,
        preview_url: voice.preview_audio_url || voice.preview_url || null,
        support_locale: voice.support_locale || false
      };
    });
  } catch (error: any) {
    console.error('Error fetching HeyGen voices:', error.response?.data || error.message);
    // Return default voice if API fails
    return [{
      voice_id: '2d5b0e6cf36f460aa7fc47e3eee4ba54',
      voice_name: 'English Female',
      language: 'English',
      country: null,
      locale: null
    }];
  }
}
