import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useOffers, Offer } from '@/hooks/useOffers';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EditOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  offer: Offer;
}

const EditOfferModal: React.FC<EditOfferModalProps> = ({ isOpen, onClose, onSuccess, offer }) => {
  const { updateOffer, loading } = useOffers();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: offer.title,
    description: offer.description,
    price: offer.asking_price_inr.toString(),
  });

  // Update form when offer changes
  useEffect(() => {
    setFormData({
      title: offer.title,
      description: offer.description,
      price: offer.asking_price_inr.toString(),
    });
  }, [offer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.title || !formData.description || !formData.price) {
      setError('Please fill in all required fields');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      setError('Please enter a valid price');
      return;
    }

    try {
      await updateOffer(offer.id, {
        title: formData.title,
        description: formData.description,
        asking_price_inr: price,
      });

      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update offer';
      setError(errorMessage);
    }
  };

  const handleClose = () => {
    setFormData({
      title: offer.title,
      description: offer.description,
      price: offer.asking_price_inr.toString(),
    });
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Offer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Offer Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Connect with Google PM"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              {formData.title.length}/100 characters
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe what makes this connection valuable..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Asking Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Asking Price (₹) *</Label>
            <Input
              id="price"
              type="number"
              placeholder="e.g., 5000"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              min="100"
              step="100"
            />
            <p className="text-xs text-muted-foreground">
              Minimum ₹100. Set a fair price for your introduction service.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Offer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditOfferModal;

