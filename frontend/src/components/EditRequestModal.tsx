import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Building2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiGet } from '@/lib/api';
import { convertAndFormatINR, usdToInr } from '@/lib/currency';
import { ConnectionRequest } from '@/hooks/useRequests';
import { getSessionStrict } from '@/lib/authSession';

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  domain: string;
}

interface EditRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ConnectionRequest;
  onUpdate: (updatedRequest: ConnectionRequest) => void;
}

export default function EditRequestModal({ isOpen, onClose, request, onUpdate }: EditRequestModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(request.message || '');
  const [targetCashReward, setTargetCashReward] = useState(Math.round(usdToInr(request.reward)));
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(request.target_organization || null);
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [orgSearchResults, setOrgSearchResults] = useState<Organization[]>([]);
  const [showOrgResults, setShowOrgResults] = useState(false);
  const [orgLoading, setOrgLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Reset form when request changes
  useEffect(() => {
    setMessage(request.message || '');
    setTargetCashReward(Math.round(usdToInr(request.reward)));
    setSelectedOrg(request.target_organization || null);
  }, [request]);

  // Search organizations
  useEffect(() => {
    const searchOrganizations = async () => {
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

    const debounceTimer = setTimeout(searchOrganizations, 300);
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

  const handleSelectOrg = (org: Organization) => {
    setSelectedOrg(org);
    setOrgSearchQuery('');
    setShowOrgResults(false);
  };

  const handleRemoveOrg = () => {
    setSelectedOrg(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const session = await getSessionStrict();

      const response = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message,
          target_cash_reward: Math.round(targetCashReward / 83), // Convert back to USD
          target_organization_id: selectedOrg?.id || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update request');
      }

      const { request: updatedRequest } = await response.json();

      // Format the updated request with organization data
      const formattedRequest: ConnectionRequest = {
        ...request,
        message: updatedRequest.message,
        reward: updatedRequest.target_cash_reward || updatedRequest.reward,
        target_organization_id: updatedRequest.target_organization_id,
        target_organization: selectedOrg,
        updatedAt: updatedRequest.updated_at
      };

      onUpdate(formattedRequest);
      toast({
        title: 'Request Updated',
        description: 'Your connection request has been updated successfully.'
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update request',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Connection Request</DialogTitle>
          <DialogDescription>
            Update your request details. Changes will be visible to all participants.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Target (read-only) */}
          <div className="space-y-2">
            <Label>Target (cannot be changed)</Label>
            <Input value={request.target} disabled className="bg-muted" />
          </div>

          {/* Organization Search */}
          <div className="space-y-2">
            <Label htmlFor="organization">Target Organization</Label>
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
                  id="organization"
                  placeholder="Search for an organization..."
                  value={orgSearchQuery}
                  onChange={(e) => setOrgSearchQuery(e.target.value)}
                  onFocus={() => orgSearchQuery.length >= 2 && setShowOrgResults(true)}
                />
                {showOrgResults && orgSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {orgSearchResults.map((org) => (
                      <div
                        key={org.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => handleSelectOrg(org)}
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
              </div>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Add a message to your request..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/1000 characters
            </p>
          </div>

          {/* Target Cash Reward */}
          <div className="space-y-2">
            <Label htmlFor="reward">Target Cash Reward (₹)</Label>
            <Input
              id="reward"
              type="number"
              min={Math.round(usdToInr(10))}
              max={Math.round(usdToInr(10000))}
              value={targetCashReward}
              onChange={(e) => setTargetCashReward(parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Cash paid to the target person when connection is made
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
