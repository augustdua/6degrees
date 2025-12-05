import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Calendar, User, X } from 'lucide-react';
import { NewsArticle } from '@/hooks/useNews';

interface NewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: NewsArticle | null;
}

export const NewsModal = ({ isOpen, onClose, article }: NewsModalProps) => {
  if (!article) return null;

  // Format date to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Strip HTML from content for preview (basic sanitization)
  const getTextContent = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="font-reddit max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border-[#1a1a1a] text-white scrollbar-hide">
        <DialogHeader>
          <div className="space-y-4">
            {/* Source Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#CBAA5A]/20 text-[#CBAA5A]">
                  Inc42
                </span>
                {article.category && (
                  <span className="text-xs text-[#808080]">• {article.category}</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-[#1a1a1a] text-[#808080] hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Title */}
            <DialogTitle className="text-2xl md:text-3xl font-bold leading-tight text-left text-[#e0e0e0]">
              {article.title}
            </DialogTitle>

            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-[#808080]">
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                <span>{article.author}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(article.pubDate)}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Featured Image */}
        {article.imageUrl && (
          <div className="relative w-full rounded overflow-hidden bg-[#1a1a1a] border border-[#1a1a1a]">
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full h-auto object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Article Content Preview */}
        <div className="space-y-4">
          <div className="prose prose-sm md:prose-base max-w-none">
            <p className="text-base leading-relaxed text-[#b8b8b8]">
              {getTextContent(article.content).substring(0, 800)}...
            </p>
          </div>

          {/* Call to Action */}
          <div className="pt-4 border-t border-[#1a1a1a] flex justify-center">
            <Button
              onClick={() => window.open(article.link, '_blank', 'noopener,noreferrer')}
              className="bg-[#CBAA5A] hover:bg-[#D4B76A] text-black font-bold px-8"
              size="lg"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Read Full Article on Inc42
            </Button>
          </div>

          {/* Attribution */}
          <div className="text-xs text-[#606060] text-center pt-2">
            Source:{' '}
            <a
              href="https://inc42.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#CBAA5A]"
            >
              Inc42 Media
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
