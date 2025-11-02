import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useOffers, Offer } from '@/hooks/useOffers';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiGet } from '@/lib/api';
import { Building2, X, ImageIcon, Lightbulb, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

interface EditOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  offer: Offer;
}

interface Organization {
  id: string;
  name: string;
  domain?: string;
  logo_url?: string;
}

const EditOfferModal: React.FC<EditOfferModalProps> = ({ isOpen, onClose, onSuccess, offer }) => {
  const { updateOffer, loading } = useOffers();
  const [error, setError] = useState<string | null>(null);

  // Organization search state
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [orgSearchResults, setOrgSearchResults] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showOrgResults, setShowOrgResults] = useState(false);
  const [orgLoading, setOrgLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Additional organizations
  const [additionalOrgs, setAdditionalOrgs] = useState<Organization[]>([]);
  const [showAdditionalOrgSearch, setShowAdditionalOrgSearch] = useState(false);
  const [additionalOrgQuery, setAdditionalOrgQuery] = useState('');
  const [additionalOrgResults, setAdditionalOrgResults] = useState<Organization[]>([]);
  const additionalSearchRef = useRef<HTMLDivElement>(null);

  // Photo upload state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(offer.offer_photo_url || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: offer.title,
    description: offer.description,
    price: offer.asking_price_inr.toString(),
    targetOrganization: offer.target_organization || '',
    targetPosition: offer.target_position || '',
    targetLogoUrl: offer.target_logo_url || '',
    relationshipType: offer.relationship_type || '',
    relationshipDescription: offer.relationship_description || ''
  });

  // Update form when offer changes
  useEffect(() => {
    setFormData({
      title: offer.title,
      description: offer.description,
      price: offer.asking_price_inr.toString(),
      targetOrganization: offer.target_organization || '',
      targetPosition: offer.target_position || '',
      targetLogoUrl: offer.target_logo_url || '',
      relationshipType: offer.relationship_type || '',
      relationshipDescription: offer.relationship_description || ''
    });
    
    // Set selected org if exists
    if (offer.target_organization) {
      setSelectedOrg({
        id: offer.target_organization,
        name: offer.target_organization,
        logo_url: offer.target_logo_url
      });
    }

    // Set additional orgs if exists
    if (offer.additional_org_logos && Array.isArray(offer.additional_org_logos)) {
      setAdditionalOrgs(offer.additional_org_logos.map((org, index) => ({
        id: `${org.name}-${index}`,
        name: org.name,
        logo_url: org.logo_url
      })));
    }

    // Set photo preview
    setPhotoPreview(offer.offer_photo_url || null);
  }, [offer]);

  // Get existing use cases from offer (cast to any since it might not be in Offer type yet)
  const existingUseCases = (offer as any).use_cases || [];
  const [useCases, setUseCases] = useState<string[]>(existingUseCases);
  const [regeneratingUseCases, setRegeneratingUseCases] = useState(false);

  // Update use cases when offer changes
  useEffect(() => {
    setUseCases((offer as any).use_cases || []);
  }, [offer]);

  // Regenerate use cases when profile fields change
  const regenerateUseCases = async () => {
    // Allow generation even if fields are empty (for existing offers)
    const position = formData.targetPosition || offer.target_position || '';
    const organization = formData.targetOrganization || offer.target_organization || '';
    const description = formData.description || offer.description || '';
    
    if (!organization && !position && !description) {
      alert('Please fill in at least Organization, Position, or Description to generate questions.');
      return;
    }
    
    setRegeneratingUseCases(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session token');

      const { API_BASE_URL } = await import('@/lib/api');
      const response = await fetch(`${API_BASE_URL}/api/offers/${offer.id}/regenerate-use-cases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          position: position,
          organization: organization,
          description: description,
          title: formData.title || offer.title,
          relationshipDescription: formData.relationshipDescription || offer.relationship_description || ''
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to regenerate use cases' }));
        throw new Error(errorData.error || 'Failed to regenerate use cases');
      }

      const { use_cases } = await response.json();
      setUseCases(use_cases || []);
    } catch (error: any) {
      console.error('Error regenerating use cases:', error);
      alert(error.message || 'Failed to generate questions. Please try again.');
    } finally {
      setRegeneratingUseCases(false);
    }
  };

  // Search organizations as user types
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

  // Search additional organizations
  useEffect(() => {
    const searchAdditionalOrgs = async () => {
      if (additionalOrgQuery.trim().length < 2) {
        setAdditionalOrgResults([]);
        return;
      }

      try {
        const data = await apiGet(`/api/organizations/search?q=${encodeURIComponent(additionalOrgQuery)}`);
        setAdditionalOrgResults(data.organizations || []);
      } catch (error) {
        console.error('Error searching additional organizations:', error);
        setAdditionalOrgResults([]);
      }
    };

    const debounceTimer = setTimeout(searchAdditionalOrgs, 300);
    return () => clearTimeout(debounceTimer);
  }, [additionalOrgQuery]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowOrgResults(false);
      }
      if (additionalSearchRef.current && !additionalSearchRef.current.contains(event.target as Node)) {
        setShowAdditionalOrgSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOrg = (org: Organization) => {
    setSelectedOrg(org);
    setFormData({
      ...formData,
      targetOrganization: org.name,
      targetLogoUrl: org.logo_url || ''
    });
    setOrgSearchQuery('');
    setShowOrgResults(false);
  };

  const handleRemoveOrg = () => {
    setSelectedOrg(null);
    setFormData({
      ...formData,
      targetOrganization: '',
      targetLogoUrl: ''
    });
  };

  const handleAddAdditionalOrg = (org: Organization) => {
    if (additionalOrgs.some(o => o.id === org.id) || selectedOrg?.id === org.id) {
      return;
    }
    setAdditionalOrgs([...additionalOrgs, org]);
    setAdditionalOrgQuery('');
    setShowAdditionalOrgSearch(false);
    setAdditionalOrgResults([]);
  };

  const handleRemoveAdditionalOrg = (orgId: string) => {
    setAdditionalOrgs(additionalOrgs.filter(o => o.id !== orgId));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 600;
          
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          }, 'image/jpeg', 0.85);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadPhoto = async (): Promise<string> => {
    if (!photoFile) throw new Error('No photo selected');

    try {
      setUploadingPhoto(true);
      const compressedBlob = await compressImage(photoFile);
      const fileName = `${offer.offer_creator_id}/${Date.now()}.jpg`;
      
      const { data, error } = await supabase.storage
        .from('offer-photos')
        .upload(fileName, compressedBlob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('offer-photos')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    } finally {
      setUploadingPhoto(false);
    }
  };

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
      let photoUrl: string | null = photoPreview;
      
      // Upload new photo if one was selected
      if (photoFile) {
        photoUrl = await uploadPhoto();
      }

      await updateOffer(offer.id, {
        title: formData.title,
        description: formData.description,
        asking_price_inr: price,
        targetOrganization: formData.targetOrganization,
        targetPosition: formData.targetPosition,
        targetLogoUrl: formData.targetLogoUrl,
        relationshipType: formData.relationshipType,
        relationshipDescription: formData.relationshipDescription,
        offerPhotoUrl: photoUrl || undefined,
        additionalOrgLogos: additionalOrgs.map(org => ({
          name: org.name,
          logo_url: org.logo_url || ''
        }))
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
      targetOrganization: offer.target_organization || '',
      targetPosition: offer.target_position || '',
      targetLogoUrl: offer.target_logo_url || '',
      relationshipType: offer.relationship_type || '',
      relationshipDescription: offer.relationship_description || ''
    });
    setSelectedOrg(offer.target_organization ? {
      id: offer.target_organization,
      name: offer.target_organization,
      logo_url: offer.target_logo_url
    } : null);
    setOrgSearchQuery('');
    setOrgSearchResults([]);
    setShowOrgResults(false);
    setAdditionalOrgs(offer.additional_org_logos?.map((org, index) => ({
      id: `${org.name}-${index}`,
      name: org.name,
      logo_url: org.logo_url
    })) || []);
    setAdditionalOrgQuery('');
    setAdditionalOrgResults([]);
    setShowAdditionalOrgSearch(false);
    setPhotoFile(null);
    setPhotoPreview(offer.offer_photo_url || null);
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

          {/* Organization Selection */}
          <div className="space-y-2">
            <Label>Target Organization (Optional)</Label>
            <p className="text-xs text-muted-foreground">
              Where does your connection work?
            </p>

            {selectedOrg ? (
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                {selectedOrg.logo_url && (
                  <img
                    src={selectedOrg.logo_url}
                    alt={selectedOrg.name}
                    className="w-12 h-12 object-contain rounded"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium">{selectedOrg.name}</p>
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
              <div ref={searchRef} className="relative">
                <Input
                  type="text"
                  placeholder="Search for organization (e.g., Google, Microsoft)..."
                  value={orgSearchQuery}
                  onChange={(e) => setOrgSearchQuery(e.target.value)}
                />
                {orgLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  </div>
                )}
                {showOrgResults && orgSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {orgSearchResults.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => handleSelectOrg(org)}
                        className="w-full px-4 py-2 text-left hover:bg-accent flex items-center gap-3 border-b last:border-b-0"
                      >
                        {org.logo_url && (
                          <img
                            src={org.logo_url}
                            alt={org.name}
                            className="w-8 h-8 object-contain rounded"
                          />
                        )}
                        <div>
                          <div className="font-medium">{org.name}</div>
                          {org.domain && (
                            <div className="text-xs text-muted-foreground">{org.domain}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Target Position */}
          {selectedOrg && (
            <div className="space-y-2">
              <Label htmlFor="targetPosition">Position/Role (Optional)</Label>
              <Input
                id="targetPosition"
                placeholder="e.g., Senior Product Manager"
                value={formData.targetPosition}
                onChange={(e) => setFormData({ ...formData, targetPosition: e.target.value })}
                maxLength={100}
              />
            </div>
          )}

          {/* Relationship Type */}
          <div className="space-y-2">
            <Label htmlFor="relationshipType">Your Relationship (Optional)</Label>
            <Select
              value={formData.relationshipType}
              onValueChange={(value) => setFormData({ ...formData, relationshipType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select relationship type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="colleague">Colleague</SelectItem>
                <SelectItem value="friend">Friend</SelectItem>
                <SelectItem value="mentor">Mentor</SelectItem>
                <SelectItem value="classmate">Classmate</SelectItem>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Relationship Description */}
          <div className="space-y-2">
            <Label htmlFor="relationshipDescription">Relationship Details (Optional)</Label>
            <Textarea
              id="relationshipDescription"
              placeholder="e.g., Worked together at Google for 3 years on the Maps team..."
              value={formData.relationshipDescription}
              onChange={(e) => setFormData({ ...formData, relationshipDescription: e.target.value })}
              rows={2}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              {formData.relationshipDescription.length}/200 characters
            </p>
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label htmlFor="photo">Photo with Connection (Optional)</Label>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              
              {photoPreview ? (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-primary">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 border-2 border-dashed border-muted-foreground rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Add Photo</span>
                </button>
              )}

              <div className="flex-1 text-sm text-muted-foreground">
                <p className="mb-1">Upload a photo of you with the connection</p>
                <p className="text-xs">This builds trust and makes your offer more personal</p>
              </div>
            </div>
          </div>

          {/* Additional Organizations */}
          <div className="space-y-2">
            <Label>Additional Organizations (Optional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Add logos of other companies you can connect to - makes your offer more attractive!
            </p>

            {additionalOrgs.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {additionalOrgs.map((org) => (
                  <div
                    key={org.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg"
                  >
                    {org.logo_url && (
                      <img
                        src={org.logo_url}
                        alt={org.name}
                        className="w-5 h-5 object-contain rounded"
                      />
                    )}
                    <span className="text-sm">{org.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAdditionalOrg(org.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showAdditionalOrgSearch ? (
              <div ref={additionalSearchRef} className="relative">
                <Input
                  type="text"
                  placeholder="Search for organizations (e.g., Google, Microsoft)..."
                  value={additionalOrgQuery}
                  onChange={(e) => setAdditionalOrgQuery(e.target.value)}
                  autoFocus
                />
                {additionalOrgResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {additionalOrgResults.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => handleAddAdditionalOrg(org)}
                        className="w-full px-4 py-2 text-left hover:bg-accent flex items-center gap-3 border-b last:border-b-0"
                      >
                        {org.logo_url && (
                          <img
                            src={org.logo_url}
                            alt={org.name}
                            className="w-8 h-8 object-contain rounded"
                          />
                        )}
                        <div>
                          <div className="font-medium">{org.name}</div>
                          {org.domain && (
                            <div className="text-xs text-muted-foreground">{org.domain}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdditionalOrgSearch(true)}
                className="w-full"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Add Organization Logo
              </Button>
            )}
          </div>

          {/* Use Cases / Example Questions */}
          <div className="space-y-3 p-4 bg-muted rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                <Label className="text-base font-semibold">Questions You Can Ask</Label>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={regenerateUseCases}
                disabled={regeneratingUseCases || (!formData.targetOrganization && !formData.targetPosition && !formData.description && !offer.target_organization && !offer.target_position && !offer.description)}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${regeneratingUseCases ? 'animate-spin' : ''}`} />
                {useCases.length > 0 ? 'Regenerate' : 'Generate'}
              </Button>
            </div>
            {useCases && useCases.length > 0 ? (
              <>
                <div className="space-y-2">
                  {useCases.map((useCase, index) => (
                    <div
                      key={index}
                      className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800"
                    >
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5 flex-shrink-0">
                          {index + 1}
                        </Badge>
                        <p className="text-sm flex-1">{useCase}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  These are AI-generated example questions based on the target's profile. Click "Regenerate" if you've updated the organization, position, or description.
                </p>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm mb-2">No questions generated yet.</p>
                <p className="text-xs">Fill in organization, position, or description and click "Generate" to create example questions.</p>
              </div>
            )}
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

