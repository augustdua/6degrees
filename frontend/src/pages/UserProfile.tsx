import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OrganizationSearch from '@/components/OrganizationSearch';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import FeaturedConnectionSelector from '@/components/FeaturedConnectionSelector';
import ProfileCollage from '@/components/ProfileCollage';
import ConnectionsTab from '@/components/ConnectionsTab';
import { InviteFriendModal } from '@/components/InviteFriendModal';
import { ConnectionStoryCard } from '@/components/ConnectionStoryCard';
import { AddConnectionStoryModal } from '@/components/AddConnectionStoryModal';
import { useConnectionStories } from '@/hooks/useConnectionStories';
import MessagesTab from '@/components/MessagesTab';
import IntrosTab from '@/components/IntrosTab';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Footer } from '@/components/Footer';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';
import { apiPost, apiGet, apiPut, apiDelete, API_BASE_URL, API_ENDPOINTS } from '@/lib/api';
import { Currency, convertAndFormatINR } from '@/lib/currency';
import { useSocialCapital } from '@/hooks/useSocialCapital';
import { SocialCapitalScore } from '@/components/SocialCapitalScore';
import { SocialCapitalScorePremium } from '@/components/SocialCapitalScorePremium';
import { SocialCapitalBreakdownModal } from '@/components/SocialCapitalBreakdownModal';
import { getCloudinaryLogoUrl } from '@/utils/cloudinary';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  User,
  Save,
  AlertTriangle,
  CheckCircle,
  Linkedin,
  ExternalLink,
  Building2,
  Eye,
  EyeOff,
  Camera,
  Upload,
  DollarSign,
  Edit,
  TrendingUp,
  Trash2,
  X,
  ZoomIn,
  Network,
  MessageSquare,
  Handshake,
  Video,
  Users,
  Settings,
  Home,
  Calendar,
  Share2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProfileFacetsCard } from '@/components/profile/ProfileFacetsCard';
import WhatsAppConnectCard from '@/components/profile/WhatsAppConnectCard';
import GoogleCalendarConnectCard from '@/components/profile/GoogleCalendarConnectCard';

