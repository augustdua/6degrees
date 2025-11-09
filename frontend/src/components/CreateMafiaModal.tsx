import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMafias } from '@/hooks/useMafias';
import { Loader2, Upload, Crown } from 'lucide-react';

interface CreateMafiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (mafiaId: string) => void;
}

export const CreateMafiaModal: React.FC<CreateMafiaModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast();
  const { createMafia } = useMafias();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cover_image_url: '',
    monthly_price: 10,
    founding_member_limit: 10,
  });

  const [loading, setLoading] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'monthly_price' || name === 'founding_member_limit' 
        ? parseFloat(value) || 0 
        : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.description) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a name and description for your mafia',
        variant: 'destructive',
      });
      return;
    }

    if (formData.monthly_price < 0) {
      toast({
        title: 'Invalid Price',
        description: 'Monthly price must be non-negative',
        variant: 'destructive',
      });
      return;
    }

    if (formData.founding_member_limit < 1 || formData.founding_member_limit > 50) {
      toast({
        title: 'Invalid Limit',
        description: 'Founding member limit must be between 1 and 50',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const mafia = await createMafia(formData);

      toast({
        title: 'Mafia Created! 🎉',
        description: `${mafia.name} is now live. Start inviting founding members!`,
      });

      // Reset form
      setFormData({
        name: '',
        description: '',
        cover_image_url: '',
        monthly_price: 10,
        founding_member_limit: 10,
      });

      onClose();
      
      if (onSuccess) {
        onSuccess(mafia.id);
      }
    } catch (error: any) {
      toast({
        title: 'Failed to Create Mafia',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            Create a New Mafia
          </DialogTitle>
          <DialogDescription>
            Create a subscription-based professional community. Founding members earn
            revenue share from paid subscriptions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Mafia Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g., IIT Alum Mafia, Crypto Traders Mafia"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe what this mafia is about, who can join, and what value members get..."
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              required
            />
          </div>

          {/* Cover Image URL */}
          <div className="space-y-2">
            <Label htmlFor="cover_image_url">Cover Image URL (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="cover_image_url"
                name="cover_image_url"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={formData.cover_image_url}
                onChange={handleInputChange}
              />
              <Button type="button" variant="outline" size="icon" disabled>
                <Upload className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Direct image upload coming soon. For now, use an external URL.
            </p>
          </div>

          {/* Monthly Price */}
          <div className="space-y-2">
            <Label htmlFor="monthly_price">
              Monthly Subscription Price (USD) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="monthly_price"
              name="monthly_price"
              type="number"
              min="0"
              step="0.01"
              placeholder="10.00"
              value={formData.monthly_price}
              onChange={handleInputChange}
              required
            />
            <p className="text-xs text-muted-foreground">
              Revenue is split equally among founding members
            </p>
          </div>

          {/* Founding Member Limit */}
          <div className="space-y-2">
            <Label htmlFor="founding_member_limit">
              Founding Member Limit <span className="text-red-500">*</span>
            </Label>
            <Input
              id="founding_member_limit"
              name="founding_member_limit"
              type="number"
              min="1"
              max="50"
              placeholder="10"
              value={formData.founding_member_limit}
              onChange={handleInputChange}
              required
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of founding members (including you). Max: 50
            </p>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Mafia'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

