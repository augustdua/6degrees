import React, { useState, useEffect, useRef } from 'react';
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
import { useMafias, type Mafia } from '@/hooks/useMafias';
import { Loader2, X, Building2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiGet } from '@/lib/api';

interface EditMafiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  mafia: Mafia;
  onSuccess?: () => void;
}

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  domain: string;
}

export const EditMafiaModal: React.FC<EditMafiaModalProps> = ({
  isOpen,
  onClose,
  mafia,
  onSuccess,
}) => {
  const { toast } = useToast();
  const { updateMafia } = useMafias();

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    organization_id: string;
    monthly_price_usd: number | '';
    monthly_price_inr: number | '';
    currency: 'USD' | 'INR';
  }>({
    name: mafia.name,
    description: mafia.description,
    organization_id: mafia.organization_id || '',
    monthly_price_usd: mafia.monthly_price_usd,
    monthly_price_inr: mafia.monthly_price_inr,
    currency: mafia.currency as 'USD' | 'INR',
  });

  const [loading, setLoading] = useState(false);
  
  // Organization search state
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [orgSearchResults, setOrgSearchResults] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(mafia.organization || null);
  const [showOrgResults, setShowOrgResults] = useState(false);
  const [orgLoading, setOrgLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Reset form when mafia changes
  useEffect(() => {
    setFormData({
      name: mafia.name,
      description: mafia.description,
      organization_id: mafia.organization_id || '',
      monthly_price_usd: mafia.monthly_price_usd,
      monthly_price_inr: mafia.monthly_price_inr,
      currency: mafia.currency as 'USD' | 'INR',
    });
    setSelectedOrg(mafia.organization || null);
  }, [mafia]);

  // Search organizations as user types (debounced)
  useEffect(() => {
    const searchOrgs = async () => {
      if (orgSearchQuery.trim().length < 2) {
        setOrgSearchResults([]);
        return;
      }

      setOrgLoading(true);
      try {
        const data = await apiGet(`/api/organizations/search?q=${encodeURIComponent(orgSearchQuery)}`);
        setOrgSearchResults(data.organizations || []);
        setShowOrgResults(true);
      } catch (error) {
        console.error('Error searching organizations:', error);
        setOrgSearchResults([]);
      } finally {
        setOrgLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchOrgs, 300);
    return () => clearTimeout(debounceTimer);
  }, [orgSearchQuery]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowOrgResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    // For number inputs, allow empty string or parse to number
    if (['monthly_price_usd', 'monthly_price_inr'].includes(name)) {
      setFormData((prev) => ({
        ...prev,
        [name]: value === '' ? '' : parseFloat(value) || 0,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSelectOrg = (org: Organization) => {
    setSelectedOrg(org);
    setFormData((prev) => ({
      ...prev,
      organization_id: org.id,
    }));
    setOrgSearchQuery('');
    setShowOrgResults(false);
  };

  const handleRemoveOrg = () => {
    setSelectedOrg(null);
    setFormData((prev) => ({
      ...prev,
      organization_id: '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.description) {
      toast({
        title: 'Required Fields',
        description: 'Name and description are required',
        variant: 'destructive',
      });
      return;
    }

    // Convert empty strings to numbers for validation
    const priceUsd = typeof formData.monthly_price_usd === 'string' ? 0 : formData.monthly_price_usd;
    const priceInr = typeof formData.monthly_price_inr === 'string' ? 0 : formData.monthly_price_inr;

    if (priceUsd < 0 || priceInr < 0) {
      toast({
        title: 'Invalid Price',
        description: 'Monthly prices must be non-negative',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Prepare data with proper number types
      const submitData = {
        name: formData.name,
        description: formData.description,
        organization_id: formData.organization_id || null,
        monthly_price_usd: priceUsd,
        monthly_price_inr: priceInr,
        currency: formData.currency,
      };
      
      await updateMafia(mafia.id, submitData);

      toast({
        title: 'Mafia Updated! ✨',
        description: `${formData.name} has been updated successfully.`,
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update mafia',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Mafia</DialogTitle>
          <DialogDescription>
            Update your mafia's details. Changes will be visible to all members.
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
              placeholder="e.g., Ex-IIT Alum Mafia"
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
              placeholder="Describe what this mafia is about..."
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
              <Avatar className="h-10 w-10">
                {selectedOrg.logo_url ? (
                  <AvatarImage src={selectedOrg.logo_url} alt={selectedOrg.name} />
                ) : (
                  <AvatarFallback>
                    <Building2 className="h-5 w-5" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{selectedOrg.name}</p>
                <p className="text-sm text-muted-foreground">{selectedOrg.domain}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveOrg}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="relative" ref={searchRef}>
              <Input
                placeholder="Search for organization (e.g., Google, Microsoft)"
                value={orgSearchQuery}
                onChange={(e) => setOrgSearchQuery(e.target.value)}
                onFocus={() => orgSearchResults.length > 0 && setShowOrgResults(true)}
              />
              
              {/* Search Results Dropdown */}
              {showOrgResults && orgSearchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {orgSearchResults.map((org) => (
                    <div
                      key={org.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectOrg(org);
                      }}
                    >
                      <Avatar className="h-10 w-10">
                        {org.logo_url ? (
                          <AvatarImage src={org.logo_url} alt={org.name} />
                        ) : (
                          <AvatarFallback>
                            <Building2 className="h-5 w-5" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-sm text-muted-foreground">{org.domain}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {orgLoading && (
                <p className="text-sm text-muted-foreground mt-1">Searching...</p>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Company or organization logo for the mafia cover image
          </p>
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

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Mafia
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


