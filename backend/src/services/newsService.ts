import Parser from 'rss-parser';

interface NewsArticle {
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

interface CacheEntry {
  data: NewsArticle[];
  timestamp: number;
}

// In-memory cache
let newsCache: CacheEntry | null = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Extract image URL from RSS item description or content
 */
function extractImageUrl(item: any): string | undefined {
  // Try to extract from description first (Inc42 includes image in description)
  const description = item.description || item.content || '';
  const imgRegex = /<img[^>]+src="([^">]+)"/i;
  const match = description.match(imgRegex);
  
  if (match && match[1]) {
    return match[1];
  }
  
  // Try enclosure
  if (item.enclosure && item.enclosure.url) {
    return item.enclosure.url;
  }
  
  // Try media:content (some RSS feeds use this)
  if (item['media:content'] && item['media:content'].$ && item['media:content'].$.url) {
    return item['media:content'].$.url;
  }
  
  return undefined;
}

/**
 * Strip HTML tags from text to get clean excerpt
 */
function stripHtml(html: string): string {
  return html
    .replace(/<img[^>]*>/gi, '') // Remove images
    .replace(/<[^>]+>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, '...')
    .trim();
}

/**
 * Fetch news from Inc42 RSS feed with 15-minute caching
 */
export async function fetchInc42News(): Promise<NewsArticle[]> {
  const now = Date.now();
  
  // Check if cache is valid
  if (newsCache && (now - newsCache.timestamp) < CACHE_DURATION) {
    console.log('📰 newsService: Returning cached news data');
    return newsCache.data;
  }
  
  console.log('📰 newsService: Fetching fresh news from Inc42 RSS feed');
  
  try {
    const parser = new Parser({
      customFields: {
        item: [
          ['media:content', 'media:content'],
          ['content:encoded', 'content:encoded']
        ]
      }
    });
    
    const feed = await parser.parseURL('https://inc42.com/feed/');
    
    const articles: NewsArticle[] = feed.items.slice(0, 20).map((item, index) => {
      const imageUrl = extractImageUrl(item);
      const cleanDescription = stripHtml(item.description || item.contentSnippet || '');
      const fullContent = item['content:encoded'] || item.content || item.description || '';
      
      return {
        id: item.guid || item.link || `inc42-${index}`,
        title: item.title || 'Untitled',
        link: item.link || '',
        description: cleanDescription.substring(0, 300) + (cleanDescription.length > 300 ? '...' : ''),
        content: fullContent,
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        author: item.creator || 'Inc42',
        imageUrl,
        category: item.categories && item.categories.length > 0 ? item.categories[0] : 'News'
      };
    });
    
    // Update cache
    newsCache = {
      data: articles,
      timestamp: now
    };
    
    console.log(`📰 newsService: Successfully fetched ${articles.length} articles from Inc42`);
    return articles;
    
  } catch (error) {
    console.error('❌ newsService: Error fetching Inc42 RSS feed:', error);
    
    // If we have stale cache data, return it rather than failing completely
    if (newsCache && newsCache.data.length > 0) {
      console.log('⚠️ newsService: Returning stale cache data due to fetch error');
      return newsCache.data;
    }
    
    throw new Error('Failed to fetch news from Inc42');
  }
}

/**
 * Clear the news cache (useful for testing)
 */
export function clearNewsCache(): void {
  newsCache = null;
  console.log('🗑️ newsService: Cache cleared');
}

