import React, { useState, useEffect } from 'react';
import { useOffers, Offer } from '@/hooks/useOffers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Plus, TrendingUp, Eye, Users, DollarSign, Heart, Edit, Building2, Image } from 'lucide-react';
import { convertAndFormatINR } from '@/lib/currency';
import CreateOfferModal from './CreateOfferModal';
import EditOfferModal from './EditOfferModal';
import OfferBidsPanel from './OfferBidsPanel';

const OffersTab: React.FC = () => {
  const { getMyOffers, loading } = useOffers();
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Offers</CardTitle>
              <CardDescription>
                Manage offers for your first-degree connections
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Offer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading your offers...</p>
            </div>
          ) : offers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No offers yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first offer to connect others with your network
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Offer
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
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg line-clamp-2 mb-1">
                            {offer.title}
                          </h3>
                          {getStatusBadge(offer.status)}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
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
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <div className="flex -space-x-2">
                          <Avatar className="h-10 w-10 border-2 border-background">
                            <AvatarImage src={offer.connection?.avatar_url} />
                            <AvatarFallback>
                              <Users className="w-5 h-5" />
                            </AvatarFallback>
                          </Avatar>
                          {(offer as any).target_logo_url && (
                            <Avatar className="h-10 w-10 border-2 border-background">
                              <AvatarImage src={(offer as any).target_logo_url} alt="Organization" />
                              <AvatarFallback>
                                <Building2 className="w-5 h-5" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {offer.connection?.first_name} {offer.connection?.last_name}
                          </p>
                          {(offer as any).target_position && (offer as any).target_organization && (
                            <p className="text-xs text-muted-foreground truncate">
                              {(offer as any).target_position} at {(offer as any).target_organization}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {offer.description}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Heart className="w-4 h-4" />
                            <span>{offer.likes_count || 0}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>{offer.bids_count || 0} bids</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-primary font-semibold">
                          <DollarSign className="w-4 h-4" />
                          <span>₹{offer.asking_price_inr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                          View Details
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
                            View {offer.bids_count} {offer.bids_count === 1 ? 'Bid' : 'Bids'}
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

