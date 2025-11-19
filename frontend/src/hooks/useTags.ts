import { useState, useCallback, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api';

export const useTags = () => {
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
      setPopularTags(tags);
      return tags;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch popular tags';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load tags on mount
  useEffect(() => {
    fetchAllTags();
    fetchPopularTags();
  }, [fetchAllTags, fetchPopularTags]);

  return {
    allTags,
    popularTags,
    loading,
    error,
    fetchAllTags,
    fetchPopularTags
  };
};

