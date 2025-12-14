import { useState, useCallback, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api';

export const useTags = () => {
  const isDev = import.meta.env.DEV;
  const [allTags, setAllTags] = useState<string[]>([]);
  const [popularTags, setPopularTags] = useState<Array<{ name: string; count: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all available tags
  const fetchAllTags = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/tags`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }

      const tags: string[] = await response.json();
      setAllTags(tags);
      return tags;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tags';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch popular tags
  const fetchPopularTags = useCallback(async (limit: number = 20) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/tags/popular?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch popular tags');
      }

      const tags: Array<{ name: string; count: number }> = await response.json();
      if (isDev) console.log('📋 Fetched popular tags:', tags);
      
      // If no popular tags, use all tags as fallback
      if (!tags || tags.length === 0) {
        if (isDev) console.log('⚠️ No popular tags, using all tags as fallback');
        const fallbackTags = allTags.slice(0, limit).map(name => ({ name, count: 0 }));
        setPopularTags(fallbackTags);
        return fallbackTags;
      }
      
      setPopularTags(tags);
      return tags;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch popular tags';
      // Keep error in console even in prod (helps debugging API issues).
      console.error('❌ Error fetching popular tags:', errorMessage);
      setError(errorMessage);
      
      // Use all tags as fallback on error
      const fallbackTags = allTags.slice(0, limit).map(name => ({ name, count: 0 }));
      setPopularTags(fallbackTags);
      return fallbackTags;
    } finally {
      setLoading(false);
    }
  }, [allTags]);

  // Auto-load tags on mount
  useEffect(() => {
    const loadTags = async () => {
      if (isDev) console.log('🏷️ useTags: Starting to load tags...');
      const tags = await fetchAllTags();
      if (isDev) console.log('🏷️ useTags: Fetched tags:', tags);
      
      // Use ALL tags for animation (not just popular ones)
      if (tags && tags.length > 0) {
        const mappedTags = tags.map(name => ({ name, count: 0 }));
        if (isDev) console.log('🏷️ useTags: Setting popularTags:', mappedTags);
        setPopularTags(mappedTags);
      } else {
        if (isDev) console.warn('⚠️ useTags: No tags fetched!');
      }
    };
    loadTags();
  }, [fetchAllTags]);

  return {
    allTags,
    popularTags,
    loading,
    error,
    fetchAllTags,
    fetchPopularTags
  };
};

