import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiGet, apiPost } from '@/lib/api';
import { formatOfferPrice } from '@/lib/currency';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/hooks/useAuth';
import { 
  Sparkles, 
  RefreshCw, 
  Loader2, 
  ArrowRight,
  Building2,
  Briefcase,
  DollarSign,
  Wand2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ForYouOffer {
  id: string;
  title: string;
  description: string;
  target_organization?: string;
  target_position?: string;
  target_logo_url?: string;
  asking_price_inr: number;
  tags?: string[];
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
    bio?: string;
  };
}

interface ForYouOffersProps {
  onViewOffer?: (offer: ForYouOffer) => void;
}

const ForYouOffers: React.FC<ForYouOffersProps> = ({ onViewOffer }) => {
  const [offers, setOffers] = useState<ForYouOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [hasOffers, setHasOffers] = useState(false);
  const { userCurrency } = useCurrency();
  const { toast } = useToast();
  const { user, isReady } = useAuth();

  // Fetch existing "For You" offers
  const fetchOffers = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const data = await apiGet('/api/ai-offers/for-you');
      setOffers(data.offers || []);
      setHasOffers(data.hasOffers || false);
    } catch (error) {
      console.error('Error fetching For You offers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Wait for auth to be ready before fetching
  useEffect(() => {
    if (isReady && user) {
      fetchOffers();
    } else if (isReady && !user) {
      setLoading(false);
    }
  }, [isReady, user]);

  // Generate new offers
  const handleGenerate = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not logged in',
        description: 'Please log in to generate personalized offers'
      });
      return;
    }
    
    if (!prompt.trim() || prompt.trim().length < 10) {
      toast({
        variant: 'destructive',
        title: 'Prompt too short',
        description: 'Please describe what kind of connections you\'re looking for (at least 10 characters)'
      });
      return;
    }

    setGenerating(true);
    try {
      const data = await apiPost('/api/ai-offers/generate', { prompt: prompt.trim() });
      
      if (data.success) {
        setOffers(data.offers || []);
        setHasOffers(true);
        setPrompt('');
        toast({
          title: '✨ Offers Generated!',
          description: 'We\'ve created 3 personalized offers just for you'
        });
      } else {
        throw new Error(data.error || 'Failed to generate offers');
      }
    } catch (error: any) {
      console.error('Error generating offers:', error);
      toast({
        variant: 'destructive',
        title: 'Generation failed',
        description: error.message || 'Failed to generate offers. Please try again.'
      });
    } finally {
      setGenerating(false);
    }
  };

  // Loading state (including waiting for auth)
  if (loading || !isReady) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#CBAA5A]" />
      </div>
    );
  }
  
  // Not logged in
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#CBAA5A]/20 to-[#E5D9B6]/20 mb-4">
          <Sparkles className="h-8 w-8 text-[#CBAA5A]" />
        </div>
        <h2 className="font-riccione text-2xl text-white mb-2">
          Sign in to see personalized offers
        </h2>
        <p className="font-gilroy text-[#888] text-sm">
          Log in to get AI-generated offers tailored just for you.
        </p>
      </div>
    );
  }

  // No offers yet - show prompt input
  if (!hasOffers) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#CBAA5A]/20 to-[#E5D9B6]/20 mb-4">
            <Sparkles className="h-8 w-8 text-[#CBAA5A]" />
          </div>
          <h2 className="font-riccione text-3xl md:text-4xl text-white mb-2">
            Personalized Offers
          </h2>
          <p className="font-gilroy text-[#888] text-sm md:text-base tracking-wide">
            Tell us what kind of professional connections you're looking for, 
            and we'll create custom offers just for you.
          </p>
        </div>

        <Card className="bg-[#111] border-[#333] overflow-hidden">
          <CardContent className="p-6">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: I'm looking for connections in the AI/ML space, particularly senior engineers at top tech companies who can mentor me on breaking into the field..."
              className="min-h-[120px] bg-[#0a0a0a] border-[#333] text-white placeholder:text-[#666] font-gilroy text-sm resize-none mb-4"
              disabled={generating}
            />
            
            <div className="flex items-center justify-between">
              <p className="text-[#666] text-xs font-gilroy">
                {prompt.length}/500 characters
              </p>
              <Button
                onClick={handleGenerate}
                disabled={generating || prompt.trim().length < 10}
                className="bg-gradient-to-r from-[#CBAA5A] to-[#E5D9B6] text-black hover:from-[#E5D9B6] hover:to-[#CBAA5A] font-gilroy tracking-wide"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate Offers
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Example prompts */}
        <div className="mt-6">
          <p className="text-[#666] text-xs font-gilroy tracking-wide mb-3 text-center">
            TRY THESE PROMPTS:
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              'Startup founders who raised Series A',
              'Product managers at FAANG companies',
              'VCs and angel investors in India',
              'Senior engineers in fintech'
            ].map((example) => (
              <button
                key={example}
                onClick={() => setPrompt(example)}
                className="px-3 py-1.5 rounded-full bg-[#1a1a1a] border border-[#333] text-[#888] text-xs font-gilroy hover:border-[#CBAA5A] hover:text-[#CBAA5A] transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show generated offers
  return (
    <div className="px-4 py-6">
      {/* Header with regenerate */}
      <div className="flex items-center justify-between mb-6 max-w-4xl mx-auto">
        <div>
          <h2 className="font-riccione text-2xl text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#CBAA5A]" />
            For You
          </h2>
          <p className="font-gilroy text-[#666] text-xs tracking-wide mt-1">
            Personalized offers based on your interests
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setHasOffers(false)}
          className="font-gilroy text-xs border-[#333] text-[#888] hover:text-white hover:border-[#CBAA5A]"
        >
          <RefreshCw className="h-3 w-3 mr-2" />
          New Prompt
        </Button>
      </div>

      {/* Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
        {offers.map((offer) => (
          <Card 
            key={offer.id} 
            className="bg-[#111] border-[#222] hover:border-[#CBAA5A]/50 transition-all duration-300 overflow-hidden group"
          >
            <CardContent className="p-5">
              {/* Creator */}
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-10 w-10 border-2 border-[#333]">
                  <AvatarImage src={offer.creator?.profile_picture_url} />
                  <AvatarFallback className="bg-[#222] text-[#CBAA5A] font-gilroy text-xs">
                    {offer.creator?.first_name?.[0]}{offer.creator?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-gilroy text-white text-sm truncate">
                    {offer.creator?.first_name} {offer.creator?.last_name}
                  </p>
                  <p className="font-gilroy text-[#666] text-xs truncate">
                    Offer Creator
                  </p>
                </div>
                <Badge className="bg-gradient-to-r from-[#CBAA5A]/20 to-[#E5D9B6]/20 text-[#CBAA5A] border-[#CBAA5A]/30 text-[9px] font-gilroy">
                  AI PICK
                </Badge>
              </div>

              {/* Title */}
              <h3 className="font-gilroy text-white text-base font-medium mb-2 line-clamp-2 group-hover:text-[#CBAA5A] transition-colors">
                {offer.title}
              </h3>

              {/* Description */}
              <p className="font-gilroy text-[#888] text-xs leading-relaxed mb-4 line-clamp-3">
                {offer.description}
              </p>

              {/* Target info */}
              {(offer.target_organization || offer.target_position) && (
                <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-[#0a0a0a]">
                  {offer.target_logo_url && (
                    <img 
                      src={offer.target_logo_url} 
                      alt="" 
                      className="h-6 w-6 rounded object-contain bg-white p-0.5"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    {offer.target_position && (
                      <p className="font-gilroy text-white text-xs truncate flex items-center gap-1">
                        <Briefcase className="h-3 w-3 text-[#666]" />
                        {offer.target_position}
                      </p>
                    )}
                    {offer.target_organization && (
                      <p className="font-gilroy text-[#666] text-[10px] truncate flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {offer.target_organization}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {offer.tags && offer.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {offer.tags.filter(tag => !tag.startsWith('for_you_')).slice(0, 3).map((tag, idx) => (
                    <span 
                      key={idx}
                      className="px-2 py-0.5 rounded-full bg-[#1a1a1a] text-[#888] text-[9px] font-gilroy"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Price and CTA */}
              <div className="flex items-center justify-between pt-3 border-t border-[#222]">
                <div className="flex items-center gap-1 text-[#CBAA5A]">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-gilroy text-sm font-medium">
                    {formatOfferPrice(offer.asking_price_inr, userCurrency)}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => onViewOffer?.(offer)}
                  className="bg-gradient-to-r from-[#CBAA5A] to-[#E5D9B6] text-black hover:from-[#E5D9B6] hover:to-[#CBAA5A] font-gilroy text-xs tracking-wide"
                >
                  View Offer
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ForYouOffers;

