import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Newspaper } from 'lucide-react';

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
}

export const NewsCard = ({ article }: NewsCardProps) => {
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block relative bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] rounded-2xl border border-[#1a1a1a] overflow-hidden transition-all duration-300 hover:border-[#333] hover:shadow-2xl hover:shadow-black/50 group"
      style={{ fontFamily: "'Gilroy', sans-serif" }}
    >
      {/* Left accent bar - blue for news */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500/60" />
      
      <div className="pl-5 pr-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 flex items-center gap-1.5">
            <Newspaper className="w-3 h-3" />
            News
          </span>
          {article.category && (
            <span className="text-[10px] text-[#606060] uppercase tracking-wide">
              {article.category}
            </span>
          )}
          <span className="text-[11px] text-[#505050]">
            {formatDistanceToNow(new Date(article.pubDate), { addSuffix: true })}
          </span>
        </div>

        {/* Content */}
        <div className="flex gap-4">
          {/* Text */}
          <div className="flex-1 min-w-0">
            <h3 className="text-[#f0f0f0] text-[15px] font-semibold leading-snug mb-2 line-clamp-2 group-hover:text-white transition-colors">
              {article.title}
            </h3>
            <p className="text-[#888] text-[13px] leading-relaxed line-clamp-2">
              {article.description}
            </p>
          </div>

          {/* Thumbnail */}
          {article.imageUrl && (
            <div className="w-24 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-[#1a1a1a]">
              <img
                src={article.imageUrl}
                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#141414]">
          <span className="text-[10px] text-[#454545] uppercase tracking-wide">Inc42</span>
          <span className="text-xs text-[#666] flex items-center gap-1 group-hover:text-blue-400 transition-colors">
            Read more <ExternalLink className="w-3 h-3" />
          </span>
        </div>
      </div>
    </a>
  );
};

