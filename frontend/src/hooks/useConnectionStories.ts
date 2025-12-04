import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

export interface ConnectionStory {
  id: string;
  photo_url: string;
  story?: string;
  featured_connection_id?: string;
  featured_connection_name?: string;
  featured_connection_photo?: string;
  location?: string;
  year?: number;
  display_order: number;
  created_at: string;
}

export const useConnectionStories = (userId?: string) => {
  const [stories, setStories] = useState<ConnectionStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStories = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await apiGet(`/api/connection-stories/${userId}`, { skipCache: true });
      setStories(data.stories || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching connection stories:', err);
      setError(err.message || 'Failed to load stories');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const createStory = async (storyData: Partial<ConnectionStory>) => {
    const data = await apiPost('/api/connection-stories', storyData);
    await fetchStories();
    return data.story;
  };

  const updateStory = async (storyId: string, storyData: Partial<ConnectionStory>) => {
    const data = await apiPut(`/api/connection-stories/${storyId}`, storyData);
    await fetchStories();
    return data.story;
  };

  const deleteStory = async (storyId: string) => {
    await apiDelete(`/api/connection-stories/${storyId}`);
    await fetchStories();
  };

  const reorderStories = async (orders: { id: string; display_order: number }[]) => {
    await apiPut('/api/connection-stories/reorder', { orders });
    await fetchStories();
  };

  return {
    stories,
    loading,
    error,
    fetchStories,
    createStory,
    updateStory,
    deleteStory,
    reorderStories
  };
};

export default useConnectionStories;

