import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Building2, X, Upload, Image as ImageIcon } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { Currency, convertCurrency, getCurrencySymbol } from '@/lib/currency';
import GamifiedFormCarousel, { FormStep } from './GamifiedFormCarousel';

interface CreateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Connection {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture_url?: string;
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
  const { userCurrency } = useCurrency();
  const { createOffer, loading } = useOffers();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(userCurrency);
  
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

  // Update selected currency when user's preference changes
  useEffect(() => {
    setSelectedCurrency(userCurrency);
  }, [userCurrency]);

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
      const { data, error } = await supabase
        .from('user_connections')
        .select(`
          user1_id,
          user2_id,
          user1:users!user_connections_user1_id_fkey(
            id,
            first_name,
            last_name,
            profile_picture_url,
            company,
            role
          ),
          user2:users!user_connections_user2_id_fkey(
            id,
            first_name,
            last_name,
            profile_picture_url,
            company,
            role
          )
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('status', 'connected');

      if (error) throw error;

      const connectedUsers: Connection[] = data.map((conn: any) => {
        const connectedUser = conn.user1_id === user.id ? conn.user2 : conn.user1;
        return {
          id: connectedUser.id,
          first_name: connectedUser.first_name,
          last_name: connectedUser.last_name,
          profile_picture_url: connectedUser.profile_picture_url,
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

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
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

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              
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

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    try {
      const compressedFile = await compressImage(file);
      setPhotoFile(compressedFile);
      
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

  const handleSubmit = async () => {
    setError(null);

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
      let photoUrl: string | null = null;
      if (photoFile) {
        photoUrl = await uploadPhoto();
      }

      const priceInr = selectedCurrency === 'INR' ? price : convertCurrency(price, 'EUR', 'INR');
      const priceEur = selectedCurrency === 'EUR' ? price : convertCurrency(price, 'INR', 'EUR');

      await createOffer({
        title: formData.title,
        description: formData.description,
        connectionUserId: formData.connectionUserId,
        price,
        currency: selectedCurrency,
        asking_price_inr: Math.round(priceInr),
        asking_price_eur: Math.round(priceEur * 100) / 100,
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

      handleClose();
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

  // Define form steps
  const formSteps: FormStep[] = [
    {
      id: 'connection',
      title: 'Who do you want to offer?',
      description: 'Select a connection from your network',
      isValid: !!formData.connectionUserId,
      component: (
        <div className="space-y-4">
          {loadingConnections ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your connections...</p>
            </div>
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
                <SelectTrigger className="text-lg py-6">
                  <SelectValue placeholder="Select a connection" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((connection) => (
                    <SelectItem key={connection.id} value={connection.id}>
                      <div className="flex items-center gap-3 py-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={connection.profile_picture_url} />
                          <AvatarFallback className="text-sm">
                            {connection.first_name?.[0]}{connection.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {connection.first_name} {connection.last_name}
                          </p>
                          {connection.company && (
                            <p className="text-xs text-muted-foreground">
                              {connection.role} at {connection.company}
                            </p>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedConnection && (
                <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-lg border-2 border-primary animate-in fade-in">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedConnection.profile_picture_url} />
                    <AvatarFallback>
                      <Users className="w-8 h-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-lg">
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
      )
    },
    {
      id: 'title',
      title: 'Give your offer a title',
      description: 'Make it clear and compelling',
      isValid: formData.title.trim().length > 0 && formData.title.length <= 100,
      component: (
        <div className="space-y-4">
          <Input
            placeholder="e.g., Connect with VP of Engineering at Google"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            maxLength={100}
            className="text-lg py-6"
            autoFocus
          />
          <p className="text-sm text-muted-foreground text-center">
            {formData.title.length}/100 characters
          </p>
        </div>
      )
    },
    {
      id: 'description',
      title: 'Describe this connection',
      description: 'What makes them valuable? What conversations are they open to?',
      isValid: formData.description.trim().length > 0 && formData.description.length <= 500,
      component: (
        <div className="space-y-4">
          <Textarea
            placeholder="Describe what makes this connection valuable and what kind of conversations they're open to..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={6}
            maxLength={500}
            className="text-base resize-none"
          />
          <p className="text-sm text-muted-foreground text-center">
            {formData.description.length}/500 characters
          </p>
        </div>
      )
    },
    {
      id: 'organization',
      title: 'Which organization?',
      description: 'Where does this connection work?',
      isValid: !!selectedOrg,
      component: (
        <div className="space-y-4">
          {selectedOrg ? (
            <div className="flex items-center gap-4 p-4 border-2 border-primary rounded-lg bg-primary/5">
              <Avatar className="h-16 w-16">
                {selectedOrg.logo_url ? (
                  <AvatarImage src={selectedOrg.logo_url} alt={selectedOrg.name} />
                ) : (
                  <AvatarFallback>
                    <Building2 className="h-8 w-8" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1">
                <p className="font-bold text-lg">{selectedOrg.name}</p>
                <p className="text-sm text-muted-foreground">{selectedOrg.domain}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveOrg}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <div className="relative" ref={searchRef}>
              <Input
                placeholder="Search for organization (e.g., Google, Microsoft)"
                value={orgSearchQuery}
                onChange={(e) => setOrgSearchQuery(e.target.value)}
                onFocus={() => orgSearchResults.length > 0 && setShowOrgResults(true)}
                className="text-lg py-6"
              />
              
              {showOrgResults && orgSearchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-card border-2 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {orgSearchResults.map((org) => (
                    <div
                      key={org.id}
                      className="flex items-center gap-3 p-4 hover:bg-primary/10 cursor-pointer transition-colors border-b last:border-b-0"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectOrg(org);
                      }}
                    >
                      <Avatar className="h-12 w-12">
                        {org.logo_url ? (
                          <AvatarImage src={org.logo_url} alt={org.name} />
                        ) : (
                          <AvatarFallback>
                            <Building2 className="h-6 w-6" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <p className="font-semibold">{org.name}</p>
                        <p className="text-sm text-muted-foreground">{org.domain}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {orgLoading && (
                <p className="text-sm text-muted-foreground mt-2 text-center">🔍 Searching...</p>
              )}
            </div>
          )}
        </div>
      )
    },
    {
      id: 'position',
      title: 'What\'s their role?',
      description: 'Their job title or position',
      isValid: formData.targetPosition.trim().length > 0 && formData.targetPosition.length <= 100,
      component: (
        <div className="space-y-4">
          <Input
            placeholder="e.g., VP of Engineering, Senior Product Manager"
            value={formData.targetPosition}
            onChange={(e) => setFormData({ ...formData, targetPosition: e.target.value })}
            maxLength={100}
            className="text-lg py-6"
          />
          <p className="text-sm text-muted-foreground text-center">
            Role or title of the connection
          </p>
        </div>
      )
    },
    {
      id: 'relationship',
      title: 'How do you know them?',
      description: 'Your relationship with this connection',
      isValid: !!formData.relationshipType,
      component: (
        <div className="space-y-4">
          <Select
            value={formData.relationshipType}
            onValueChange={(value) => setFormData({ ...formData, relationshipType: value })}
          >
            <SelectTrigger className="text-lg py-6">
              <SelectValue placeholder="Select relationship type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="former_colleague">👔 Former Colleague</SelectItem>
              <SelectItem value="current_colleague">🤝 Current Colleague</SelectItem>
              <SelectItem value="mentor">🎓 Mentor/Mentee</SelectItem>
              <SelectItem value="friend">👋 Friend</SelectItem>
              <SelectItem value="business_partner">💼 Business Partner</SelectItem>
              <SelectItem value="family">👨‍👩‍👧‍👦 Family</SelectItem>
              <SelectItem value="other">🌟 Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )
    },
    {
      id: 'relationship_details',
      title: 'Tell us more (optional)',
      description: 'Add details about your relationship',
      isValid: formData.relationshipDescription.length <= 200,
      isOptional: true,
      component: (
        <div className="space-y-4">
          <Textarea
            placeholder="e.g., Worked together at Google for 3 years on the Maps team..."
            value={formData.relationshipDescription}
            onChange={(e) => setFormData({ ...formData, relationshipDescription: e.target.value })}
            rows={4}
            maxLength={200}
            className="text-base resize-none"
          />
          <p className="text-sm text-muted-foreground text-center">
            {formData.relationshipDescription.length}/200 characters
          </p>
        </div>
      )
    },
    {
      id: 'photo',
      title: 'Add a photo (optional)',
      description: 'A photo with your connection builds trust',
      isValid: true,
      isOptional: true,
      component: (
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-4">
            {photoPreview ? (
              <div className="relative w-64 h-64 rounded-lg overflow-hidden border-4 border-primary">
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
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-64 h-64 border-4 border-dashed border-muted-foreground rounded-lg flex flex-col items-center justify-center gap-4 hover:border-primary hover:bg-primary/5 transition-all"
              >
                <ImageIcon className="h-16 w-16 text-muted-foreground" />
                <span className="text-lg font-medium text-muted-foreground">Click to Upload</span>
              </button>
            )}

            <div className="text-center text-sm text-muted-foreground">
              <p className="mb-1">📸 Upload a photo of you with the connection</p>
              <p className="text-xs">This builds trust and makes your offer more personal</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'price',
      title: 'Set your price',
      description: 'What\'s your asking price for this introduction?',
      isValid: parseFloat(formData.price) > 0,
      component: (
        <div className="space-y-6">
          <div className="flex justify-center gap-4 mb-4">
            <Button
              type="button"
              variant={selectedCurrency === 'INR' ? 'default' : 'outline'}
              onClick={() => setSelectedCurrency('INR')}
              className="text-lg"
            >
              ₹ INR
            </Button>
            <Button
              type="button"
              variant={selectedCurrency === 'EUR' ? 'default' : 'outline'}
              onClick={() => setSelectedCurrency('EUR')}
              className="text-lg"
            >
              € EUR
            </Button>
          </div>

          <div className="relative">
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-bold text-muted-foreground">
              {getCurrencySymbol(selectedCurrency)}
            </span>
            <Input
              type="number"
              placeholder={selectedCurrency === 'INR' ? 'e.g., 5000' : 'e.g., 60'}
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              min={selectedCurrency === 'INR' ? '100' : '10'}
              step={selectedCurrency === 'INR' ? '100' : '10'}
              className="text-3xl py-8 text-center font-bold pl-16"
            />
          </div>

          <p className="text-sm text-muted-foreground text-center">
            {selectedCurrency === 'INR' 
              ? 'Minimum ₹100. Set a fair price for your introduction service.'
              : 'Minimum €10. Set a fair price for your introduction service.'}
          </p>
        </div>
      )
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="py-4">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Create Your Offer
            </h2>
            <p className="text-muted-foreground mt-2">
              Let's make this quick and fun! Just answer a few questions...
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <GamifiedFormCarousel
            steps={formSteps}
            onComplete={handleSubmit}
            onCancel={handleClose}
            isSubmitting={loading}
            submitButtonText="🎉 Create Offer"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOfferModal;
