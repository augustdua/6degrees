import { useState, useEffect } from 'react';
import { apiGet, API_ENDPOINTS } from '@/lib/api';

export interface NewsArticle {
  id: string;
  title: string;
  link: string;
  description: string;
  content: string;
  pubDate: string;
  author: string;
  imageUrl?: string;
  category?: string;
}

export const useNews = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = async () => {
    console.log('📰 useNews: Fetching news articles');
    setLoading(true);
    setError(null);

    try {
      const data = await apiGet(API_ENDPOINTS.NEWS);
      console.log('✅ useNews: News articles fetched:', data);
      
      if (Array.isArray(data)) {
        setArticles(data);
      } else {
        console.error('❌ useNews: Invalid data format:', data);
        setError('Invalid news data format');
        setArticles([]);
      }
    } catch (err: any) {
      console.error('❌ useNews: Error fetching news:', err);
      setError(err.message || 'Failed to fetch news');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  return {
    articles,
    loading,
    error,
    refetch: fetchNews
  };
};

