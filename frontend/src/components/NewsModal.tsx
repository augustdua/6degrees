import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Calendar, User } from 'lucide-react';
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <div className="space-y-4">
            {/* Inc42 Source Badge */}
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs font-medium">
                Inc42 • {article.category || 'News'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0"
              >
                ✕
              </Button>
            </div>

            {/* Title */}
            <DialogTitle className="text-2xl md:text-3xl font-bold leading-tight text-left">
              {article.title}
            </DialogTitle>

            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{article.author}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(article.pubDate)}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Featured Image */}
        {article.imageUrl && (
          <div className="relative w-full rounded-lg overflow-hidden bg-muted">
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
          <div className="prose prose-sm md:prose-base max-w-none dark:prose-invert">
            <p className="text-base leading-relaxed">
              {getTextContent(article.content).substring(0, 800)}...
            </p>
          </div>

          {/* Call to Action */}
          <div className="pt-4 border-t flex justify-center">
            <Button
              onClick={() => window.open(article.link, '_blank', 'noopener,noreferrer')}
              className="bg-[#37D5A3] hover:bg-[#2BC090] text-[#0f1419] font-semibold px-8"
              size="lg"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Read Full Article on Inc42
            </Button>
          </div>

          {/* Attribution */}
          <div className="text-xs text-muted-foreground text-center pt-2">
            Source:{' '}
            <a
              href="https://inc42.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary"
            >
              Inc42 Media
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

