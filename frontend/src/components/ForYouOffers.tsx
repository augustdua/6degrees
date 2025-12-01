import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiGet, apiPost } from '@/lib/api';
import { formatOfferPrice } from '@/lib/currency';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/hooks/useAuth';
import { OfferCard } from '@/components/OfferCard';
import { 
  Sparkles, 
  RefreshCw, 
  Loader2, 
  ArrowRight,
  Building2,
  Briefcase,
  DollarSign,
  Wand2,
  History,
  Clock
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
  ai_generation_id?: string;
  created_at?: string;
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
    bio?: string;
  };
}

interface HistoryItem {
  id: string;
  prompt: string;
  created_at: string;
}

interface ForYouOffersProps {
  onViewOffer?: (offer: ForYouOffer) => void;
}

const ForYouOffers: React.FC<ForYouOffersProps> = ({ onViewOffer }) => {
  const [offers, setOffers] = useState<ForYouOffer[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [hasOffers, setHasOffers] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const { userCurrency } = useCurrency();
  const { toast } = useToast();
  const { user, isReady } = useAuth();
  
  // Refs for scrolling to generation sections
  const generationRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Fetch history
  const fetchHistory = async () => {
    if (!user) return;
    try {
      const data = await apiGet('/api/ai-offers/history');
      setHistory(data.history || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  // Fetch all offers (always fetches all, generationId is just for scrolling)
  const fetchOffers = async (scrollToGenerationId?: string) => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Always fetch all offers
      const endpoint = scrollToGenerationId 
        ? `/api/ai-offers/for-you?generationId=${scrollToGenerationId}`
        : '/api/ai-offers/for-you';
      
      console.log('🔍 Fetching offers from:', endpoint);
        
      const data = await apiGet(endpoint);
      
      console.log('📦 Received data:', data);
      
      setOffers(data.offers || []);
      setHasOffers((data.offers?.length || 0) > 0);
      
      // If a generation ID was specified, scroll to it after render
      if (scrollToGenerationId) {
        setSelectedHistoryId(scrollToGenerationId);
        // Wait for DOM to update then scroll
        setTimeout(() => {
          const element = generationRefs.current[scrollToGenerationId];
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else {
        setSelectedHistoryId(null);
      }
    } catch (error) {
      console.error('Error fetching For You offers:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load offers',
        description: 'Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Scroll to a generation (when clicking history, without refetching)
  const scrollToGeneration = (generationId: string) => {
    setSelectedHistoryId(generationId);
    const element = generationRefs.current[generationId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Initial load
  useEffect(() => {
    if (isReady && user) {
      fetchHistory();
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
        fetchHistory(); // Refresh history
        setSelectedHistoryId(null); // Clear selection (showing latest)
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
  if (loading && !hasOffers && !selectedHistoryId) {
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

  // Main Content
  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="text-center">
        <h2 className="font-riccione text-2xl md:text-3xl text-white flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-[#CBAA5A]" />
          For You
        </h2>
        <p className="font-gilroy text-[#666] text-xs md:text-sm tracking-wide mt-1">
          AI-curated connections based on your interests
        </p>
      </div>

      {/* Prompt Input */}
      <Card className="bg-[#111] border-[#333] overflow-hidden">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-3">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe who you want to meet... (e.g., VCs in India, Senior PMs at Google, Startup founders)"
              className="flex-1 min-h-[80px] md:min-h-[60px] bg-[#0a0a0a] border-[#333] text-white placeholder:text-[#555] font-gilroy text-sm resize-none focus:border-[#CBAA5A]"
              disabled={generating}
            />
            <Button
              onClick={handleGenerate}
              disabled={generating || prompt.trim().length < 10}
              className="md:w-auto w-full bg-white text-black hover:bg-[#CBAA5A] hover:text-black font-gilroy font-bold tracking-wide text-xs h-12 md:h-auto md:px-8 transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  GENERATING...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  GENERATE
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History (Below Prompt) */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-gilroy text-xs font-bold text-[#666] uppercase tracking-widest flex items-center gap-2">
            <History className="h-3 w-3" />
            Recent Searches (click to scroll)
          </h4>
          <div className="flex flex-wrap gap-2">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToGeneration(item.id)}
                className={`px-4 py-2 rounded-full border transition-all font-gilroy text-xs ${
                  selectedHistoryId === item.id 
                    ? 'bg-[#CBAA5A]/20 border-[#CBAA5A] text-[#CBAA5A]' 
                    : 'bg-[#111] border-[#333] text-[#888] hover:border-[#CBAA5A]/50 hover:text-white'
                }`}
              >
                <span className="line-clamp-1 max-w-[200px]">"{item.prompt}"</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Offers - Grouped by Generation */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#CBAA5A]" />
        </div>
      ) : offers.length > 0 ? (
        <div className="space-y-8">
          {/* Group offers by ai_generation_id */}
          {(() => {
            // Group offers by generation ID
            const grouped = offers.reduce((acc, offer) => {
              const genId = offer.ai_generation_id || 'unknown';
              if (!acc[genId]) {
                acc[genId] = [];
              }
              acc[genId].push(offer);
              return acc;
            }, {} as { [key: string]: ForYouOffer[] });
            
            // Get generation IDs in order (most recent first based on first offer's created_at)
            const sortedGenIds = Object.keys(grouped).sort((a, b) => {
              const aDate = grouped[a][0]?.created_at || '';
              const bDate = grouped[b][0]?.created_at || '';
              return bDate.localeCompare(aDate);
            });
            
            return sortedGenIds.map((genId) => {
              const genOffers = grouped[genId];
              const historyItem = history.find(h => h.id === genId);
              const isHighlighted = selectedHistoryId === genId;
              
              return (
                <div 
                  key={genId}
                  ref={(el) => { generationRefs.current[genId] = el; }}
                  className={`space-y-4 p-4 rounded-xl transition-all ${
                    isHighlighted 
                      ? 'bg-[#CBAA5A]/10 border border-[#CBAA5A]/30' 
                      : 'bg-transparent'
                  }`}
                >
                  {/* Generation Header */}
                  {historyItem && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-[#666]" />
                      <span className="font-gilroy text-[#888] italic">
                        "{historyItem.prompt.substring(0, 60)}{historyItem.prompt.length > 60 ? '...' : ''}"
                      </span>
                      <span className="font-gilroy text-[#555] text-xs">
                        • {new Date(historyItem.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  
                  {/* Offers Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {genOffers.map((offer) => (
                      <OfferCard
                        key={offer.id}
                        offer={offer}
                        onClick={() => onViewOffer?.(offer)}
                        onBid={(e) => {
                          e.preventDefault();
                          toast({
                            title: "Demo Feature",
                            description: "Bidding is disabled for AI-generated offers."
                          });
                        }}
                        onBook={(e) => {
                          e.preventDefault();
                          toast({
                            title: "Demo Feature",
                            description: "Booking is disabled for AI-generated offers."
                          });
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-[#333] rounded-2xl bg-[#111]/50">
          <Sparkles className="h-10 w-10 text-[#333] mx-auto mb-4" />
          <h3 className="font-riccione text-xl text-white mb-2">No Offers Yet</h3>
          <p className="font-gilroy text-[#666] text-sm max-w-md mx-auto">
            Describe who you want to meet above, and our AI will find the perfect connections for you.
          </p>
        </div>
      )}
    </div>
  );
};

export default ForYouOffers;

