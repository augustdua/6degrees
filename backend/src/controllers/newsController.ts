import { Request, Response } from 'express';
import { fetchInc42News } from '../services/newsService';

/**
 * GET /api/news
 * Fetch latest news from Inc42
 * Public endpoint - no authentication required
 */
export const getNews = async (req: Request, res: Response) => {
  try {
    console.log('📰 newsController: GET /api/news - Fetching news articles');
    
    const articles = await fetchInc42News();
    
    console.log(`✅ newsController: Successfully retrieved ${articles.length} articles`);
    
    res.status(200).json(articles);
  } catch (error: any) {
    console.error('❌ newsController: Error fetching news:', error);
    
    res.status(500).json({
      error: 'Failed to fetch news',
      message: error.message || 'An error occurred while fetching news from Inc42'
    });
  }
};

