import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOffers } from '@/hooks/useOffers';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Building2, X, Upload, Image as ImageIcon } from 'lucide-react';
import { apiGet } from '@/lib/api';

interface CreateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Connection {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  company?: string;
  role?: string;
}

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  domain: string;
}

const CreateOfferModal: React.FC<CreateOfferModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { createOffer, loading } = useOffers();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Organization search state
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [orgSearchResults, setOrgSearchResults] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showOrgResults, setShowOrgResults] = useState(false);
  const [orgLoading, setOrgLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    connectionUserId: '',
    price: '',
    targetOrganization: '',
    targetPosition: '',
    targetLogoUrl: '',
    relationshipType: '',
    relationshipDescription: ''
  });

  // Photo upload state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Additional organizations (just logos for visual appeal)
  const [additionalOrgs, setAdditionalOrgs] = useState<Organization[]>([]);
  const [showAdditionalOrgSearch, setShowAdditionalOrgSearch] = useState(false);
  const [additionalOrgQuery, setAdditionalOrgQuery] = useState('');
  const [additionalOrgResults, setAdditionalOrgResults] = useState<Organization[]>([]);
  const additionalSearchRef = useRef<HTMLDivElement>(null);

  // Load user's connections
  useEffect(() => {
    if (isOpen && user) {
      loadConnections();
    }
  }, [isOpen, user]);

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

  // Search additional organizations as user types
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
    // Don't add if already selected or if it's the primary org
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

  const loadConnections = async () => {
    if (!user) return;

    setLoadingConnections(true);
    try {
      // Get user's connections from user_connections table
      const { data, error } = await supabase
        .from('user_connections')
        .select(`
          user1_id,
          user2_id,
          user1:users!user_connections_user1_id_fkey(
            id,
            first_name,
            last_name,
            avatar_url,
            company,
            role
          ),
          user2:users!user_connections_user2_id_fkey(
            id,
            first_name,
            last_name,
            avatar_url,
            company,
            role
          )
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('status', 'connected');

      if (error) throw error;

      // Extract the connected user (not the current user)
      const connectedUsers: Connection[] = data.map((conn: any) => {
        const connectedUser = conn.user1_id === user.id ? conn.user2 : conn.user1;
        return {
          id: connectedUser.id,
          first_name: connectedUser.first_name,
          last_name: connectedUser.last_name,
          avatar_url: connectedUser.avatar_url,
          company: connectedUser.company,
          role: connectedUser.role
        };
      });

      setConnections(connectedUsers);
    } catch (err) {
      console.error('Error loading connections:', err);
      setError('Failed to load your connections');
    } finally {
      setLoadingConnections(false);
    }
  };

  // Resize and compress image
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Calculate new dimensions (max 800x600 while maintaining aspect ratio)
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = (height * MAX_WIDTH) / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = (width * MAX_HEIGHT) / height;
              height = MAX_HEIGHT;
            }
          }

          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob with compression (0.85 quality)
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              
              // Create new File from blob
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              
              resolve(compressedFile);
            },
            'image/jpeg',
            0.85
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Handle photo selection
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    try {
      // Compress the image (handles large screenshots automatically)
      const compressedFile = await compressImage(file);
      
      console.log(`Original: ${(file.size / 1024).toFixed(0)}KB → Compressed: ${(compressedFile.size / 1024).toFixed(0)}KB`);

      setPhotoFile(compressedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      console.error('Error compressing image:', err);
      setError('Failed to process image. Please try another file.');
    }
  };

  // Upload photo to Supabase storage
  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile || !user) return null;

    setUploadingPhoto(true);
    try {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('offer-photos')
        .upload(fileName, photoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('offer-photos')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading photo:', err);
      throw new Error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.title || !formData.description || !formData.connectionUserId || !formData.price || 
        !formData.targetOrganization || !formData.targetPosition || !formData.relationshipType) {
      setError('Please fill in all required fields');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      setError('Please enter a valid price');
      return;
    }

    try {
      // Upload photo first if selected
      let photoUrl: string | null = null;
      if (photoFile) {
        photoUrl = await uploadPhoto();
      }

      await createOffer({
        title: formData.title,
        description: formData.description,
        connectionUserId: formData.connectionUserId,
        price,
        targetOrganization: formData.targetOrganization,
        targetPosition: formData.targetPosition,
        targetLogoUrl: formData.targetLogoUrl,
        relationshipType: formData.relationshipType,
        relationshipDescription: formData.relationshipDescription,
        offerPhotoUrl: photoUrl || undefined,
        additionalOrgLogos: additionalOrgs.map(org => ({
          name: org.name,
          logo_url: org.logo_url
        }))
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        connectionUserId: '',
        price: '',
        targetOrganization: '',
        targetPosition: '',
        targetLogoUrl: '',
        relationshipType: '',
        relationshipDescription: ''
      });

      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create offer';
      setError(errorMessage);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      connectionUserId: '',
      price: '',
      targetOrganization: '',
      targetPosition: '',
      targetLogoUrl: '',
      relationshipType: '',
      relationshipDescription: ''
    });
    setSelectedOrg(null);
    setOrgSearchQuery('');
    setOrgSearchResults([]);
    setShowOrgResults(false);
    setAdditionalOrgs([]);
    setAdditionalOrgQuery('');
    setAdditionalOrgResults([]);
    setShowAdditionalOrgSearch(false);
    setPhotoFile(null);
    setPhotoPreview(null);
    setError(null);
    onClose();
  };

  const selectedConnection = connections.find(c => c.id === formData.connectionUserId);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Offer</DialogTitle>
          <DialogDescription>
            Offer to connect someone to one of your first-degree connections
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Connection Selection */}
          <div className="space-y-2">
            <Label htmlFor="connection">Who do you want to offer? *</Label>
            {loadingConnections ? (
              <div className="text-sm text-muted-foreground">Loading your connections...</div>
            ) : connections.length === 0 ? (
              <Alert>
                <AlertDescription>
                  You don't have any connections yet. Connect with people first to create offers.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Select
                  value={formData.connectionUserId}
                  onValueChange={(value) => setFormData({ ...formData, connectionUserId: value })}
                >
                  <SelectTrigger id="connection">
                    <SelectValue placeholder="Select a connection" />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map((connection) => (
                      <SelectItem key={connection.id} value={connection.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={connection.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {connection.first_name?.[0]}{connection.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            {connection.first_name} {connection.last_name}
                            {connection.company && (
                              <span className="text-muted-foreground text-xs ml-2">
                                • {connection.role} at {connection.company}
                              </span>
                            )}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Selected connection preview */}
                {selectedConnection && (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg mt-2">
                    <Avatar>
                      <AvatarImage src={selectedConnection.avatar_url} />
                      <AvatarFallback>
                        <Users className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {selectedConnection.first_name} {selectedConnection.last_name}
                      </p>
                      {selectedConnection.company && (
                        <p className="text-sm text-muted-foreground">
                          {selectedConnection.role} at {selectedConnection.company}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Offer Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Connect with VP of Engineering at Google"
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
              placeholder="Describe what makes this connection valuable and what kind of conversations they're open to..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Target Organization */}
          <div className="space-y-2">
            <Label htmlFor="targetOrganization">Target Organization *</Label>
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
                  id="targetOrganization"
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
              Company or organization where the connection works
            </p>
          </div>

          {/* Target Position */}
          <div className="space-y-2">
            <Label htmlFor="targetPosition">Target Position *</Label>
            <Input
              id="targetPosition"
              placeholder="e.g., VP of Engineering, Senior Product Manager"
              value={formData.targetPosition}
              onChange={(e) => setFormData({ ...formData, targetPosition: e.target.value })}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Role or title of the connection
            </p>
          </div>

          {/* Organization Logo URL (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="targetLogoUrl">Organization Logo URL (Optional)</Label>
            <Input
              id="targetLogoUrl"
              placeholder="e.g., https://example.com/logo.png"
              value={formData.targetLogoUrl}
              onChange={(e) => setFormData({ ...formData, targetLogoUrl: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Direct URL to company logo. Leave empty to auto-fetch from Clearbit
            </p>
          </div>

          {/* Relationship Type */}
          <div className="space-y-2">
            <Label htmlFor="relationshipType">Your Relationship *</Label>
            <Select
              value={formData.relationshipType}
              onValueChange={(value) => setFormData({ ...formData, relationshipType: value })}
            >
              <SelectTrigger id="relationshipType">
                <SelectValue placeholder="Select relationship type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="former_colleague">Former Colleague</SelectItem>
                <SelectItem value="current_colleague">Current Colleague</SelectItem>
                <SelectItem value="mentor">Mentor/Mentee</SelectItem>
                <SelectItem value="friend">Friend</SelectItem>
                <SelectItem value="business_partner">Business Partner</SelectItem>
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
                <p className="text-xs mt-1">Screenshots are perfect! We'll auto-resize to 800x600</p>
              </div>
            </div>
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

          {/* Additional Organizations */}
          <div className="space-y-2">
            <Label>Additional Organizations (Optional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Add logos of other companies you can connect to - makes your offer more attractive!
            </p>

            {/* Show selected additional orgs */}
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

            {/* Add organization search */}
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

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || connections.length === 0}>
              {loading ? 'Creating...' : 'Create Offer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOfferModal;

