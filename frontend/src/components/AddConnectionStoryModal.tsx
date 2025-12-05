import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Users, MapPin, Calendar, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { apiPost, apiPut } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface ConnectionStory {
  id?: string;
  photo_url?: string;
  story?: string;
  featured_connection_id?: string;
  featured_connection_name?: string;
  location?: string;
  year?: number;
}

interface FeaturedConnection {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture_url?: string;
}

interface AddConnectionStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingStory?: ConnectionStory | null;
}

export const AddConnectionStoryModal: React.FC<AddConnectionStoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingStory
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [story, setStory] = useState('');
  const [location, setLocation] = useState('');
  const [year, setYear] = useState<number | ''>('');
  const [featuredConnectionId, setFeaturedConnectionId] = useState<string | null>(null);
  const [featuredConnectionName, setFeaturedConnectionName] = useState('');
  const [connectionSearch, setConnectionSearch] = useState('');
  const [searchResults, setSearchResults] = useState<FeaturedConnection[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!editingStory?.id;

  // Populate form when editing
  useEffect(() => {
    if (editingStory) {
      setPhotoUrl(editingStory.photo_url || '');
      setPhotoPreview(editingStory.photo_url || '');
      setStory(editingStory.story || '');
      setLocation(editingStory.location || '');
      setYear(editingStory.year || '');
      setFeaturedConnectionId(editingStory.featured_connection_id || null);
      setFeaturedConnectionName(editingStory.featured_connection_name || '');
    } else {
      resetForm();
    }
  }, [editingStory]);

  const resetForm = () => {
    setPhotoUrl('');
    setPhotoFile(null);
    setPhotoPreview('');
    setStory('');
    setLocation('');
    setYear('');
    setFeaturedConnectionId(null);
    setFeaturedConnectionName('');
    setConnectionSearch('');
    setSearchResults([]);
    setError('');
  };

  // Search for connections
  useEffect(() => {
    const searchConnections = async () => {
      if (connectionSearch.length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        // Search in both directions since connections are bidirectional
        // First get connections where current user is user1
        const { data: data1 } = await supabase
          .from('user_connections')
          .select('user2_id')
          .eq('user1_id', user?.id)
          .eq('status', 'connected');

        // Then get connections where current user is user2
        const { data: data2 } = await supabase
          .from('user_connections')
          .select('user1_id')
          .eq('user2_id', user?.id)
          .eq('status', 'connected');

        // Combine all connected user IDs
        const connectedIds = [
          ...(data1 || []).map(d => d.user2_id),
          ...(data2 || []).map(d => d.user1_id)
        ];

        if (connectedIds.length === 0) {
          setSearchResults([]);
          return;
        }

        // Now search users by name within the connected users
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name, profile_picture_url')
          .in('id', connectedIds)
          .or(`first_name.ilike.%${connectionSearch}%,last_name.ilike.%${connectionSearch}%`)
          .limit(10);

        if (users) {
          setSearchResults(users as FeaturedConnection[]);
        }
      } catch (err) {
        console.error('Error searching connections:', err);
      }
    };

    const debounce = setTimeout(searchConnections, 300);
    return () => clearTimeout(debounce);
  }, [connectionSearch, user?.id]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('📷 File selected:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Validate file type - be lenient for camera photos which might not have proper MIME type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const isValidType = file.type.startsWith('image/') || 
                        validTypes.some(t => file.type.includes(t)) ||
                        file.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i);
    
    if (!isValidType) {
      setError('Please select an image file (JPG, PNG, WebP, or HEIC)');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB');
      return;
    }

    setPhotoFile(file);
    setError('');

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.onerror = () => {
      setError('Failed to read the image file');
    };
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (): Promise<string> => {
    if (!photoFile || !user?.id) throw new Error('No file to upload');

    setUploading(true);
    try {
      // Get file extension, default to jpg for camera photos
      let fileExt = photoFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      
      // Convert HEIC/HEIF extension to jpg since we'll convert the file
      if (fileExt === 'heic' || fileExt === 'heif') {
        fileExt = 'jpg';
      }
      
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      console.log('📸 Uploading connection story photo:', {
        fileName,
        fileSize: photoFile.size,
        fileType: photoFile.type,
        userId: user.id
      });

      // Check if we have a valid session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated. Please log in again.');
      }

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('connection-stories')
        .upload(fileName, photoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw new Error(uploadError.message || 'Failed to upload photo');
      }

      console.log('✅ Upload successful:', uploadData);

      // Get public URL
      const { data } = supabase.storage
        .from('connection-stories')
        .getPublicUrl(fileName);

      console.log('📎 Public URL:', data.publicUrl);
      return data.publicUrl;
    } catch (err: any) {
      console.error('❌ Upload failed:', err);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    console.log('🚀 handleSubmit called', {
      photoPreview: !!photoPreview,
      photoUrl,
      photoFile: !!photoFile,
      saving,
      uploading
    });

    if (!photoPreview && !photoUrl) {
      console.log('❌ No photo to submit');
      setError('Please add a photo');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let finalPhotoUrl = photoUrl;

      // Upload new photo if selected
      if (photoFile) {
        console.log('📤 Starting photo upload...');
        finalPhotoUrl = await uploadPhoto();
        console.log('✅ Photo uploaded:', finalPhotoUrl);
      }

      const payload = {
        photo_url: finalPhotoUrl,
        story: story || null,
        location: location || null,
        year: year || null,
        featured_connection_id: featuredConnectionId,
        featured_connection_name: featuredConnectionId ? null : featuredConnectionName || null
      };

      console.log('📦 Sending payload:', payload);

      if (isEditing) {
        console.log('📝 Updating story:', editingStory?.id);
        await apiPut(`/api/connection-stories/${editingStory?.id}`, payload);
      } else {
        console.log('➕ Creating new story');
        await apiPost('/api/connection-stories', payload);
      }

      console.log('✅ Story saved successfully');
      onSuccess();
      onClose();
      resetForm();
    } catch (err: any) {
      console.error('❌ Error saving story:', err);
      setError(err.message || 'Failed to save story');
    } finally {
      setSaving(false);
    }
  };

  const selectConnection = (connection: FeaturedConnection) => {
    setFeaturedConnectionId(connection.id);
    setFeaturedConnectionName(`${connection.first_name} ${connection.last_name}`);
    setConnectionSearch('');
    setShowSearchResults(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#0a0a0a] border border-[#333] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#0a0a0a] border-b border-[#222] p-4 flex items-center justify-between z-10">
          <h2 className="font-riccione text-xl text-white">
            {isEditing ? 'Edit Story' : 'Add Connection Story'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center hover:bg-[#333] transition-colors"
          >
            <X className="w-4 h-4 text-[#888]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Photo Upload */}
          <div>
            <label className="block text-[10px] font-gilroy font-bold tracking-[0.15em] text-[#888] uppercase mb-2">
              Photo with Your Connection
            </label>
            
            {photoPreview ? (
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden">
                <img 
                  src={photoPreview} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview('');
                    setPhotoUrl('');
                  }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center hover:bg-black transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-[#333] hover:border-[#CBAA5A]/50 flex flex-col items-center justify-center gap-3 transition-colors"
              >
                <Upload className="w-8 h-8 text-[#666]" />
                <span className="text-[11px] font-gilroy tracking-[0.1em] text-[#666] uppercase">
                  Tap to upload photo
                </span>
              </button>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>

          {/* Featured Connection */}
          <div>
            <label className="block text-[10px] font-gilroy font-bold tracking-[0.15em] text-[#888] uppercase mb-2">
              <Users className="w-3 h-3 inline mr-1" />
              Who's in this photo?
            </label>
            
            {featuredConnectionName ? (
              <div className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg border border-[#333]">
                <span className="text-white font-gilroy">{featuredConnectionName}</span>
                <button
                  onClick={() => {
                    setFeaturedConnectionId(null);
                    setFeaturedConnectionName('');
                  }}
                  className="text-[#888] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
                  <Input
                    value={connectionSearch}
                    onChange={(e) => {
                      setConnectionSearch(e.target.value);
                      setShowSearchResults(true);
                    }}
                    onFocus={() => setShowSearchResults(true)}
                    placeholder="Search your connections..."
                    className="pl-10 bg-[#1a1a1a] border-[#333] text-white"
                  />
                </div>
                
                {/* Search Results */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden z-20">
                    {searchResults.map(conn => (
                      <button
                        key={conn.id}
                        onClick={() => selectConnection(conn)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-[#333] transition-colors text-left"
                      >
                        {conn.profile_picture_url ? (
                          <img src={conn.profile_picture_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#333] flex items-center justify-center">
                            <span className="text-[11px] text-[#888]">{conn.first_name[0]}</span>
                          </div>
                        )}
                        <span className="text-white font-gilroy">{conn.first_name} {conn.last_name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Or enter manually */}
                <div className="mt-2">
                  <Input
                    value={featuredConnectionName}
                    onChange={(e) => setFeaturedConnectionName(e.target.value)}
                    placeholder="Or enter name manually..."
                    className="bg-[#1a1a1a] border-[#333] text-white text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Story */}
          <div>
            <label className="block text-[10px] font-gilroy font-bold tracking-[0.15em] text-[#888] uppercase mb-2">
              Your Story (optional)
            </label>
            <Textarea
              value={story}
              onChange={(e) => setStory(e.target.value.slice(0, 150))}
              placeholder="How did you meet? Keep it short and sweet..."
              className="bg-[#1a1a1a] border-[#333] text-white resize-none h-20"
              maxLength={150}
            />
            <p className="text-[10px] text-[#555] mt-1 text-right">{story.length}/150</p>
          </div>

          {/* Location & Year */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-gilroy font-bold tracking-[0.15em] text-[#888] uppercase mb-2">
                <MapPin className="w-3 h-3 inline mr-1" />
                Location
              </label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="San Francisco"
                className="bg-[#1a1a1a] border-[#333] text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-gilroy font-bold tracking-[0.15em] text-[#888] uppercase mb-2">
                <Calendar className="w-3 h-3 inline mr-1" />
                Year
              </label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value ? parseInt(e.target.value) : '')}
                placeholder="2023"
                min={1990}
                max={new Date().getFullYear()}
                className="bg-[#1a1a1a] border-[#333] text-white"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm font-gilroy">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#0a0a0a] border-t border-[#222] p-4">
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔘 Button clicked!');
              handleSubmit();
            }}
            disabled={saving || uploading || (!photoPreview && !photoUrl)}
            className="w-full bg-[#CBAA5A] text-black hover:bg-white font-gilroy tracking-[0.15em] uppercase text-[11px] h-12 disabled:opacity-50"
          >
            {saving || uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploading ? 'Uploading...' : 'Saving...'}
              </>
            ) : (
              isEditing ? 'Save Changes' : 'Add Story'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddConnectionStoryModal;


