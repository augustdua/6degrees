import { formatDistanceToNow } from 'date-fns';
import { Newspaper, MessageSquare, ArrowBigUp, Share2, Bookmark } from 'lucide-react';

interface NewsArticle {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  imageUrl?: string;
  category?: string;
}

interface NewsCardProps {
  article: NewsArticle;
  onClick?: () => void;
}

export const NewsCard = ({ article, onClick }: NewsCardProps) => {
  return (
    <article 
      onClick={onClick}
      className="font-reddit bg-card hover:bg-muted/50 border border-border rounded-sm overflow-hidden transition-colors duration-150 cursor-pointer"
    >
      <div className="flex">
        {/* Reddit-style Vote Column */}
        <div className="flex flex-col items-center py-2 px-2 bg-muted/40 w-10 flex-shrink-0">
          <button 
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-[#CBAA5A]"
          >
            <ArrowBigUp className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold my-0.5 text-foreground">•</span>
          <div className="w-5 h-5" /> {/* Spacer */}
        </div>

        {/* Main Content */}
        <div className="flex-1 py-2 px-3">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs mb-2">
            <span className="flex items-center gap-1 text-[#CBAA5A]">
              <Newspaper className="w-3 h-3" />
              <span className="font-bold">News</span>
            </span>
            <span className="text-muted-foreground/80">•</span>
            {article.category && (
              <>
                <span className="text-muted-foreground">{article.category}</span>
                <span className="text-muted-foreground/80">•</span>
              </>
            )}
            <span className="text-muted-foreground/80">
              {formatDistanceToNow(new Date(article.pubDate), { addSuffix: true })}
            </span>
          </div>

          {/* Content - Horizontal layout like Reddit with thumbnail */}
          <div className="flex gap-3">
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h3 className="text-foreground text-base font-medium leading-snug mb-1 line-clamp-2 hover:underline">
                {article.title}
              </h3>
              
              {/* Description */}
              <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-2">
                {article.description}
              </p>

              {/* Source */}
              <span className="text-[10px] text-muted-foreground/80 uppercase tracking-wide">Inc42</span>
            </div>

            {/* Thumbnail */}
            {article.imageUrl && (
              <div className="w-32 h-20 rounded overflow-hidden flex-shrink-0 border border-border">
                <img
                  src={article.imageUrl}
                  alt=""
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Reddit-style Action Bar */}
          <div className="flex items-center gap-1 mt-2 -ml-1">
            <button 
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground text-xs font-bold"
            >
              <MessageSquare className="w-4 h-4" />
              Comments
            </button>
            
            <button 
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground text-xs font-bold"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            
            <button 
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground text-xs font-bold"
            >
              <Bookmark className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
