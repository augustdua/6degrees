import React, { useState, useEffect } from 'react';
import { useOffers, Offer } from '@/hooks/useOffers';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Plus, TrendingUp, Eye, Users, DollarSign, Heart, Edit, Building2, Image } from 'lucide-react';
import { convertAndFormatINR, formatOfferPrice } from '@/lib/currency';
import CreateOfferModal from './CreateOfferModal';
import EditOfferModal from './EditOfferModal';
import OfferBidsPanel from './OfferBidsPanel';

const OffersTab: React.FC = () => {
  const { getMyOffers, loading } = useOffers();
  const { userCurrency } = useCurrency();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBidsPanel, setShowBidsPanel] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);

  const loadOffers = async () => {
    try {
      const data = await getMyOffers();
      setOffers(data || []);
    } catch (error) {
      console.error('Error loading offers:', error);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: 'Active', variant: 'default' },
      paused: { label: 'Paused', variant: 'secondary' },
      deleted: { label: 'Deleted', variant: 'destructive' },
      draft: { label: 'Draft', variant: 'outline' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <CardTitle>My Offers</CardTitle>
              <CardDescription>
                Manage offers for your first-degree connections
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Create Offer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#666]">LOADING YOUR OFFERS...</p>
            </div>
          ) : offers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-gilroy tracking-[0.15em] uppercase text-sm text-white mb-2">NO OFFERS YET</h3>
              <p className="text-[#666] font-gilroy tracking-[0.1em] uppercase text-[10px] mb-6">
                CREATE YOUR FIRST OFFER TO CONNECT OTHERS WITH YOUR NETWORK
              </p>
              <Button onClick={() => setShowCreateModal(true)} className="bg-[#CBAA5A] text-black hover:bg-white font-gilroy tracking-[0.15em] uppercase text-[10px]">
                <Plus className="w-4 h-4 mr-2" />
                CREATE OFFER
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {offers.map((offer) => (
                <Card key={offer.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Header with status and edit button */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-gilroy tracking-[0.1em] uppercase text-[11px] text-white line-clamp-2 mb-1">
                            {offer.title}
                          </h3>
                          {getStatusBadge(offer.status)}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-shrink-0"
                          onClick={() => {
                            setEditingOffer(offer);
                            setShowEditModal(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Offer Photo if exists */}
                      {(offer as any).offer_photo_url && (
                        <div className="relative w-full h-32 rounded-lg overflow-hidden bg-muted">
                          <img
                            src={(offer as any).offer_photo_url}
                            alt="Offer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Connection info with organization logo */}
                      <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-muted rounded-lg">
                        <div className="flex -space-x-2 flex-shrink-0">
                          <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-background">
                            <AvatarImage src={offer.connection?.avatar_url} />
                            <AvatarFallback>
                              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                            </AvatarFallback>
                          </Avatar>
                          {(offer as any).target_logo_url && (
                            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-background">
                              <AvatarImage src={(offer as any).target_logo_url} alt="Organization" />
                              <AvatarFallback>
                                <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-gilroy tracking-[0.1em] uppercase text-[10px] text-white truncate">
                            {offer.connection?.first_name} {offer.connection?.last_name}
                          </p>
                          {(offer as any).target_position && (offer as any).target_organization && (
                            <p className="font-gilroy tracking-[0.1em] uppercase text-[9px] text-[#666] truncate">
                              {(offer as any).target_position} AT {(offer as any).target_organization}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="font-gilroy tracking-[0.05em] uppercase text-[9px] text-[#888] line-clamp-3 leading-relaxed">
                        {offer.description}
                      </p>

                      {/* Additional Organization Logos */}
                      {(offer as any).additional_org_logos && Array.isArray((offer as any).additional_org_logos) && (offer as any).additional_org_logos.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <p className="font-gilroy tracking-[0.15em] uppercase text-[8px] text-[#666]">ALSO CONNECTS TO:</p>
                          <div className="flex flex-wrap gap-2">
                            {(offer as any).additional_org_logos.map((org: { name: string; logo_url: string }, index: number) => (
                              <div key={index} className="flex items-center gap-2 px-2 py-1 bg-[#111] border border-[#222] rounded-md">
                                {org.logo_url && (
                                  <img
                                    src={org.logo_url}
                                    alt={org.name}
                                    className="w-5 h-5 object-contain rounded"
                                  />
                                )}
                                <span className="font-gilroy tracking-[0.1em] uppercase text-[8px] text-white">{org.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-[#222]">
                        <div className="flex items-center gap-2 sm:gap-4">
                          <div className="flex items-center gap-1 text-[#666]">
                            <Heart className="w-3 h-3" />
                            <span className="font-gilroy tracking-[0.1em] uppercase text-[9px]">{offer.likes_count || 0}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[#666]">
                            <Users className="w-3 h-3" />
                            <span className="font-gilroy tracking-[0.1em] uppercase text-[9px]">{offer.bids_count || 0}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[#CBAA5A]">
                          <DollarSign className="w-3 h-3" />
                          <span className="font-gilroy tracking-[0.1em] uppercase text-[10px] truncate max-w-[100px]">{formatOfferPrice(offer, userCurrency)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            // TODO: Navigate to offer details
                            console.log('View offer:', offer.id);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">View Details</span>
                          <span className="sm:hidden">View</span>
                        </Button>
                        {offer.bids_count && offer.bids_count > 0 && (
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setSelectedOffer(offer);
                              setShowBidsPanel(true);
                            }}
                          >
                            <span className="hidden sm:inline">View {offer.bids_count} {offer.bids_count === 1 ? 'Bid' : 'Bids'}</span>
                            <span className="sm:hidden">{offer.bids_count} {offer.bids_count === 1 ? 'Bid' : 'Bids'}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Offer Modal */}
      <CreateOfferModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          loadOffers();
        }}
      />

      {/* Bids Management Panel */}
      {selectedOffer && (
        <OfferBidsPanel
          isOpen={showBidsPanel}
          onClose={() => {
            setShowBidsPanel(false);
            setSelectedOffer(null);
          }}
          offerId={selectedOffer.id}
          offerTitle={selectedOffer.title}
          onBidAccepted={() => {
            // Refresh offers to update bid counts
            loadOffers();
          }}
        />
      )}

      {/* Edit Offer Modal */}
      {editingOffer && (
        <EditOfferModal
          isOpen={showEditModal}
          offer={editingOffer}
          onClose={() => {
            setShowEditModal(false);
            setEditingOffer(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingOffer(null);
            loadOffers();
          }}
        />
      )}
    </div>
  );
};

export default OffersTab;

