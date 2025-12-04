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
        const { data } = await supabase
          .from('user_connections')
          .select(`
            connected_user:users!user_connections_user2_id_fkey(
              id, first_name, last_name, profile_picture_url
            )
          `)
          .eq('user1_id', user?.id)
          .eq('connection_type', 'accepted')
          .limit(10);

        if (data) {
          const filtered = data
            .map(d => d.connected_user)
            .filter(u => u && (
              `${u.first_name} ${u.last_name}`.toLowerCase().includes(connectionSearch.toLowerCase())
            )) as FeaturedConnection[];
          
          setSearchResults(filtered);
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
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
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (): Promise<string> => {
    if (!photoFile || !user?.id) throw new Error('No file to upload');

    setUploading(true);
    try {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('connection-stories')
        .upload(fileName, photoFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('connection-stories')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!photoPreview && !photoUrl) {
      setError('Please add a photo');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let finalPhotoUrl = photoUrl;

      // Upload new photo if selected
      if (photoFile) {
        finalPhotoUrl = await uploadPhoto();
      }

      const payload = {
        photo_url: finalPhotoUrl,
        story: story || null,
        location: location || null,
        year: year || null,
        featured_connection_id: featuredConnectionId,
        featured_connection_name: featuredConnectionId ? null : featuredConnectionName || null
      };

      if (isEditing) {
        await apiPut(`/api/connection-stories/${editingStory.id}`, payload);
      } else {
        await apiPost('/api/connection-stories', payload);
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (err: any) {
      console.error('Error saving story:', err);
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
              accept="image/*"
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
            onClick={handleSubmit}
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

