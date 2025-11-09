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
import { Loader2, Upload, Crown, Search, Building2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { searchOrganizations } from '@/lib/api';

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
    organization_id: '',
    monthly_price_usd: 10,
    monthly_price_inr: 800,
    currency: 'USD' as 'USD' | 'INR',
    founding_members_limit: 10,
  });

  const [loading, setLoading] = useState(false);
  const [orgSearch, setOrgSearch] = useState('');
  const [orgResults, setOrgResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ['monthly_price_usd', 'monthly_price_inr', 'founding_members_limit'].includes(name)
        ? parseFloat(value) || 0 
        : value,
    }));
  };

  const handleOrgSearch = async () => {
    if (!orgSearch.trim()) {
      toast({
        title: 'Enter Organization Name',
        description: 'Please enter an organization name to search',
        variant: 'destructive',
      });
      return;
    }

    setSearching(true);
    try {
      const results = await searchOrganizations(orgSearch);
      setOrgResults(results || []);
      
      if (!results || results.length === 0) {
        toast({
          title: 'No Results',
          description: 'No organizations found. Try a different search term.',
        });
      }
    } catch (error) {
      toast({
        title: 'Search Failed',
        description: 'Failed to search organizations',
        variant: 'destructive',
      });
    } finally {
      setSearching(false);
    }
  };

  const handleSelectOrg = (org: any) => {
    setSelectedOrg(org);
    setFormData((prev) => ({
      ...prev,
      organization_id: org.id,
    }));
    setOrgResults([]);
    setOrgSearch('');
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

    if (formData.monthly_price_usd < 0 || formData.monthly_price_inr < 0) {
      toast({
        title: 'Invalid Price',
        description: 'Monthly prices must be non-negative',
        variant: 'destructive',
      });
      return;
    }

    if (formData.founding_members_limit < 1 || formData.founding_members_limit > 10) {
      toast({
        title: 'Invalid Limit',
        description: 'Founding member limit must be between 1 and 10',
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
        organization_id: '',
        monthly_price_usd: 10,
        monthly_price_inr: 800,
        currency: 'USD',
        founding_members_limit: 10,
      });
      setSelectedOrg(null);
      setOrgSearch('');
      setOrgResults([]);

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

          {/* Organization Search for Cover Logo */}
          <div className="space-y-2">
            <Label>Cover Image (Organization Logo)</Label>
            {selectedOrg ? (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                {selectedOrg.logo_url && (
                  <img 
                    src={selectedOrg.logo_url} 
                    alt={selectedOrg.name}
                    className="w-12 h-12 rounded object-contain bg-white"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium">{selectedOrg.name}</p>
                  <p className="text-xs text-muted-foreground">Selected as cover</p>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelectedOrg(null);
                    setFormData(prev => ({ ...prev, organization_id: '' }));
                  }}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search for organization..."
                    value={orgSearch}
                    onChange={(e) => setOrgSearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleOrgSearch())}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleOrgSearch}
                    disabled={searching}
                  >
                    {searching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                {orgResults.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {orgResults.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => handleSelectOrg(org)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                      >
                        {org.logo_url ? (
                          <img 
                            src={org.logo_url} 
                            alt={org.name}
                            className="w-10 h-10 rounded object-contain bg-white border"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{org.name}</p>
                          {org.domain && (
                            <p className="text-xs text-muted-foreground">{org.domain}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Search for an organization to use its logo as the mafia cover image
                </p>
              </>
            )}
          </div>

          {/* Currency Selection */}
          <div className="space-y-2">
            <Label>Primary Currency <span className="text-red-500">*</span></Label>
            <Select
              value={formData.currency}
              onValueChange={(value: 'USD' | 'INR') => 
                setFormData(prev => ({ ...prev, currency: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">🇺🇸 USD (US Dollar)</SelectItem>
                <SelectItem value="INR">🇮🇳 INR (Indian Rupee)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The currency for subscription payments
            </p>
          </div>

          {/* Monthly Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthly_price_usd">
                Price in USD <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="monthly_price_usd"
                  name="monthly_price_usd"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="10.00"
                  value={formData.monthly_price_usd}
                  onChange={handleInputChange}
                  className="pl-7"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly_price_inr">
                Price in INR <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="monthly_price_inr"
                  name="monthly_price_inr"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="800"
                  value={formData.monthly_price_inr}
                  onChange={handleInputChange}
                  className="pl-7"
                  required
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            💰 Revenue is split equally among all founding members
          </p>

          {/* Founding Member Limit */}
          <div className="space-y-2">
            <Label htmlFor="founding_members_limit">
              Founding Member Limit <span className="text-red-500">*</span>
            </Label>
            <Input
              id="founding_members_limit"
              name="founding_members_limit"
              type="number"
              min="1"
              max="10"
              placeholder="10"
              value={formData.founding_members_limit}
              onChange={handleInputChange}
              required
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of founding members (including you). Max: 10
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