const UserProfile = () => {
  const { user, updateProfile, refreshProfile } = useAuth();
  const { userCurrency, setUserCurrency } = useCurrency();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { counts: notificationCounts } = useNotificationCounts();

  const role = (user as any)?.role as string | undefined;
  const isPartner = role === 'ZAURQ_PARTNER';
  const isZaurqUser = role === 'ZAURQ_USER';
  
  // Tab state - get from URL or default to 'info'
  const initialTab = searchParams.get('tab') || 'info';
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Settings view state (within INFO tab)
  const [showSettings, setShowSettings] = useState(false);
  
  // Requests state
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  
  // Update URL when tab changes
  const handleTabChange = (newTab: string) => {
    // Offers removed: treat any legacy offers tab navigation as Info.
    if (newTab === 'offers') {
      setActiveTab('info');
      setSearchParams({});
      return;
    }
    setActiveTab(newTab);
    if (newTab === 'info') {
      setSearchParams({});
    } else {
      setSearchParams({ tab: newTab });
    }
  };
  
  // Sync tab with URL on mount and URL change
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'info';
    // Map old tab names to new structure
    if (tabFromUrl === 'about' || tabFromUrl === 'profile') {
      setActiveTab('info');
    } else if (tabFromUrl === 'chains') {
      setActiveTab('requests');
    } else if (tabFromUrl === 'offers') {
      setActiveTab('info');
    } else if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab, isPartner]);
  
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [linkedinEnriching, setLinkedinEnriching] = useState(false);
  const [linkedinHydrating, setLinkedinHydrating] = useState(false);
  const [linkedinHydrateTrigger, setLinkedinHydrateTrigger] = useState(0);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(userCurrency);
  const [currencySaving, setCurrencySaving] = useState(false);
  const [collageOrganizations, setCollageOrganizations] = useState<any[]>([]);
  const [userOrganizations, setUserOrganizations] = useState<any[]>([]);
  const [featuredConnectionsCount, setFeaturedConnectionsCount] = useState(0);
  const [activityStats, setActivityStats] = useState({
    activeOffers: 0,
    activeRequests: 0,
    introsMade: 0,
    rating: 0
  });
  const [activityStatsLoading, setActivityStatsLoading] = useState(true);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [scoreBreakdownData, setScoreBreakdownData] = useState<any>(null);
  const [calculatingScore, setCalculatingScore] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [currentScore, setCurrentScore] = useState<number>(user?.socialCapitalScore || 0);
  const [profileDataLoading, setProfileDataLoading] = useState(true);
  const [showInviteFriendModal, setShowInviteFriendModal] = useState(false);
  const [showAddStoryModal, setShowAddStoryModal] = useState(false);
  const [editingStory, setEditingStory] = useState<any>(null);
  const [showPublicPreview, setShowPublicPreview] = useState(false);
  
  // Connection Stories hook
  const { 
    stories: connectionStories, 
    loading: connectionStoriesLoading, 
    fetchStories: refetchStories,
    deleteStory 
  } = useConnectionStories(user?.id);
  
  // Load requests when on requests tab - using API endpoint
  useEffect(() => {
    const loadRequests = async () => {
      if (activeTab !== 'requests' || !user) return;
      setRequestsLoading(true);
      try {
        const response = await apiGet('/api/requests/my-requests');
        setMyRequests(response?.requests || []);
      } catch (error) {
        console.error('Error loading requests:', error);
        setMyRequests([]);
      } finally {
        setRequestsLoading(false);
      }
    };
    loadRequests();
  }, [activeTab, user]);

  const { calculateScore, getBreakdown, loading: scoreLoading } = useSocialCapital();
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    bio: user?.bio || '',
    linkedinUrl: user?.linkedinUrl || '',
    isProfilePublic: true,
  });

  // Update selected currency when user currency changes
  useEffect(() => {
    setSelectedCurrency(userCurrency);
  }, [userCurrency]);

  // Sync score when user object changes
  useEffect(() => {
    if (user?.socialCapitalScore !== undefined && user.socialCapitalScore > 0) {
      setCurrentScore(user.socialCapitalScore);
      setProfileDataLoading(false);
    }
  }, [user?.socialCapitalScore]);

  // Load user profile data from API to get fresh social capital score
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id) return;

      // Set initial values from auth context
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        bio: user.bio || '',
        linkedinUrl: user.linkedinUrl || '',
        isProfilePublic: true,
      });

      try {
        const userData = await apiGet(`/api/users/${user.id}`);
        if (userData) {
          setFormData({
            firstName: userData.first_name || user.firstName || '',
            lastName: userData.last_name || user.lastName || '',
            bio: userData.bio || user.bio || '',
            linkedinUrl: userData.linkedin_url || user.linkedinUrl || '',
            isProfilePublic: userData.is_profile_public ?? true,
          });
          
          // Update social capital score from API
          if (userData.social_capital_score !== undefined) {
            setCurrentScore(userData.social_capital_score);
          }
        }
      } catch (error) {
        console.warn('Could not load user profile from API:', error);
      } finally {
        setProfileDataLoading(false);
      }
    };

    loadUserProfile();
  }, [user?.id]);

  // GitHub + product/pitch features removed from profile.

  // Load collage organizations (includes featured connections' orgs)
  useEffect(() => {
    const loadCollageOrgs = async () => {
      if (!user?.id) return;

      try {
        const data = await apiGet(`/api/profile/${user.id}`);

        // Use collage_organizations if available, fallback to organizations
        if (data && data.collage_organizations) {
          setCollageOrganizations(data.collage_organizations);
        } else if (data && data.organizations) {
          setCollageOrganizations(data.organizations);
        }

        // Keep a separate list of the user's own organizations for "Work experience"
        if (data && Array.isArray(data.organizations)) {
          setUserOrganizations(data.organizations);
        } else {
          setUserOrganizations([]);
        }
        
        // Get featured connections count
        if (data && data.featured_connections) {
          setFeaturedConnectionsCount(data.featured_connections.length);
        }
      } catch (error) {
        console.error('Error loading collage:', error);
      }
    };

    loadCollageOrgs();
  }, [user?.id]);

  // Load activity stats using backend API (skip cache for fresh data)
  useEffect(() => {
    const loadActivityStats = async () => {
      if (!user?.id) return;

      setActivityStatsLoading(true);
      try {
        // Offers removed. Keep Requests (partner-only) and Intros (via /api/intros).
        const activeOffers = 0;
        let activeRequests = 0;

        if (isPartner) {
          const requestsResponse = await apiGet('/api/requests/my-requests', { skipCache: true });
          activeRequests = requestsResponse?.requests?.filter((r: any) => r.status === 'active')?.length || 0;
        }

        const introsResponse = await apiGet('/api/intros/my', { skipCache: true });
        const completedIntros = Array.isArray(introsResponse)
          ? introsResponse.filter((i: any) => i.status === 'completed')
          : [];
        const introsMade = completedIntros.length;
        
        // Calculate average rating from completed intros
        const ratings = completedIntros.filter((i: any) => i.rating).map((i: any) => i.rating);
        const avgRating = ratings.length > 0 
          ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length 
          : 0;

        setActivityStats({
          activeOffers,
          activeRequests,
          introsMade,
          rating: avgRating
        });
      } catch (error) {
        console.error('Error loading activity stats:', error);
      } finally {
        setActivityStatsLoading(false);
      }
    };

    loadActivityStats();
  }, [user?.id, isPartner]);

  // Venture/GitHub data loading removed.

  // Update form data when user data changes
  useEffect(() => {
    // console.log('User data updated:', user);
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);

    try {
      // Use API endpoint to update profile
      await apiPut('/api/users/profile', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        bio: formData.bio,
        linkedinUrl: formData.linkedinUrl,
      });

      // Update auth context
      const { error } = await updateProfile(formData);

      if (error) {
        console.error('Update profile error:', error);
        throw error;
      }

      setSaved(true);
      setIsEditingProfile(false); // Exit edit mode on successful save
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      console.error('Profile update error:', error);
      alert(`Failed to update profile: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateScore = async () => {
    if (!user?.id) return;
    
    setCalculatingScore(true);
    try {
      const score = await calculateScore(user.id);
      
      // Update local state immediately
      setCurrentScore(score);
      
      // Update the user object in auth context with the returned score
      await updateProfile({ socialCapitalScore: score });
      
      toast({
        title: 'Score Calculated!',
        description: `Your social capital score is ${score}`,
      });
    } catch (error: any) {
      console.error('Error calculating score:', error);
      toast({
        title: 'Calculation Failed',
        description: error.message || 'Failed to calculate social capital score',
        variant: 'destructive',
      });
    } finally {
      setCalculatingScore(false);
    }
  };

  // Saving venture/github removed.

  const handleDeleteStory = async (storyId: string) => {
    if (!confirm('Delete this story?')) return;
    try {
      await deleteStory(storyId);
      toast({
        title: 'Story deleted',
        description: 'Your connection story has been removed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete story.',
        variant: 'destructive',
      });
    }
  };

  const handleShowBreakdown = async () => {
    if (!user?.id) return;
    
    try {
      const data = await getBreakdown(user.id);
      setScoreBreakdownData(data);
      setShowScoreBreakdown(true);
    } catch (error) {
      console.error('Error fetching breakdown:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch score breakdown',
        variant: 'destructive',
      });
    }
  };

  const handleResendVerification = async () => {
    setSendingVerification(true);
    setVerificationSent(false);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });

      if (error) throw error;

      setVerificationSent(true);
      setTimeout(() => setVerificationSent(false), 5000);
    } catch (error) {
      console.error('Error resending verification:', error);
      alert('Failed to resend verification email. Please try again.');
    } finally {
      setSendingVerification(false);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      setAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile || !user?.id) return;

    setUploadingAvatar(true);
    try {
      // Delete old profile picture if exists
      const currentProfilePic = user.avatar;
      if (currentProfilePic) {
        const oldPath = currentProfilePic.split('/profile-pictures/')[1];
        if (oldPath) {
          await supabase.storage.from('profile-pictures').remove([oldPath]);
        }
      }

      // Upload new profile picture
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      // Update user profile_picture_url in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_picture_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update auth context with new profile picture
      await updateProfile({
        avatar: publicUrl,
      });

      // Clear selection
      setAvatarFile(null);
      setAvatarPreview(null);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      
      toast({
        title: 'Photo Updated',
        description: 'Your profile photo has been updated successfully.',
      });
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload avatar',
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!user?.id || !user.avatar) return;

    setDeletingAvatar(true);
    try {
      // Delete from storage
      const oldPath = user.avatar.split('/profile-pictures/')[1];
      if (oldPath) {
        await supabase.storage.from('profile-pictures').remove([oldPath]);
      }

      // Update user profile_picture_url in database to null
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_picture_url: null })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update auth context
      await updateProfile({
        avatar: '',
      });

      setShowPhotoModal(false);
      
      toast({
        title: 'Photo Deleted',
        description: 'Your profile photo has been removed.',
      });
    } catch (error: any) {
      console.error('Avatar delete error:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete avatar',
        variant: 'destructive',
      });
    } finally {
      setDeletingAvatar(false);
    }
  };

  const handleCurrencySave = async () => {
    if (!user?.id || selectedCurrency === userCurrency) return;

    setCurrencySaving(true);
    try {
      await apiPost('/api/users/me/currency', { preferred_currency: selectedCurrency });
      
      // Update context
      setUserCurrency(selectedCurrency);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Currency update error:', error);
      alert(`Failed to update currency: ${error.message || error}`);
    } finally {
      setCurrencySaving(false);
    }
  };

  const isLinkedInValid = formData.linkedinUrl.trim() === '' || formData.linkedinUrl.includes('linkedin.com');
  const linkedinScrape = user?.linkedinScrape;
  // Prefer in-form URL, then persisted profile URL, then the scraped profile URL.
  // This prevents hiding scraped data when form state hasn't hydrated yet.
  const resolvedLinkedInUrl =
    formData.linkedinUrl.trim() ||
    (user?.linkedinUrl || '').trim() ||
    (linkedinScrape?.profile?.linkedinUrl || '').trim();
  const isResolvedLinkedInValid = resolvedLinkedInUrl === '' || resolvedLinkedInUrl.includes('linkedin.com');

  // If Apify already saved data to DB but this tab was opened without a full reload,
  // `user.linkedinScrape` can be stale. Hydrate from DB (with a short retry loop) without re-running Apify.
  useEffect(() => {
    if (!user?.id) return;
    if (linkedinScrape?.profile) return;
    if (!resolvedLinkedInUrl) return;
    if (linkedinHydrating) return;

    let cancelled = false;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const run = async () => {
      try {
        setLinkedinHydrating(true);
        // Retry a few times to handle eventual-consistency (scrape -> DB write -> read).
        const delaysMs = [0, 800, 1500, 3000, 5000];
        for (const d of delaysMs) {
          if (cancelled) return;
          if (d) await sleep(d);
          if (cancelled) return;
          await refreshProfile({ preferBackend: true }).catch(() => {});
        }
      } finally {
        if (!cancelled) setLinkedinHydrating(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [user?.id, linkedinScrape?.profile, resolvedLinkedInUrl, refreshProfile, linkedinHydrateTrigger, linkedinHydrating]);

  const formatRelativeTime = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const t = d.getTime();
    if (!Number.isFinite(t)) return '';
    const diffMs = Date.now() - t;
    const s = Math.floor(diffMs / 1000);
    if (s < 10) return 'just now';
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    return `${days}d ago`;
  };

  const handleEnrichFromLinkedIn = async () => {
    const url = resolvedLinkedInUrl;
    if (!url) {
      toast({ title: 'Add LinkedIn URL', description: 'Paste your LinkedIn profile link first.', variant: 'destructive' });
      return;
    }
    if (!isResolvedLinkedInValid) {
      toast({ title: 'Invalid LinkedIn URL', description: 'Please enter a valid LinkedIn profile URL.', variant: 'destructive' });
      return;
    }
    try {
      setLinkedinEnriching(true);
      await apiPost('/api/linkedin/scrape', { linkedinUrl: url });
      // Kick off a hydrate cycle immediately; DB write can land a moment after API returns.
      setLinkedinHydrateTrigger((x) => x + 1);
      await refreshProfile({ preferBackend: true }).catch(() => {});
      toast({ title: 'Updated', description: 'Pulled details from LinkedIn.' });
    } catch (e: any) {
      toast({ title: 'Could not enrich', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setLinkedinEnriching(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CBAA5A] mx-auto mb-4"></div>
          <p className="text-[#666] font-gilroy tracking-[0.15em] uppercase text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20 md:pb-0">
      {/* Mobile header (desktop uses sidebar) */}
      <div className="bg-black sticky top-0 z-50 pt-3 md:hidden">
        {/* Navigation Row - Centered Container */}
        <div className="max-w-6xl mx-auto px-4 md:px-6 pb-3">
          <div className="flex items-center justify-between relative">
            {/* Back to Feed */}
            <button
              onClick={() => navigate('/feed')}
              className="flex items-center gap-1.5 text-[#888] hover:text-white transition-colors min-w-[80px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-gilroy tracking-[0.15em] uppercase text-[9px]">FEED</span>
            </button>

            {/* Center - Logo */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <div className="w-7 h-7 bg-gradient-to-br from-[#CBAA5A] to-[#8B7355] rounded-lg flex items-center justify-center">
                <span
                  className="text-black font-bold text-xs"
                  style={{ fontFamily: 'Riccione-DemiBold, ui-serif, serif' }}
                >
                  Z
                </span>
              </div>
            </div>

          {/* Right - DMs, Settings, Public */}
          <div className="flex items-center gap-3 min-w-[80px] justify-end">
            {/* DMs Button */}
            <button
              onClick={() => handleTabChange('messages')}
              className={`relative transition-colors ${activeTab === 'messages' ? 'text-[#CBAA5A]' : 'text-[#888] hover:text-[#CBAA5A]'}`}
            >
              <MessageSquare className="w-4 h-4" />
              {notificationCounts?.unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[6px] font-bold rounded-full w-3 h-3 flex items-center justify-center">
                  {notificationCounts.unreadMessages > 9 ? '9+' : notificationCounts.unreadMessages}
                </span>
              )}
            </button>
            {/* Settings (mobile) */}
            <button
              onClick={() => setShowSettings(true)}
              className="text-[#888] hover:text-[#CBAA5A] transition-colors md:hidden"
            >
              <Settings className="w-4 h-4" />
            </button>
            {/* Public Profile Toggle */}
            <button
              onClick={() => setShowPublicPreview(!showPublicPreview)}
              className={`flex items-center gap-1.5 transition-colors ${
                showPublicPreview ? 'text-[#CBAA5A]' : 'text-[#888] hover:text-[#CBAA5A]'
              }`}
              title={showPublicPreview ? 'Exit public view' : 'Preview public view'}
            >
              <span className="font-gilroy tracking-[0.15em] uppercase text-[9px] hidden md:inline">
                {showPublicPreview ? 'EXIT' : 'PUBLIC'}
              </span>
              {showPublicPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          </div>
        </div>

        {/* Public Preview Banner */}
        {showPublicPreview && (
          <div className="bg-[#CBAA5A]/10 border-y border-[#CBAA5A]/30 px-4 py-2 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#CBAA5A]" />
                <span className="font-gilroy tracking-[0.1em] uppercase text-[10px] text-[#CBAA5A]">
                  Public View Preview
                </span>
                <span className="text-[9px] text-[#888]">
                  — This is what others see when they visit your profile
                </span>
              </div>
              <button
                onClick={() => setShowPublicPreview(false)}
                className="text-[#CBAA5A] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation - Scrollable, Centered */}
        <div className="border-b border-[#222] max-w-6xl mx-auto px-4 md:px-6 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 md:gap-3 py-2">
            <button
              onClick={() => { handleTabChange('info'); setShowSettings(false); }}
              className={`flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[9px] md:text-[11px] font-gilroy tracking-[0.1em] uppercase whitespace-nowrap transition-all ${
                activeTab === 'info'
                  ? 'bg-[#CBAA5A] text-black'
                  : 'text-[#666] hover:text-white border border-[#333]'
              }`}
            >
              <User className="w-3 h-3 md:w-4 md:h-4" />
              <span>INFO</span>
            </button>
            {isPartner && (
              <button
                onClick={() => handleTabChange('offers')}
                className={`flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[9px] md:text-[11px] font-gilroy tracking-[0.1em] uppercase whitespace-nowrap transition-all ${
                  activeTab === 'offers'
                    ? 'bg-[#CBAA5A] text-black'
                    : 'text-[#666] hover:text-white border border-[#333]'
                }`}
              >
                <Handshake className="w-3 h-3 md:w-4 md:h-4" />
                <span>OFFERS</span>
              </button>
            )}
            {/* Requests temporarily disabled */}
            <button
              onClick={() => handleTabChange('intros')}
              className={`flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[9px] md:text-[11px] font-gilroy tracking-[0.1em] uppercase whitespace-nowrap transition-all ${
                activeTab === 'intros'
                  ? 'bg-[#CBAA5A] text-black'
                  : 'text-[#666] hover:text-white border border-[#333]'
              }`}
            >
              <Video className="w-3 h-3 md:w-4 md:h-4" />
              <span>INTROS</span>
            </button>
            <button
              onClick={() => handleTabChange('messages')}
              className={`flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[9px] md:text-[11px] font-gilroy tracking-[0.1em] uppercase whitespace-nowrap transition-all ${
                activeTab === 'messages'
                  ? 'bg-[#CBAA5A] text-black'
                  : 'text-[#666] hover:text-white border border-[#333]'
              }`}
            >
              <MessageSquare className="w-3 h-3 md:w-4 md:h-4" />
              <span>DMS</span>
            </button>
            <button
              onClick={() => handleTabChange('network')}
              className={`flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[9px] md:text-[11px] font-gilroy tracking-[0.1em] uppercase whitespace-nowrap transition-all ${
                activeTab === 'network'
                  ? 'bg-[#CBAA5A] text-black'
                  : 'text-[#666] hover:text-white border border-[#333]'
              }`}
            >
              <Users className="w-3 h-3 md:w-4 md:h-4" />
              <span>NETWORK</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop layout: sidebar + content */}
      <div className="hidden md:flex md:min-h-screen">
        <aside className="w-[260px] border-r border-[#1f1f1f] bg-gradient-to-b from-black via-black/80 to-black/60 backdrop-blur-xl px-4 py-5 sticky top-0 h-screen">
          {/* Top brand + back */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-[#CBAA5A] to-[#8B7355] rounded-xl flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
                <span className="text-black font-bold text-xs" style={{ fontFamily: 'Riccione-DemiBold, ui-serif, serif' }}>
                  Z
                </span>
              </div>
              <div>
                <div className="text-white font-gilroy tracking-[0.14em] uppercase text-[10px]">Profile</div>
                <div className="text-[#666] font-gilroy tracking-[0.12em] uppercase text-[9px]">{user?.email?.split('@')[0]}</div>
              </div>
            </div>
            <button
              onClick={() => navigate('/feed')}
              className="h-9 w-9 rounded-xl border border-[#2a2a2a] bg-black/40 hover:bg-black/70 hover:border-[#444] text-[#888] hover:text-white transition-colors flex items-center justify-center"
              title="Back to feed"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Mini profile */}
          <div className="mt-4 rounded-2xl border border-[#222] bg-black/40 p-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl overflow-hidden border border-[#333] bg-[#0b0b0b]">
                {user?.avatar ? (
                  <img
                    src={avatarPreview || user.avatar}
                    alt={`${user?.firstName} ${user?.lastName}`}
                    className="h-full w-full object-cover"
                    style={{ filter: 'grayscale(1) contrast(1.1) brightness(0.9)' }}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-[#555] font-riccione text-xl">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-white font-gilroy tracking-[0.08em] uppercase text-[11px] truncate">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="px-2 py-1 rounded-full text-[9px] font-gilroy tracking-[0.15em] uppercase border border-[#333] bg-black/40 text-[#888]">
                    SoCap {profileDataLoading ? '—' : currentScore}
                  </span>
                  {/* GitHub removed */}
                </div>
              </div>
            </div>
          </div>

          {/* Primary actions */}
          <div className="mt-4 space-y-2">
            <button
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center justify-between rounded-2xl border border-[#2a2a2a] bg-gradient-to-br from-black/60 to-black/30 hover:from-black hover:to-black px-3 py-2.5 text-left transition-colors"
            >
              <span className="text-[#CBAA5A] font-gilroy tracking-[0.15em] uppercase text-[10px] font-bold">Edit Profile</span>
              <Settings className="w-4 h-4 text-[#CBAA5A]" />
            </button>

            <button
              onClick={() => handleTabChange('messages')}
              className="w-full flex items-center justify-between rounded-2xl border border-[#2a2a2a] bg-black/30 hover:bg-black/50 px-3 py-2.5 text-left transition-colors"
            >
              <span className="text-white font-gilroy tracking-[0.12em] uppercase text-[10px]">DMs</span>
              <span className="relative">
                <MessageSquare className="w-4 h-4 text-[#888]" />
                {notificationCounts?.unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {notificationCounts.unreadMessages > 9 ? '9+' : notificationCounts.unreadMessages}
                  </span>
                )}
              </span>
            </button>

            <button
              onClick={() => setShowPublicPreview(!showPublicPreview)}
              className="w-full flex items-center justify-between rounded-2xl border border-[#2a2a2a] bg-black/30 hover:bg-black/50 px-3 py-2.5 text-left transition-colors"
            >
              <span className="text-white font-gilroy tracking-[0.12em] uppercase text-[10px]">
                {showPublicPreview ? 'Exit Public' : 'Public Preview'}
              </span>
              {showPublicPreview ? <EyeOff className="w-4 h-4 text-[#CBAA5A]" /> : <Eye className="w-4 h-4 text-[#888]" />}
            </button>
          </div>

          {/* Divider */}
          <div className="my-5 h-px bg-gradient-to-r from-transparent via-[#222] to-transparent" />

          {/* Navigation */}
          <div>
            <div className="text-[#666] font-gilroy tracking-[0.22em] uppercase text-[9px] mb-2">Navigation</div>
            <div className="space-y-2">
              {[
                { key: 'info', label: 'Info' },
                { key: 'intros', label: 'Intros' },
                { key: 'network', label: 'Network' },
              ].map((item) => {
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => { handleTabChange(item.key); if (item.key === 'info') setShowSettings(false); }}
                    className={`w-full rounded-2xl border px-3 py-2.5 text-left font-gilroy tracking-[0.14em] uppercase text-[10px] transition-all ${
                      isActive
                        ? 'border-[#CBAA5A]/70 bg-[#CBAA5A]/10 text-[#CBAA5A] shadow-[0_0_0_1px_rgba(203,170,90,0.25)]'
                        : 'border-[#2a2a2a] bg-black/20 text-[#bbb] hover:text-white hover:bg-black/40 hover:border-[#444]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="flex-1">
          {/* Public Preview Banner (desktop) */}
          {showPublicPreview && (
            <div className="bg-[#CBAA5A]/10 border-b border-[#CBAA5A]/30 px-6 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#CBAA5A]" />
                  <span className="font-gilroy tracking-[0.1em] uppercase text-[10px] text-[#CBAA5A]">Public View Preview</span>
                  <span className="text-[9px] text-[#888]">— what others see</span>
                </div>
                <button onClick={() => setShowPublicPreview(false)} className="text-[#CBAA5A] hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          
          {/* Tab Content */}
          <div className="container mx-auto px-4 md:px-6 py-4 md:py-6 max-w-6xl">
        
        {/* INFO Tab */}
        {activeTab === 'info' && (
          <>
            {/* Settings View within INFO tab */}
            {showSettings ? (
              <div className="space-y-4">
                {/* Settings Header with Back Button */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="flex items-center gap-2 text-[#888] hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="font-gilroy tracking-[0.15em] uppercase text-[10px]">GO BACK</span>
                  </button>
                  <h2 className="font-gilroy tracking-[0.15em] uppercase text-sm text-white">SETTINGS</h2>
                  <div className="w-20"></div>
                </div>

                {/* Profile Facets (edit mode only) */}
                <div className="rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                  <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888] mb-3">PROFILE FACETS</h3>
                  <ProfileFacetsCard />
                </div>

                {/* WhatsApp (invites + contact sync)
                    Names are pulled via existing Supabase Google provider_token if available. */}
                <WhatsAppConnectCard />
                <GoogleCalendarConnectCard />

                {/* Profile Edit Section */}
                <div className="rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                  <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888] mb-3">EDIT PROFILE</h3>
                  
                  {/* Avatar Upload */}
                  <div className="flex items-center gap-4 mb-4 pb-4 border-b border-[#222]">
                    <div className="relative">
                      <Avatar className="h-16 w-16 border-2 border-[#CBAA5A]/30">
                        <AvatarImage src={avatarPreview || user?.avatar} />
                        <AvatarFallback className="text-lg font-gilroy bg-gradient-to-br from-[#1a1a1a] to-black text-[#CBAA5A]">
                          {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <label
                        htmlFor="avatar-settings-upload"
                        className="absolute -bottom-1 -right-1 bg-[#CBAA5A] text-black p-1.5 rounded-full cursor-pointer hover:bg-white transition-colors"
                      >
                        <Camera className="h-3 w-3" />
                      </label>
                      <input
                        type="file"
                        id="avatar-settings-upload"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarSelect}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-gilroy tracking-[0.1em] uppercase text-[10px] text-white">{user?.firstName} {user?.lastName}</p>
                      <p className="text-[#666] font-gilroy tracking-[0.1em] text-[9px] uppercase">{user?.email}</p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666]">FIRST NAME</Label>
                        <Input
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          className="bg-black border-[#333] text-white font-gilroy text-sm h-9 mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666]">LAST NAME</Label>
                        <Input
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          className="bg-black border-[#333] text-white font-gilroy text-sm h-9 mt-1"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666]">BIO</Label>
                      <Textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        className="bg-black border-[#333] text-white font-gilroy text-sm min-h-[60px] resize-none mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666]">LINKEDIN</Label>
                      <Input
                        value={formData.linkedinUrl}
                        onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                        placeholder="https://linkedin.com/in/..."
                        className="bg-black border-[#333] text-white font-gilroy text-sm h-9 mt-1"
                      />
                      <div className="mt-2 flex items-center justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-[#333] text-white hover:bg-[#1a1a1a] h-9"
                          onClick={handleEnrichFromLinkedIn}
                          disabled={linkedinEnriching || !resolvedLinkedInUrl || !isResolvedLinkedInValid}
                        >
                          {linkedinEnriching ? 'Syncing…' : 'Sync from LinkedIn'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recalculate Social Capital (edit mode only) */}
                <div className="rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                  <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888] mb-3">SOCAP</h3>
                  <SocialCapitalScorePremium
                    score={currentScore}
                    onCalculate={handleCalculateScore}
                    onViewBreakdown={handleShowBreakdown}
                    onInvite={() => setShowInviteFriendModal(true)}
                    calculating={calculatingScore || scoreLoading}
                  />
                </div>

                {/* Venture/GitHub/Product/Pitch removed */}

                {/* Currency Preference */}
                <div className="rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                  <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888] mb-3">CURRENCY</h3>
                  <Select value={selectedCurrency} onValueChange={(value: Currency) => setSelectedCurrency(value)}>
                    <SelectTrigger className="bg-black border-[#333] text-white font-gilroy text-sm h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-[#333]">
                      <SelectItem value="INR" className="text-white font-gilroy">₹ INR</SelectItem>
                      <SelectItem value="USD" className="text-white font-gilroy">$ USD</SelectItem>
                      <SelectItem value="EUR" className="text-white font-gilroy">€ EUR</SelectItem>
                      <SelectItem value="GBP" className="text-white font-gilroy">£ GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Telegram Settings */}

                {/* Organizations Management */}
                <div className="rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                  <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888] mb-3">MANAGE ORGANIZATIONS</h3>
                  <OrganizationSearch userId={user?.id || ''} />
                </div>

                {/* Featured Connections Management */}
                <div className="rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                  <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888] mb-3">MANAGE FEATURED CONNECTIONS</h3>
                  <FeaturedConnectionSelector />
                </div>

                {/* Save Changes Button */}
            <Button
                  onClick={async () => {
                    // Save everything the user can edit in this modal.
                    await handleSave();
                    if (selectedCurrency !== userCurrency) {
                      await handleCurrencySave();
                    }
                    setShowSettings(false);
                  }}
                  disabled={loading}
                  className="w-full bg-[#CBAA5A] text-black hover:bg-white font-gilroy tracking-[0.15em] uppercase text-[10px] h-10"
                >
                  {loading ? 'SAVING...' : 'SAVE CHANGES'}
            </Button>
          </div>
            ) : (
              <>
                {/* Edit Profile Button - Above the cards, right aligned */}
                <div className="flex justify-end mb-3">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#333] hover:border-[#CBAA5A] bg-black text-[#888] hover:text-[#CBAA5A] transition-colors"
                  >
                    <Settings className="w-3 h-3" />
                    <span className="text-[10px] font-gilroy font-bold tracking-[0.15em] uppercase">EDIT PROFILE</span>
                  </button>
                </div>
                
                {/* Masonry grid (Pinterest zig-zag) */}
                <div className="mt-4 columns-1 md:columns-2 xl:columns-3 gap-4 [column-fill:_balance]">
                  {/* PROFILE (card-sized, same width as other cards) */}
                  <div className="mb-4 break-inside-avoid rounded-2xl border border-[#222] bg-black overflow-hidden">
                    <div className="relative">
                      <div className="aspect-[4/3] bg-[#0b0b0b]">
                        {user?.avatar ? (
                          <img
                            src={avatarPreview || user.avatar}
                            alt={`${user?.firstName} ${user?.lastName}`}
                            className="w-full h-full object-cover object-center"
                            style={{ filter: 'grayscale(1) contrast(1.1) brightness(0.9)' }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="font-riccione text-6xl text-[#333]">
                              {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* SoCap badge */}
                      <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-[#333]">
                        <div className="flex items-center gap-1 mb-0.5">
                          <TrendingUp className="w-3 h-3 text-[#888]" strokeWidth={2.5} />
                          <span className="text-[8px] font-gilroy font-bold tracking-[0.15em] text-[#666] uppercase">
                            SOCAP
                          </span>
                        </div>
                        <div className={`font-riccione text-[28px] leading-none tracking-tight ${currentScore >= 100 ? 'text-[#CBAA5A]' : currentScore >= 50 ? 'text-white' : currentScore >= 10 ? 'text-[#aaa]' : 'text-[#888]'}`}>
                          {profileDataLoading ? '—' : (currentScore || 0)}
                        </div>
                        <div className="text-[8px] font-gilroy font-bold tracking-[0.2em] text-[#555] uppercase mt-0.5">
                          {profileDataLoading ? '...' : (currentScore >= 100 ? 'ELITE' : currentScore >= 50 ? 'NETWORKER' : currentScore >= 10 ? 'RISING' : 'EMERGING')}
                        </div>
                      </div>

                      {/* Share */}
                      <button
                        onClick={() => {
                          const publicProfileUrl = `${window.location.origin}/profile/${user?.id}`;
                          if (navigator.share) {
                            navigator.share({
                              title: `${user?.firstName}'s Profile on Zaurq`,
                              text: `Check out ${user?.firstName}'s network and Social Capital Score on Zaurq!`,
                              url: publicProfileUrl,
                            });
                          } else {
                            navigator.clipboard.writeText(publicProfileUrl);
                            toast({ title: 'Link Copied', description: 'Your public profile link has been copied!' });
                          }
                        }}
                        className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm rounded-full px-3 py-1 border border-[#333] hover:border-[#CBAA5A]/50 transition-colors flex items-center gap-1"
                        title="Share"
                      >
                        <Share2 className="w-3 h-3 text-[#888]" />
                        <span className="text-[10px] text-[#888] uppercase tracking-[0.2em] font-gilroy font-bold">
                          SHARE
                        </span>
                      </button>
                    </div>

                    <div className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[10px] text-[#aaa] border border-[#444] px-2.5 py-1.5 rounded-full tracking-[0.1em] bg-black/50 font-gilroy font-medium uppercase">
                          {user?.firstName} {user?.lastName}
                        </span>
                        <span className="text-[9px] text-[#777] border border-[#333] px-2.5 py-1.5 rounded-full tracking-[0.15em] uppercase bg-black/50 font-gilroy font-medium">
                          {user?.email?.split('@')[0]}
                        </span>
                      </div>

                      {collageOrganizations && collageOrganizations.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {collageOrganizations.slice(0, 4).map((org: any, i: number) => (
                            <div key={i} className="w-9 h-9 rounded-lg bg-white/10 border border-[#333] p-1.5 flex items-center justify-center">
                              {org.logo_url ? (
                                <img
                                  src={getCloudinaryLogoUrl(org.logo_url, 96)}
                                  alt={org.name || 'Organization'}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <Building2 className="w-4 h-4 text-[#666]" />
                              )}
                            </div>
                          ))}
                          {collageOrganizations.length > 4 && (
                            <div className="w-9 h-9 rounded-lg bg-[#1a1a1a] border border-[#333] flex items-center justify-center">
                              <span className="text-[9px] text-[#888] font-gilroy font-bold">+{collageOrganizations.length - 4}</span>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* GitHub / Venture / Product demo removed */}

                  {/* Pitch removed */}

                  {/* ABOUT */}
                  <div className="mb-4 break-inside-avoid rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">ABOUT</h3>
                      <button
                        onClick={() => setShowSettings(true)}
                        className="text-[#CBAA5A] font-gilroy tracking-[0.1em] uppercase text-[9px] hover:underline"
                      >
                        EDIT
                      </button>
                    </div>
                    {(user?.bio || formData.bio) ? (
                      <p className="text-white font-gilroy tracking-[0.05em] text-sm leading-relaxed whitespace-pre-wrap">
                        {formData.bio || user?.bio}
                      </p>
                    ) : (
                      <p className="text-[#555] font-gilroy tracking-[0.05em] text-sm leading-relaxed italic">
                        Add a bio to tell others about yourself.
                      </p>
                    )}
                  </div>

                  {/* (Removed) YOUR ACTIVITY — profile should not look like a form/dashboard; keep everything editable in Edit Profile mode */}

                  {/* WORK EXPERIENCE (single card) */}
                  <div className="mb-4 break-inside-avoid rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">WORK EXPERIENCE</h3>
                      <button
                        onClick={() => setShowSettings(true)}
                        className="text-[#CBAA5A] font-gilroy tracking-[0.1em] uppercase text-[9px] hover:underline"
                      >
                        EDIT
                      </button>
                    </div>

                    {userOrganizations.length === 0 ? (
                      <div className="text-[#666] font-gilroy text-sm">
                        Add your work experience in Edit Profile → Manage Organizations.
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2 max-h-[520px] overflow-y-auto pr-1 scrollbar-hide">
                        {userOrganizations.map((org: any, i: number) => (
                          <div
                            key={org?.id || org?.name || i}
                            className="flex items-center gap-3 rounded-xl border border-[#2a2a2a] bg-black/30 p-3"
                          >
                            <div className="w-11 h-11 rounded-xl bg-white/5 border border-[#333] flex items-center justify-center p-2 flex-shrink-0">
                              {org?.logo_url ? (
                                <img
                                  src={getCloudinaryLogoUrl(org.logo_url, 120)}
                                  alt={org?.name || 'Organization'}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <Building2 className="w-5 h-5 text-[#555]" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-white font-gilroy tracking-[0.05em] uppercase text-[11px] truncate">
                                {org?.name || 'Organization'}
                              </div>
                              {org?.role && (
                                <div className="mt-0.5 text-[#aaa] font-gilroy text-[11px] truncate">
                                  {org.role}
                                </div>
                              )}
                              {org?.type && (
                                <div className="mt-1 text-[9px] text-[#666] font-gilroy tracking-[0.18em] uppercase">
                                  {String(org.type)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* CONNECTION STORIES (each story = its own pinterest-style card) */}
                  {!connectionStoriesLoading && (
                    <>
                      {connectionStories.map((story: any) => (
                        <div key={story.id}>
                          <ConnectionStoryCard
                            story={story}
                            isOwner={true}
                            onEdit={(s) => {
                              setEditingStory(s as any);
                              setShowAddStoryModal(true);
                            }}
                            onDelete={handleDeleteStory}
                            onClick={() => {
                              // no-op for now; could open a story modal later
                            }}
                            className={undefined}
                          />
                        </div>
                      ))}
                      {connectionStories.length === 0 && (
                        <div className="mb-4 break-inside-avoid rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">CONNECTION STORIES</h3>
                            <button
                              onClick={() => setShowSettings(true)}
                              className="text-[#CBAA5A] font-gilroy tracking-[0.1em] uppercase text-[9px] hover:underline"
                            >
                              EDIT
                            </button>
                          </div>
                          <div className="text-[#666] font-gilroy text-sm">
                            Add your stories in Edit Profile.
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {connectionStoriesLoading && (
                    <div className="mb-4 break-inside-avoid rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                      <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888] mb-3">CONNECTION STORIES</h3>
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#CBAA5A]"></div>
                      </div>
                      <div className="mt-auto" />
                    </div>
                  )}

                  {/* EMAIL VERIFICATION */}
                  <div className="mb-4 break-inside-avoid">
                    <EmailVerificationBanner />
                  </div>

                  {/* Revenue/Stripe/Razorpay removed */}

                  {/* LINKEDIN ENRICHMENT */}
                  <div className="mb-4 break-inside-avoid rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Linkedin className="w-4 h-4 text-[#CBAA5A]" />
                        <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">LINKEDIN</h3>
                        {linkedinScrape?.lastScrapedAt && (
                          <span className="text-[9px] font-gilroy tracking-[0.1em] uppercase text-[#555]">
                            synced {formatRelativeTime(linkedinScrape.lastScrapedAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-[#333] text-white hover:bg-[#1a1a1a] h-8 px-3"
                          onClick={handleEnrichFromLinkedIn}
                          disabled={linkedinEnriching || linkedinHydrating || !resolvedLinkedInUrl || !isResolvedLinkedInValid}
                        >
                          {linkedinEnriching ? 'Syncing…' : linkedinHydrating ? 'Refreshing…' : 'Sync'}
                        </Button>
                        <button
                          onClick={() => setShowSettings(true)}
                          className="text-[#CBAA5A] font-gilroy tracking-[0.1em] uppercase text-[9px] hover:underline"
                        >
                          EDIT
                        </button>
                      </div>
                    </div>
                    <div className="rounded-xl border border-[#333] bg-black/40 p-3">
                      {linkedinScrape?.profile ? (
                        <div className="flex gap-3">
                          <div className="w-12 h-12 rounded-xl border border-[#333] bg-[#0a0a0a] overflow-hidden flex items-center justify-center shrink-0">
                            {linkedinScrape.profile.profilePic ? (
                              <img
                                src={linkedinScrape.profile.profilePic}
                                alt="LinkedIn profile"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="font-riccione text-[#CBAA5A] text-sm">
                                {user.firstName?.[0]}{user.lastName?.[0]}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-white font-gilroy text-sm truncate">
                              {linkedinScrape.profile.headline ||
                                [linkedinScrape.profile.jobTitle, linkedinScrape.profile.companyName].filter(Boolean).join(' @ ') ||
                                'Synced'}
                            </div>
                            {(linkedinScrape.profile.location || linkedinScrape.profile.linkedinUrl) && (
                              <div className="mt-0.5 text-[#666] text-[10px] font-gilroy tracking-[0.05em] flex items-center gap-2 truncate">
                                {linkedinScrape.profile.location && <span className="truncate">{linkedinScrape.profile.location}</span>}
                                {linkedinScrape.profile.linkedinUrl && (
                                  <a
                                    href={linkedinScrape.profile.linkedinUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[#CBAA5A] hover:underline inline-flex items-center gap-1 shrink-0"
                                  >
                                    View <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            )}

                            {(linkedinScrape.profile.followers || linkedinScrape.profile.connections) && (
                              <div className="mt-1 text-[#777] text-[10px] font-gilroy tracking-[0.08em] uppercase">
                                {typeof linkedinScrape.profile.followers === 'number' ? `${linkedinScrape.profile.followers} followers` : null}
                                {typeof linkedinScrape.profile.followers === 'number' && typeof linkedinScrape.profile.connections === 'number'
                                  ? ' • '
                                  : null}
                                {typeof linkedinScrape.profile.connections === 'number'
                                  ? `${linkedinScrape.profile.connections} connections`
                                  : null}
                              </div>
                            )}

                            {Array.isArray(linkedinScrape.profile.experiences) && linkedinScrape.profile.experiences.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <div className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666]">
                                  Recent experience
                                </div>
                                {linkedinScrape.profile.experiences.slice(0, 3).map((exp, idx) => (
                                  <div key={idx} className="flex items-start gap-2">
                                    <div className="w-7 h-7 rounded-lg border border-[#333] bg-[#0a0a0a] overflow-hidden flex items-center justify-center shrink-0">
                                      {exp.logo ? (
                                        <img src={exp.logo} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <Building2 className="w-3.5 h-3.5 text-[#666]" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-white text-[11px] font-gilroy truncate">
                                        {exp.title || 'Role'}
                                      </div>
                                      <div className="text-[#666] text-[10px] font-gilroy truncate">
                                        {[exp.companyName, exp.employmentType].filter(Boolean).join(' • ')}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : resolvedLinkedInUrl ? (
                        <div className="text-[#888] font-gilroy text-sm">
                          {linkedinEnriching || linkedinHydrating ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#CBAA5A]" />
                              <div>
                                Fetching your latest LinkedIn data…
                                <div className="mt-1 text-[10px] text-[#666] font-gilroy tracking-[0.05em]">
                                  This usually takes a few seconds.
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>LinkedIn URL is set — click “Sync” to pull your headline, current role, and experience.</>
                          )}
                        </div>
                      ) : (
                        <div className="text-[#888] font-gilroy text-sm">
                          Add your LinkedIn URL in Edit Profile, then sync to pull your headline, current role, and experience.
                        </div>
                      )}
                    </div>
                    <div className="mt-auto" />
                  </div>
                </div>

              </>
            )}
          </>
        )}

        {/* MY REQUESTS Tab temporarily disabled */}
        {false && activeTab === 'requests' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">MY REQUESTS</h3>
              <Button 
                  onClick={() => navigate('/create')}
                size="sm" 
                  className="bg-[#CBAA5A] text-black hover:bg-white font-gilroy tracking-[0.15em] uppercase text-[9px] h-7 px-3"
              >
                  CREATE REQUEST
              </Button>
            </div>
              
              {requestsLoading ? (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#CBAA5A] mx-auto"></div>
                </div>
              ) : myRequests.length === 0 ? (
                <div className="text-center py-6">
                  <Network className="h-8 w-8 mx-auto mb-2 text-[#333]" />
                  <p className="text-[#666] font-gilroy tracking-[0.15em] uppercase text-[10px] mb-3">
                    NO REQUESTS YET
                  </p>
            <Button
                    onClick={() => navigate('/create')}
              size="sm"
                    className="bg-[#CBAA5A] text-black hover:bg-white font-gilroy tracking-[0.15em] uppercase text-[9px]"
            >
                    CREATE REQUEST
            </Button>
          </div>
              ) : (
                <div className="space-y-3">
                  {myRequests.map((request: any) => (
                    <div key={request.id} className="rounded-xl border border-[#333] bg-gradient-to-br from-[#111] to-black p-4 hover:border-[#CBAA5A]/50 transition-colors cursor-pointer">
                      {/* Header: Target + Status */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-gilroy tracking-[0.1em] uppercase text-[11px] text-white line-clamp-2 mb-1">
                            {request.target || 'Untitled Request'}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-gilroy tracking-[0.15em] uppercase ${
                              request.status === 'active' 
                                ? 'bg-[#CBAA5A]/20 text-[#CBAA5A] border border-[#CBAA5A]/30' 
                                : request.status === 'completed'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-[#333] text-[#888] border border-[#444]'
                            }`}>
                              {request.status?.toUpperCase() || 'ACTIVE'}
                            </span>
                            {request.reward > 0 && (
                              <span className="text-[9px] font-gilroy text-[#CBAA5A]">
                                ₹{request.reward} reward
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Message Preview - Normal case for readability */}
                      {request.message && (
                        <p className="text-[#888] text-[11px] font-gilroy line-clamp-2 mb-3">
                          {request.message}
                        </p>
                      )}

                      {/* Stats Row */}
                      <div className="flex items-center gap-4 text-[#666] pt-2 border-t border-[#222]">
                        {request.expires_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span className="text-[9px] font-gilroy">
                              {new Date(request.expires_at) > new Date() 
                                ? `Expires ${new Date(request.expires_at).toLocaleDateString()}`
                                : 'Expired'
                              }
                            </span>
                          </div>
                        )}
                        {request.shareable_link && (
                          <div className="flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            <span className="text-[9px] font-gilroy text-[#CBAA5A]">
                              Shareable link
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* OLD ABOUT TAB - TO BE REMOVED */}
        {false && (
          <>
        {/* Premium Profile Header */}
        <div className="relative mb-12">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#CBAA5A]/5 via-transparent to-transparent rounded-[32px] -z-10" />
          
          <div className="text-center pt-8 pb-4">
            {/* Avatar with premium styling */}
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-[#CBAA5A] to-[#8B7355] rounded-full blur-xl opacity-30 scale-110" />
              
              {/* Clickable avatar to view full photo */}
              <button
                onClick={() => user.avatar && setShowPhotoModal(true)}
                className="relative group"
                disabled={!user.avatar}
              >
                <Avatar className="h-32 w-32 border-4 border-[#CBAA5A]/30 relative cursor-pointer grayscale">
                  <AvatarImage src={avatarPreview || user.avatar} className="grayscale" />
                  <AvatarFallback className="text-3xl font-gilroy bg-gradient-to-br from-[#1a1a1a] to-black text-[#CBAA5A]">
                    {user.firstName[0]}{user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                {/* View overlay on hover */}
                {user.avatar && (
                  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="h-8 w-8 text-white" />
                  </div>
                )}
              </button>
              
              <input
                type="file"
                id="avatar-upload"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarSelect}
              />
              
              {/* Camera button to change photo */}
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-[#CBAA5A] text-black p-2.5 rounded-full cursor-pointer hover:bg-white transition-colors shadow-lg"
              >
                <Camera className="h-4 w-4" />
              </label>
            </div>
            
            {/* Photo action buttons */}
            {user.avatar && !avatarFile && (
              <div className="flex gap-2 justify-center mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPhotoModal(true)}
                  className="border-[#333] text-[#888] hover:border-[#CBAA5A] hover:text-[#CBAA5A] font-gilroy tracking-[0.1em] uppercase text-xs"
                >
                  <Eye className="h-3 w-3 mr-2" />
                  View Photo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAvatarDelete}
                  disabled={deletingAvatar}
                  className="border-[#333] text-[#888] hover:border-red-500 hover:text-red-500 font-gilroy tracking-[0.1em] uppercase text-xs"
                >
                  {deletingAvatar ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete Photo
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {avatarFile && (
              <div className="mb-6 space-y-3">
                <p className="text-sm text-[#888] font-gilroy tracking-[0.1em]">
                  Selected: {avatarFile.name}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={handleAvatarUpload}
                    disabled={uploadingAvatar}
                    size="sm"
                    className="bg-[#CBAA5A] text-black hover:bg-white font-gilroy tracking-[0.1em] uppercase text-xs"
                  >
                    {uploadingAvatar ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatarPreview(null);
                    }}
                    size="sm"
                    disabled={uploadingAvatar}
                    className="border-[#333] text-[#888] hover:border-[#CBAA5A] hover:text-[#CBAA5A] font-gilroy tracking-[0.1em] uppercase text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            
            <h1 className="font-riccione text-4xl text-white mb-2">{user.firstName} {user.lastName}</h1>
            <p className="text-[#666] font-gilroy tracking-[0.15em] uppercase text-sm">{user.email}</p>
          </div>
        </div>

        {/* LinkedIn Optional Info */}
        {!user.linkedinUrl && (
          <Alert className="mb-6 border-[#333] bg-[#111] rounded-2xl">
            <AlertTriangle className="h-4 w-4 text-[#CBAA5A]" />
            <AlertDescription className="text-[#888] font-gilroy">
              <strong className="text-white">LinkedIn Optional:</strong> Adding your LinkedIn profile URL helps others connect with you professionally.
            </AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {saved && (
          <Alert className="mb-6 border-[#CBAA5A]/30 bg-[#CBAA5A]/10 rounded-2xl">
            <CheckCircle className="h-4 w-4 text-[#CBAA5A]" />
            <AlertDescription className="text-[#CBAA5A] font-gilroy">
              Profile updated successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* All profile sections with consistent spacing */}
        <div className="space-y-8">
        
        {/* Social Capital Score Section - Premium Display - MOVED TO TOP */}
        <SocialCapitalScorePremium
          score={currentScore}
          onCalculate={handleCalculateScore}
          onViewBreakdown={handleShowBreakdown}
          onInvite={() => setShowInviteFriendModal(true)}
          calculating={calculatingScore || scoreLoading}
        />

        {/* Organizations Section */}
        <div className="rounded-[24px] border-2 border-[#222] bg-gradient-to-br from-[#111] to-black p-6 md:p-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-5 w-5 text-[#CBAA5A]" />
            <h2 className="font-riccione text-xl text-white">Organizations</h2>
          </div>
          <p className="text-[#666] font-gilroy text-sm tracking-[0.1em] mb-6 uppercase">
            Add your work, education, and affiliations
          </p>
          <OrganizationSearch userId={user.id} />
        </div>

        {/* Featured Connections Section */}
        <div className="rounded-[24px] border-2 border-[#222] bg-gradient-to-br from-[#111] to-black p-6 md:p-8">
          <div className="flex items-center gap-3 mb-2">
            <User className="h-5 w-5 text-[#CBAA5A]" />
            <h2 className="font-riccione text-xl text-white">Featured Connections</h2>
          </div>
          <p className="text-[#666] font-gilroy text-sm tracking-[0.1em] mb-6 uppercase">
            Showcase your top professional connections on your public profile
          </p>
          <FeaturedConnectionSelector />
        </div>

        {/* Profile Form */}
        <div className="rounded-[24px] border-2 border-[#222] bg-gradient-to-br from-[#111] to-black p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <User className="h-5 w-5 text-[#CBAA5A]" />
                <h2 className="font-riccione text-xl text-white">Profile Information</h2>
              </div>
              <p className="text-[#666] font-gilroy text-sm tracking-[0.1em] uppercase">
                {isEditingProfile ? 'Update your profile information' : 'Your personal information'}
              </p>
            </div>
            {!isEditingProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingProfile(true)}
                className="border-[#333] text-[#888] hover:border-[#CBAA5A] hover:text-[#CBAA5A] font-gilroy tracking-[0.1em] uppercase text-xs"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
          <div className="space-y-6">
            {/* Email Display (Read-only) */}
            <div className="space-y-2">
              <Label className="text-[#888] font-gilroy tracking-[0.1em] uppercase text-xs">Email Address</Label>
              <div className="relative">
                <div className="px-4 py-3 bg-[#0a0a0a] rounded-xl border border-[#222] flex items-center justify-between">
                  <span className="text-white font-gilroy">{user.email}</span>
                  {user.isVerified ? (
                    <div className="flex items-center gap-1 text-[#CBAA5A] text-xs font-gilroy tracking-[0.1em] uppercase">
                      <CheckCircle className="h-4 w-4" />
                      Verified
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-orange-500 text-xs font-gilroy tracking-[0.1em] uppercase">
                      <AlertTriangle className="h-4 w-4" />
                      Not Verified
                    </div>
                  )}
                </div>
              </div>
              {!user.isVerified && (
                <div className="space-y-2">
                  <p className="text-xs text-[#666] font-gilroy">
                    Please check your inbox and verify your email address.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResendVerification}
                    disabled={sendingVerification || verificationSent}
                    className="border-[#333] text-[#888] hover:border-[#CBAA5A] hover:text-[#CBAA5A] font-gilroy tracking-[0.1em] uppercase text-xs"
                  >
                    {sendingVerification ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                        Sending...
                      </>
                    ) : verificationSent ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-2" />
                        Email Sent!
                      </>
                    ) : (
                      'Resend Verification Email'
                    )}
                  </Button>
                </div>
              )}
            </div>

            <div className="border-t border-[#222]" />

            {!isEditingProfile ? (
              /* Display Mode */
              <div className="space-y-6">
                {/* Name Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[#666] font-gilroy tracking-[0.1em] uppercase text-xs">First Name</Label>
                    <p className="text-white font-riccione text-lg">{formData.firstName || 'Not provided'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[#666] font-gilroy tracking-[0.1em] uppercase text-xs">Last Name</Label>
                    <p className="text-white font-riccione text-lg">{formData.lastName || 'Not provided'}</p>
                  </div>
                </div>

                {/* Bio Display */}
                <div className="space-y-1">
                  <Label className="text-[#666] font-gilroy tracking-[0.1em] uppercase text-xs">Bio</Label>
                  <p className="text-[#aaa] font-gilroy whitespace-pre-wrap">{formData.bio || 'No bio provided'}</p>
                </div>

                <div className="border-t border-[#222]" />

                {/* Privacy Display */}
                <div className="flex items-center justify-between rounded-xl border border-[#222] p-4 bg-[#0a0a0a]">
                  <div className="flex items-center gap-3">
                    {formData.isProfilePublic ? (
                      <Eye className="h-5 w-5 text-[#CBAA5A]" />
                    ) : (
                      <EyeOff className="h-5 w-5 text-[#666]" />
                    )}
                    <div>
                      <p className="font-riccione text-white">
                        {formData.isProfilePublic ? 'Public Profile' : 'Private Profile'}
                      </p>
                      <p className="text-sm text-[#666] font-gilroy">
                        {formData.isProfilePublic
                          ? 'Your profile is visible to others'
                          : 'Your profile is hidden from others'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#222]" />

                {/* LinkedIn Display */}
                <div className="space-y-2">
                  <Label className="text-[#666] font-gilroy tracking-[0.1em] uppercase text-xs flex items-center gap-2">
                    <svg className="h-4 w-4 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn Profile
                  </Label>
                  {formData.linkedinUrl ? (
                    <a
                      href={formData.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#CBAA5A] hover:text-white flex items-center gap-2 font-gilroy transition-colors"
                    >
                      View LinkedIn Profile
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <p className="text-[#666] font-gilroy">Not provided</p>
                  )}
                </div>
              </div>
            ) : (
              /* Edit Mode */
              <div className="space-y-6">
                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-[#888] font-gilroy tracking-[0.1em] uppercase text-xs">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="Enter your first name"
                      className="bg-[#0a0a0a] border-[#222] text-white placeholder:text-[#444] focus:border-[#CBAA5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-[#888] font-gilroy tracking-[0.1em] uppercase text-xs">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Enter your last name"
                      className="bg-[#0a0a0a] border-[#222] text-white placeholder:text-[#444] focus:border-[#CBAA5A]"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-[#888] font-gilroy tracking-[0.1em] uppercase text-xs">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="Tell others about yourself..."
                    rows={3}
                    className="bg-[#0a0a0a] border-[#222] text-white placeholder:text-[#444] focus:border-[#CBAA5A]"
                  />
                </div>

                <div className="border-t border-[#222]" />

                {/* Privacy Toggle */}
                <div className="flex items-start justify-between space-x-4 rounded-xl border border-[#222] p-4 bg-[#0a0a0a]">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {formData.isProfilePublic ? (
                        <Eye className="h-4 w-4 text-[#CBAA5A]" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-[#666]" />
                      )}
                      <Label htmlFor="privacy-toggle" className="font-riccione text-white cursor-pointer">
                        {formData.isProfilePublic ? 'Public Profile' : 'Private Profile'}
                      </Label>
                    </div>
                    <p className="text-sm text-[#666] font-gilroy">
                      {formData.isProfilePublic
                        ? 'Your name and email are visible to others in the connection network.'
                        : 'Your name and email are hidden. Only your organizations will be visible.'}
                    </p>
                  </div>
                  <Switch
                    id="privacy-toggle"
                    checked={formData.isProfilePublic}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isProfilePublic: checked }))
                    }
                  />
                </div>

                <div className="border-t border-[#222]" />

                {/* LinkedIn URL */}
                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl" className="text-[#888] font-gilroy tracking-[0.1em] uppercase text-xs flex items-center gap-2">
                    <svg className="h-4 w-4 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn Profile URL (Optional)
                  </Label>
                  <Input
                    id="linkedinUrl"
                    name="linkedinUrl"
                    type="url"
                    value={formData.linkedinUrl}
                    onChange={handleInputChange}
                    placeholder="https://www.linkedin.com/in/your-profile"
                    className={`bg-[#0a0a0a] border-[#222] text-white placeholder:text-[#444] focus:border-[#CBAA5A] ${!isLinkedInValid && formData.linkedinUrl ? 'border-red-500' : ''}`}
                  />
                  {formData.linkedinUrl && (
                    <div className="flex items-center justify-between">
                      {isLinkedInValid ? (
                        <p className="text-xs text-[#CBAA5A] flex items-center gap-1 font-gilroy">
                          <CheckCircle className="h-3 w-3" />
                          Valid LinkedIn URL
                        </p>
                      ) : (
                        <p className="text-xs text-red-500 flex items-center gap-1 font-gilroy">
                          <AlertTriangle className="h-3 w-3" />
                          Please enter a valid LinkedIn URL
                        </p>
                      )}
                      {isLinkedInValid && (
                        <Button variant="ghost" size="sm" asChild className="text-[#888] hover:text-[#CBAA5A]">
                          <a href={formData.linkedinUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Preview
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-[#666] font-gilroy">
                    Your LinkedIn profile helps others connect with you professionally and increases trust in the community.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer Actions */}
          {isEditingProfile && (
            <div className="flex gap-3 mt-6 pt-6 border-t border-[#222]">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditingProfile(false);
                  setFormData({
                    firstName: user?.firstName || '',
                    lastName: user?.lastName || '',
                    bio: user?.bio || '',
                    linkedinUrl: user?.linkedinUrl || '',
                    isProfilePublic: formData.isProfilePublic,
                  });
                }}
                className="flex-1 border-[#333] text-[#888] hover:border-[#CBAA5A] hover:text-[#CBAA5A] font-gilroy tracking-[0.1em] uppercase text-xs"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={loading || (!isLinkedInValid && formData.linkedinUrl !== '')}
                className="flex-1 bg-[#CBAA5A] text-black hover:bg-white font-gilroy tracking-[0.1em] uppercase text-xs"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Currency Preferences */}
        <div className="rounded-[24px] border-2 border-[#222] bg-gradient-to-br from-[#111] to-black p-6 md:p-8">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-5 w-5 text-[#CBAA5A]" />
            <h2 className="font-riccione text-xl text-white">Currency Preferences</h2>
          </div>
          <p className="text-[#666] font-gilroy text-sm tracking-[0.1em] mb-6 uppercase">
            Choose your preferred currency for displaying prices
          </p>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency" className="text-[#888] font-gilroy tracking-[0.1em] uppercase text-xs">Preferred Currency</Label>
              <Select 
                value={selectedCurrency} 
                onValueChange={(value: Currency) => setSelectedCurrency(value)}
              >
                <SelectTrigger id="currency" className="bg-[#0a0a0a] border-[#222] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-[#222]">
                  <SelectItem value="INR" className="text-white hover:bg-[#222]">₹ Indian Rupee (INR)</SelectItem>
                  <SelectItem value="EUR" className="text-white hover:bg-[#222]">€ Euro (EUR)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-[#666] font-gilroy">
                All prices will be displayed in your selected currency.
              </p>
            </div>

            {selectedCurrency !== userCurrency && (
              <Button
                onClick={handleCurrencySave}
                disabled={currencySaving}
                className="w-full bg-[#CBAA5A] text-black hover:bg-white font-gilroy tracking-[0.1em] uppercase text-xs"
              >
                {currencySaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Currency Preference
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Telegram Notifications */}
        </div>
          </>
        )}

        {/* Intros Tab */}
        {activeTab === 'intros' && (
          <div className="space-y-6">
            <IntrosTab />
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="space-y-6">
            <MessagesTab />
          </div>
        )}

        {/* Network Tab */}
        {activeTab === 'network' && (
          <div className="space-y-6">
            <ConnectionsTab onInvite={() => setShowInviteFriendModal(true)} />
          </div>
        )}
      </div>
          </div>
        </div>

      {/* Social Capital Score Breakdown Modal */}
      {scoreBreakdownData && (
        <SocialCapitalBreakdownModal
          open={showScoreBreakdown}
          onClose={() => setShowScoreBreakdown(false)}
          totalScore={scoreBreakdownData.score || 0}
          breakdown={scoreBreakdownData.breakdown || []}
          loading={scoreLoading}
        />
      )}

      {/* Profile Photo View Modal */}
      <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
        <DialogContent className="bg-black border-[#222] max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-[#222]">
            <DialogTitle className="font-riccione text-white text-xl flex items-center justify-between">
              Profile Photo
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPhotoModal(false)}
                className="text-[#888] hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6">
            {/* Full size photo */}
            <div className="relative aspect-square w-full max-w-md mx-auto rounded-2xl overflow-hidden bg-[#111]">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl font-riccione text-[#CBAA5A]">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
              )}
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-3 mt-6">
              <label
                htmlFor="avatar-upload-modal"
                className="flex-1 py-3 rounded-full font-gilroy font-bold text-[11px] tracking-[0.15em] uppercase transition-all bg-[#CBAA5A] text-black hover:bg-white cursor-pointer flex items-center justify-center"
              >
                <Camera className="h-4 w-4 mr-2" />
                Change Photo
              </label>
              <input
                type="file"
                id="avatar-upload-modal"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  handleAvatarSelect(e);
                  setShowPhotoModal(false);
                }}
              />
              
              <Button
                onClick={handleAvatarDelete}
                disabled={deletingAvatar}
                className="flex-1 py-3 rounded-full font-gilroy font-bold text-[11px] tracking-[0.15em] uppercase transition-all border-2 border-red-500/50 bg-transparent text-red-500 hover:bg-red-500 hover:text-white"
              >
                {deletingAvatar ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Photo
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Friend Modal */}
      {showInviteFriendModal && (
        <InviteFriendModal
          isOpen={showInviteFriendModal}
          onClose={() => setShowInviteFriendModal(false)}
          referralLink={`${window.location.origin}/auth${user?.id ? `?ref=${user.id}` : ''}`}
        />
      )}

      {/* Add Connection Story Modal */}
      <AddConnectionStoryModal
        isOpen={showAddStoryModal}
        onClose={() => {
          setShowAddStoryModal(false);
          setEditingStory(null);
        }}
        onSuccess={() => {
          refetchStories();
          setEditingStory(null);
        }}
        editingStory={editingStory}
      />

      {/* Footer with Legal & Company Info */}
      <Footer className="mt-8 mb-20 md:mb-0" />

      {/* Mobile Bottom Navigation - Unified across app */}
      <BottomNavigation />
    </div>
  );
};

export default UserProfile;