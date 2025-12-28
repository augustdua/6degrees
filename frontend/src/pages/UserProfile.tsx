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
import { AddStoryCard, ConnectionStoryCard } from '@/components/ConnectionStoryCard';
import { AddConnectionStoryModal } from '@/components/AddConnectionStoryModal';
import { useConnectionStories } from '@/hooks/useConnectionStories';
import MessagesTab from '@/components/MessagesTab';
import OffersTab from '@/components/OffersTab';
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
import { EmbeddedVideo } from '@/components/profile/EmbeddedVideo';

const UserProfile = () => {
  const { user, updateProfile } = useAuth();
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
    if (newTab === 'offers' && !isPartner) {
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
    } else if (tabFromUrl === 'offers' && !isPartner) {
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
  const [dailyStandups, setDailyStandups] = useState<any[]>([]);
  const [dailyStandupsLoading, setDailyStandupsLoading] = useState(false);
  const [standupStreak, setStandupStreak] = useState<{ streak: number; maxStreak: number; completedToday?: boolean } | null>(null);
  const [founderProject, setFounderProject] = useState<any | null>(null);
  const [founderProjectLoading, setFounderProjectLoading] = useState(false);
  const [founderProjectSaving, setFounderProjectSaving] = useState(false);
  const [founderProjectForm, setFounderProjectForm] = useState({
    name: '',
    tagline: '',
    description: '',
    website_url: '',
    stage: '',
    product_demo_url: '',
    pitch_url: '',
    github_repo_full_name: ''
  });
  const [githubRepos, setGithubRepos] = useState<Array<{ id: number; full_name: string; private: boolean }>>([]);
  const [githubReposLoading, setGithubReposLoading] = useState(false);
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null);
  const githubRepoAutoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [githubCommitCounts, setGithubCommitCounts] = useState<Array<{ date: string; count: number }>>([]);
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

  const loadGitHubRepos = async () => {
    setGithubReposLoading(true);
    try {
      const data = await apiGet(API_ENDPOINTS.GITHUB_REPOS, { skipCache: true });
      setGithubConnected(data?.connected === true);
      setGithubRepos(Array.isArray(data?.repos) ? data.repos : []);
      if (data?.connected === false) {
        toast({
          title: 'GitHub not connected',
          description: 'Connect GitHub to pick a repo.',
        });
      }
    } catch (e: any) {
      console.error('Failed to load GitHub repos:', e);
      setGithubRepos([]);
      setGithubConnected(null);
    } finally {
      setGithubReposLoading(false);
    }
  };

  // Load GitHub connected status (no toast) so view mode can show the correct UI after refresh.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet(API_ENDPOINTS.GITHUB_REPOS, { skipCache: true });
        if (!cancelled) setGithubConnected(data?.connected === true);
      } catch {
        if (!cancelled) setGithubConnected(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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

  // Load standup streak (for Streaks tile)
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        const s = await apiGet(`/api/daily-standup/status?timezone=${encodeURIComponent(tz)}`, { skipCache: true });
        if (cancelled) return;
        setStandupStreak({
          streak: Number(s?.streak || 0),
          maxStreak: Number(s?.maxStreak || 0),
          completedToday: !!s?.completedToday,
        });
      } catch {
        if (!cancelled) setStandupStreak(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Load activity stats using backend API (skip cache for fresh data)
  useEffect(() => {
    const loadActivityStats = async () => {
      if (!user?.id) return;

      setActivityStatsLoading(true);
      try {
        // ZAURQ_USER should not see offers/requests-created content in profile activity.
        const includeOffersAndRequests = isPartner;

        let activeOffers = 0;
        let activeRequests = 0;

        if (includeOffersAndRequests) {
          // Fetch offers via backend API - skip cache for fresh counts
          const offersResponse = await apiGet('/api/offers/my/offers', { skipCache: true });
          activeOffers = Array.isArray(offersResponse)
            ? offersResponse.filter((o: any) => o.status === 'active').length
            : 0;

          // Fetch requests via backend API - skip cache for fresh counts
          const requestsResponse = await apiGet('/api/requests/my-requests', { skipCache: true });
          activeRequests = requestsResponse?.requests?.filter((r: any) => r.status === 'active')?.length || 0;
        }

        // Fetch intros via backend API - skip cache for fresh counts
        const introsResponse = await apiGet('/api/offers/my/intros', { skipCache: true });
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

  // Load daily standup history for profile display
  useEffect(() => {
    const loadDailyStandups = async () => {
      if (!user?.id) return;
      setDailyStandupsLoading(true);
      try {
        const data = await apiGet(`${API_ENDPOINTS.DAILY_STANDUP_HISTORY}?limit=10`, { skipCache: true });
        setDailyStandups(Array.isArray(data?.standups) ? data.standups : []);
      } catch (error) {
        console.error('Error loading daily standups:', error);
        setDailyStandups([]);
      } finally {
        setDailyStandupsLoading(false);
      }
    };

    loadDailyStandups();
  }, [user?.id]);

  // Load founder project (single venture) for profile display/editing
  useEffect(() => {
    const loadFounderProject = async () => {
      if (!user?.id) return;
      setFounderProjectLoading(true);
      try {
        const data = await apiGet(API_ENDPOINTS.PROFILE_ME_PROJECT, { skipCache: true });
        const p = data?.project || null;
        setFounderProject(p);
        setFounderProjectForm({
          name: p?.name || '',
          tagline: p?.tagline || '',
          description: p?.description || '',
          website_url: p?.website_url || '',
          stage: p?.stage || '',
          product_demo_url: p?.product_demo_url || '',
          pitch_url: p?.pitch_url || '',
          github_repo_full_name: p?.github_repo_full_name || ''
        });
      } catch (error) {
        console.error('Error loading founder project:', error);
        setFounderProject(null);
      } finally {
        setFounderProjectLoading(false);
      }
    };
    loadFounderProject();
  }, [user?.id]);

  // Load GitHub commit counts for the configured repo (for GitHub card)
  useEffect(() => {
    if (!user?.id) return;
    if (!founderProject?.github_repo_full_name) {
      setGithubCommitCounts([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const g = await apiGet(API_ENDPOINTS.PROFILE_PUBLIC_GITHUB_COMMIT_COUNTS(user.id, 30), { skipCache: true });
        const counts = Array.isArray(g?.counts) ? g.counts : [];
        if (!cancelled) setGithubCommitCounts(counts);
      } catch {
        if (!cancelled) setGithubCommitCounts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, founderProject?.github_repo_full_name]);

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

  const handleSaveFounderProject = async (override?: typeof founderProjectForm) => {
    setFounderProjectSaving(true);
    try {
      const f = override || founderProjectForm;
      const payload = {
        name: f.name,
        tagline: f.tagline,
        description: f.description,
        website_url: f.website_url,
        stage: f.stage,
        product_demo_url: f.product_demo_url,
        pitch_url: f.pitch_url,
        github_repo_full_name: f.github_repo_full_name,
      };
      const data = await apiPut(API_ENDPOINTS.PROFILE_ME_PROJECT, payload);
      setFounderProject(data?.project || null);
      toast({
        title: 'Saved',
        description: 'Your venture info has been updated.',
      });
    } catch (error: any) {
      console.error('Error saving founder project:', error);
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error?.message || 'Please try again.',
      });
    } finally {
      setFounderProjectSaving(false);
    }
  };

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
        <aside className="w-[240px] border-r border-[#222] bg-black/60 backdrop-blur-xl p-4 sticky top-0 h-screen">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#CBAA5A] to-[#8B7355] rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-xs" style={{ fontFamily: 'Riccione-DemiBold, ui-serif, serif' }}>
                  Z
                </span>
              </div>
              <div className="text-white font-gilroy tracking-[0.12em] uppercase text-[10px]">Profile</div>
            </div>
            <button
              onClick={() => navigate('/feed')}
              className="text-[#888] hover:text-white transition-colors"
              title="Back to feed"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center justify-between rounded-xl border border-[#333] bg-black/60 hover:bg-black px-3 py-2 text-left"
            >
              <span className="text-[#CBAA5A] font-gilroy tracking-[0.15em] uppercase text-[10px] font-bold">Edit Profile</span>
              <Settings className="w-4 h-4 text-[#CBAA5A]" />
            </button>

            <button
              onClick={() => handleTabChange('messages')}
              className="w-full flex items-center justify-between rounded-xl border border-[#333] bg-black/40 hover:bg-black/60 px-3 py-2 text-left"
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
              className="w-full flex items-center justify-between rounded-xl border border-[#333] bg-black/40 hover:bg-black/60 px-3 py-2 text-left"
            >
              <span className="text-white font-gilroy tracking-[0.12em] uppercase text-[10px]">
                {showPublicPreview ? 'Exit Public' : 'Public Preview'}
              </span>
              {showPublicPreview ? <EyeOff className="w-4 h-4 text-[#CBAA5A]" /> : <Eye className="w-4 h-4 text-[#888]" />}
            </button>
          </div>

          <div className="mt-5">
            <div className="text-[#666] font-gilroy tracking-[0.18em] uppercase text-[9px] mb-2">Navigation</div>
            <div className="space-y-2">
              <button
                onClick={() => { handleTabChange('info'); setShowSettings(false); }}
                className={`w-full rounded-xl border px-3 py-2 text-left font-gilroy tracking-[0.12em] uppercase text-[10px] transition-colors ${
                  activeTab === 'info' ? 'border-[#CBAA5A] text-[#CBAA5A] bg-black' : 'border-[#333] text-[#bbb] hover:text-white hover:border-[#555]'
                }`}
              >
                Info
              </button>
              {isPartner && (
                <button
                  onClick={() => handleTabChange('offers')}
                  className={`w-full rounded-xl border px-3 py-2 text-left font-gilroy tracking-[0.12em] uppercase text-[10px] transition-colors ${
                    activeTab === 'offers' ? 'border-[#CBAA5A] text-[#CBAA5A] bg-black' : 'border-[#333] text-[#bbb] hover:text-white hover:border-[#555]'
                  }`}
                >
                  Offers
                </button>
              )}
              <button
                onClick={() => handleTabChange('intros')}
                className={`w-full rounded-xl border px-3 py-2 text-left font-gilroy tracking-[0.12em] uppercase text-[10px] transition-colors ${
                  activeTab === 'intros' ? 'border-[#CBAA5A] text-[#CBAA5A] bg-black' : 'border-[#333] text-[#bbb] hover:text-white hover:border-[#555]'
                }`}
              >
                Intros
              </button>
              <button
                onClick={() => handleTabChange('network')}
                className={`w-full rounded-xl border px-3 py-2 text-left font-gilroy tracking-[0.12em] uppercase text-[10px] transition-colors ${
                  activeTab === 'network' ? 'border-[#CBAA5A] text-[#CBAA5A] bg-black' : 'border-[#333] text-[#bbb] hover:text-white hover:border-[#555]'
                }`}
              >
                Network
              </button>
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

                {/* Venture (edit mode only) */}
                <div className="rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">VENTURE</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSaveFounderProject}
                      disabled={founderProjectLoading || founderProjectSaving}
                      className="border-[#333] text-white hover:bg-[#1a1a1a] font-gilroy tracking-[0.15em] uppercase text-[10px] h-8"
                    >
                      {founderProjectSaving ? 'SAVING…' : 'SAVE'}
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 rounded-full text-[9px] font-gilroy tracking-[0.15em] uppercase border border-[#333] bg-black/40 text-[#888]">
                      GitHub {githubConnected === null ? '—' : githubConnected ? 'Connected' : 'Not connected'}
                    </span>
                    {founderProjectForm.github_repo_full_name && (
                      <span className="px-2 py-1 rounded-full text-[9px] font-gilroy tracking-[0.15em] uppercase border border-[#333] bg-black/40 text-[#888]">
                        Repo {founderProjectForm.github_repo_full_name}
                      </span>
                    )}
                  </div>

                  {founderProjectLoading ? (
                    <div className="space-y-2">
                      <div className="h-4 bg-[#222] rounded animate-pulse" />
                      <div className="h-4 bg-[#222] rounded animate-pulse" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666]">NAME</Label>
                          <Input
                            value={founderProjectForm.name}
                            onChange={(e) => setFounderProjectForm((prev) => ({ ...prev, name: e.target.value }))}
                            className="bg-black border-[#333] text-white font-gilroy text-sm h-9 mt-1"
                            placeholder="My Venture"
                          />
                        </div>
                        <div>
                          <Label className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666]">WEBSITE</Label>
                          <Input
                            value={founderProjectForm.website_url}
                            onChange={(e) => setFounderProjectForm((prev) => ({ ...prev, website_url: e.target.value }))}
                            className="bg-black border-[#333] text-white font-gilroy text-sm h-9 mt-1"
                            placeholder="https://..."
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666]">TAGLINE</Label>
                        <Input
                          value={founderProjectForm.tagline}
                          onChange={(e) => setFounderProjectForm((prev) => ({ ...prev, tagline: e.target.value }))}
                          className="bg-black border-[#333] text-white font-gilroy text-sm h-9 mt-1"
                          placeholder="One-line description"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666]">PRODUCT DEMO (LOOM/YOUTUBE)</Label>
                          <Input
                            value={founderProjectForm.product_demo_url}
                            onChange={(e) => setFounderProjectForm((prev) => ({ ...prev, product_demo_url: e.target.value }))}
                            className="bg-black border-[#333] text-white font-gilroy text-sm h-9 mt-1"
                            placeholder="https://..."
                          />
                        </div>
                        <div>
                          <Label className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666]">PITCH (LOOM/YOUTUBE)</Label>
                          <Input
                            value={founderProjectForm.pitch_url}
                            onChange={(e) => setFounderProjectForm((prev) => ({ ...prev, pitch_url: e.target.value }))}
                            className="bg-black border-[#333] text-white font-gilroy text-sm h-9 mt-1"
                            placeholder="https://..."
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666]">FOCUS (WHAT YOU'RE WORKING ON)</Label>
                        <Textarea
                          value={founderProjectForm.description}
                          onChange={(e) => setFounderProjectForm((prev) => ({ ...prev, description: e.target.value }))}
                          className="bg-black border-[#333] text-white font-gilroy text-sm min-h-[80px] resize-none mt-1"
                          placeholder="e.g. Shipping v1 onboarding + 10 founder interviews this week"
                        />
                      </div>

                      <div>
                        <Label className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666]">GITHUB REPO (owner/repo)</Label>
                        <div className="flex flex-col md:flex-row gap-2 mt-1">
                          <Button
                            type="button"
                            variant="outline"
                            className="border-[#333] text-white hover:bg-[#1a1a1a] font-gilroy tracking-[0.15em] uppercase text-[10px] h-9"
                            onClick={() => {
                              const base = API_BASE_URL || window.location.origin;
                              window.location.href = `${base}${API_ENDPOINTS.GITHUB_CONNECT}?return_to=${encodeURIComponent(window.location.origin)}`;
                            }}
                          >
                            Connect GitHub
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-[#333] text-white hover:bg-[#1a1a1a] font-gilroy tracking-[0.15em] uppercase text-[10px] h-9"
                            onClick={loadGitHubRepos}
                            disabled={githubReposLoading}
                          >
                            {githubReposLoading ? 'Loading repos…' : 'Choose repo'}
                          </Button>
                        </div>

                        {githubRepos.length > 0 ? (
                          <Select
                            value={founderProjectForm.github_repo_full_name}
                            onValueChange={(v) => {
                              const next = { ...founderProjectForm, github_repo_full_name: v };
                              setFounderProjectForm(next);
                              // Persist quickly so refresh shows the repo immediately.
                              if (githubRepoAutoSaveTimer.current) clearTimeout(githubRepoAutoSaveTimer.current);
                              githubRepoAutoSaveTimer.current = setTimeout(() => {
                                handleSaveFounderProject(next);
                              }, 600);
                            }}
                          >
                            <SelectTrigger className="mt-2 bg-black border-[#333] text-white font-gilroy text-sm h-9">
                              <SelectValue placeholder="Select a repo" />
                            </SelectTrigger>
                            <SelectContent className="bg-black border-[#333]">
                              {githubRepos.map((r) => (
                                <SelectItem key={r.id} value={r.full_name} className="text-white font-gilroy">
                                  {r.full_name}
                                  {r.private ? ' (private)' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={founderProjectForm.github_repo_full_name}
                            onChange={(e) => setFounderProjectForm((prev) => ({ ...prev, github_repo_full_name: e.target.value }))}
                            className="bg-black border-[#333] text-white font-gilroy text-sm h-9 mt-2"
                            placeholder="e.g. myorg/myrepo"
                          />
                        )}

                        <p className="text-[10px] text-[#666] font-gilroy mt-2">
                          Repo powers your public commit-count credibility (no code is shown).
                        </p>
                      </div>
                    </div>
                  )}
                </div>

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
                
                {/* Hero (shareable) */}
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-4 items-start">
                  
                  {/* Left Column - User Card (EXACT LeaderboardCard Design) */}
                  <div className="flex flex-col gap-4 items-stretch">
                    <div 
                      className="group relative bg-black rounded-[20px] md:rounded-[24px] border border-[#1a1a1a] hover:border-[#CBAA5A] overflow-hidden flex shadow-2xl transition-all duration-300 cursor-pointer snap-center flex-shrink-0 w-full h-[280px] sm:h-[300px] md:h-[320px]"
                    >
                      {/* Left Side - Content */}
                      <div className="relative z-10 flex flex-col h-full p-4 sm:p-5 w-[55%] sm:w-[50%]">
                        {/* Score Badge */}
                        <div className="bg-gradient-to-br from-[#2a2a2a] via-[#1a1a1a] to-[#0f0f0f] rounded-xl p-2 border border-[#333] group-hover:border-[#CBAA5A]/50 w-fit mb-auto transition-colors duration-300">
                          <div className="flex items-center gap-1 mb-0.5">
                            <TrendingUp className="w-3 h-3 text-[#888] group-hover:text-[#CBAA5A] transition-colors duration-300" strokeWidth={2.5} />
                            <span className="text-[8px] font-gilroy font-bold tracking-[0.15em] text-[#666] group-hover:text-[#CBAA5A]/70 uppercase transition-colors duration-300">
                              SOCAP
                            </span>
                          </div>
                          {profileDataLoading ? (
                            <div className="h-10 w-16 bg-[#333] rounded animate-pulse my-1" />
                          ) : (
                            <div className={`font-riccione text-[28px] sm:text-[32px] md:text-[34px] leading-none tracking-tight group-hover:text-[#CBAA5A] transition-colors duration-300 ${currentScore >= 100 ? 'text-[#CBAA5A]' : currentScore >= 50 ? 'text-white' : currentScore >= 10 ? 'text-[#aaa]' : 'text-[#888]'}`}>
                              {currentScore || 0}
                            </div>
                          )}
                          <div className="text-[8px] font-gilroy font-bold tracking-[0.2em] text-[#555] group-hover:text-[#CBAA5A]/70 uppercase mt-0.5 transition-colors duration-300">
                            {profileDataLoading ? '...' : (currentScore >= 100 ? 'ELITE' : currentScore >= 50 ? 'NETWORKER' : currentScore >= 10 ? 'RISING' : 'EMERGING')}
                          </div>
                        </div>

                        {/* Name and Position as Tags */}
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3">
                          <span className="text-[10px] sm:text-[11px] text-[#aaa] group-hover:text-[#CBAA5A] border border-[#444] group-hover:border-[#CBAA5A]/50 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full tracking-[0.1em] bg-black/50 backdrop-blur-sm font-gilroy font-medium transition-colors duration-300 uppercase">
                            {user?.firstName} {user?.lastName}
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-[#777] group-hover:text-[#CBAA5A] border border-[#333] group-hover:border-[#CBAA5A]/50 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full tracking-[0.15em] uppercase bg-black/50 backdrop-blur-sm font-gilroy font-medium transition-colors duration-300">
                            {user?.email?.split('@')[0]}
                          </span>
                        </div>

                        {/* Organization Logos - Colored (exactly like leaderboard) */}
                        {collageOrganizations && collageOrganizations.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {collageOrganizations.slice(0, 4).map((org: any, i: number) => (
                              <div 
                                key={i} 
                                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/10 backdrop-blur-sm border border-[#333] group-hover:border-[#CBAA5A]/30 p-1.5 flex items-center justify-center transition-colors duration-300"
                              >
                                {org.logo_url ? (
                                  <img 
                                    src={org.logo_url} 
                                    alt={org.name || 'Organization'} 
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <Building2 className="w-4 h-4 text-[#666]" />
                                )}
                              </div>
                            ))}
                            {collageOrganizations.length > 4 && (
                              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#1a1a1a] border border-[#333] flex items-center justify-center">
                                <span className="text-[9px] text-[#888] font-gilroy font-bold">+{collageOrganizations.length - 4}</span>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>

                      {/* Right Side - Profile Photo (Full) */}
                      <div className="relative w-[45%] sm:w-[50%] h-full">
                        {/* Share Badge - Top Right (like rank badge in leaderboard) */}
                        <div className="absolute top-3 right-3 z-30">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Use public profile URL with user ID so others can view YOUR profile
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
                            className="bg-[#1a1a1a]/90 backdrop-blur-sm rounded-full px-2.5 py-1 border border-[#333] group-hover:border-[#CBAA5A]/50 transition-colors duration-300 flex items-center gap-1"
                          >
                            <Share2 className="w-3 h-3 text-[#888] group-hover:text-[#CBAA5A] transition-colors duration-300" />
                            <span className="text-[10px] text-[#888] group-hover:text-[#CBAA5A] uppercase tracking-[0.2em] font-gilroy font-bold transition-colors duration-300">
                              SHARE
                            </span>
                          </button>
                        </div>
                        
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 z-10 pointer-events-none" 
                          style={{
                            background: `linear-gradient(to right, #000 0%, transparent 30%)`
                          }}
                        ></div>
                        
                        {user?.avatar && (
                          <img 
                            src={avatarPreview || user.avatar} 
                            alt={`${user?.firstName} ${user?.lastName}`}
                            className="w-full h-full object-cover object-center"
                            style={{ filter: 'grayscale(1) contrast(1.1) brightness(0.9)' }}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                </div>
                
                {/* Masonry grid (Pinterest zig-zag) */}
                <div className="mt-4 columns-1 md:columns-2 xl:columns-3 gap-4 [column-fill:_balance]">
                  {/* GITHUB (way up) */}
                  <div className="mb-4 break-inside-avoid rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">GITHUB</h3>
                      <button
                        onClick={() => setShowSettings(true)}
                        className="text-[#CBAA5A] font-gilroy tracking-[0.1em] uppercase text-[9px] hover:underline"
                      >
                        EDIT
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="px-2 py-1 rounded-full text-[9px] font-gilroy tracking-[0.15em] uppercase border border-[#333] bg-black/40 text-[#888]">
                        {githubConnected === null ? 'Status —' : githubConnected ? 'Connected' : 'Not connected'}
                      </span>
                      <span className="px-2 py-1 rounded-full text-[9px] font-gilroy tracking-[0.15em] uppercase border border-[#333] bg-black/40 text-[#888]">
                        {founderProject?.github_repo_full_name ? founderProject.github_repo_full_name : 'Repo not selected'}
                      </span>
                    </div>

                    {githubCommitCounts.length > 0 ? (
                      (() => {
                        const today = new Date().toISOString().slice(0, 10);
                        const todayCount = githubCommitCounts.find((d) => d.date === today)?.count || 0;
                        const max = Math.max(1, ...githubCommitCounts.map((d) => d.count || 0));
                        const byDate = new Map(githubCommitCounts.map((d) => [d.date, d.count]));
                        const days = 30;
                        const end = new Date();
                        const dates: string[] = [];
                        for (let i = days - 1; i >= 0; i--) {
                          const dt = new Date(end);
                          dt.setDate(end.getDate() - i);
                          dates.push(dt.toISOString().slice(0, 10));
                        }
                        const levelClass = (c: number) => {
                          if (!c) return 'bg-[#0b0b0b] border-[#1a1a1a]';
                          const ratio = c / max;
                          if (ratio <= 0.25) return 'bg-emerald-900/30 border-emerald-900/30';
                          if (ratio <= 0.5) return 'bg-emerald-800/45 border-emerald-800/45';
                          if (ratio <= 0.75) return 'bg-emerald-700/60 border-emerald-700/60';
                          return 'bg-emerald-500/60 border-emerald-500/60';
                        };
                        return (
                          <>
                            <div className="flex items-end justify-between">
                              <div>
                                <div className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666]">Commits today</div>
                                <div className="mt-1 font-riccione text-3xl text-white leading-none">{todayCount}</div>
                              </div>
                              <div className="text-[9px] text-[#666] font-gilroy tracking-[0.12em] uppercase">
                                last {days} days
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-10 gap-1.5">
                              {dates.map((d) => {
                                const c = byDate.get(d) || 0;
                                return (
                                  <div
                                    key={d}
                                    title={`${d}: ${c} commits`}
                                    className={`h-3 w-3 rounded-[3px] border ${levelClass(c)}`}
                                  />
                                );
                              })}
                            </div>

                            <div className="mt-auto flex items-center justify-between">
                              <div className="text-[10px] text-[#666] font-gilroy tracking-[0.05em]">
                                Aggregate counts only.
                              </div>
                              <div className="text-[9px] text-[#666] font-gilroy tracking-[0.12em] uppercase">
                                Credibility
                              </div>
                            </div>
                          </>
                        );
                      })()
                    ) : (
                      <div className="text-[#666] font-gilroy text-sm">
                        {founderProject?.github_repo_full_name
                          ? 'Loading commit history…'
                          : 'Select a repo in Edit Profile.'}
                      </div>
                    )}
                  </div>

                  {/* PRODUCT DEMO (up) */}
                  <div className="mb-4 break-inside-avoid">
                    {founderProject?.product_demo_url ? (
                      <EmbeddedVideo
                        title="Product Demo"
                        url={String(founderProject.product_demo_url)}
                      />
                    ) : (
                      <div className="rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">PRODUCT DEMO</h3>
                          <button
                            onClick={() => setShowSettings(true)}
                            className="text-[#CBAA5A] font-gilroy tracking-[0.1em] uppercase text-[9px] hover:underline"
                          >
                            ADD
                          </button>
                        </div>
                        <div className="text-[#666] font-gilroy text-sm">Add a Loom or YouTube link to embed your demo.</div>
                      </div>
                    )}
                  </div>

                  {/* FOCUS WORK */}
                  <div className="mb-4 break-inside-avoid rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">FOCUS</h3>
                      <button
                        onClick={() => setShowSettings(true)}
                        className="text-[#CBAA5A] font-gilroy tracking-[0.1em] uppercase text-[9px] hover:underline"
                      >
                        EDIT
                      </button>
                    </div>
                    <div className="text-[#666] text-[9px] font-gilroy tracking-[0.2em] uppercase">What I’m working on</div>
                    <div className="mt-3 whitespace-pre-wrap text-white font-gilroy text-sm">
                      <div className="text-white font-gilroy text-sm whitespace-pre-wrap">
                        {founderProject?.description || 'Add your current focus in Edit Profile → Venture.'}
                      </div>
                    </div>
                  </div>

                  {/* STREAKS */}
                  <div className="mb-4 break-inside-avoid rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">STREAKS</h3>
                      <button
                        onClick={() => handleTabChange('info')}
                        className="text-[#CBAA5A] font-gilroy tracking-[0.1em] uppercase text-[9px] hover:underline"
                      >
                        VIEW
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div className="rounded-xl border border-[#333] bg-black/40 p-3">
                        <div className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666]">Current</div>
                        <div className="mt-1 font-riccione text-3xl text-white leading-none">
                          {standupStreak?.streak ?? '—'}
                        </div>
                        <div className="mt-1 text-[10px] text-[#666] font-gilroy">days</div>
                      </div>
                      <div className="rounded-xl border border-[#333] bg-black/40 p-3">
                        <div className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666]">Best</div>
                        <div className="mt-1 font-riccione text-3xl text-[#CBAA5A] leading-none">
                          {standupStreak?.maxStreak ?? '—'}
                        </div>
                        <div className="mt-1 text-[10px] text-[#666] font-gilroy">days</div>
                      </div>
                    </div>
                    <div className="mt-3 text-[10px] text-[#666] font-gilroy tracking-[0.05em]">
                      {standupStreak?.completedToday ? 'Completed today.' : 'Not completed today.'}
                    </div>
                  </div>

                  {/* PITCH */}
                  <div className="mb-4 break-inside-avoid">
                    {founderProject?.pitch_url ? (
                      <EmbeddedVideo
                        title="Pitch"
                        url={String(founderProject.pitch_url)}
                      />
                    ) : (
                      <div className="rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">PITCH</h3>
                          <button
                            onClick={() => setShowSettings(true)}
                            className="text-[#CBAA5A] font-gilroy tracking-[0.1em] uppercase text-[9px] hover:underline"
                          >
                            ADD
                          </button>
                        </div>
                        <div className="text-[#666] font-gilroy text-sm">Add a Loom or YouTube link to embed your pitch.</div>
                      </div>
                    )}
                  </div>

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

                  {/* YOUR ACTIVITY (lower, partner-focused) */}
                  {isPartner && (
                  <div className="mb-4 break-inside-avoid rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                    <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888] mb-3">YOUR ACTIVITY</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {isPartner && (
                        <>
                          <div
                            className="text-center p-3 rounded-xl bg-[#1a1a1a] border border-[#333] hover:border-[#CBAA5A]/50 transition-colors cursor-pointer"
                            onClick={() => handleTabChange('offers')}
                          >
                            {activityStatsLoading ? (
                              <div className="h-8 w-12 mx-auto bg-[#333] rounded animate-pulse" />
                            ) : (
                              <div className="font-riccione text-2xl text-[#CBAA5A]">{activityStats.activeOffers}</div>
                            )}
                            <div className="text-[9px] font-gilroy tracking-[0.15em] text-[#666] uppercase mt-1">Active Offers</div>
                          </div>
                          <div
                            className="text-center p-3 rounded-xl bg-[#1a1a1a] border border-[#333] hover:border-[#CBAA5A]/50 transition-colors cursor-pointer"
                            onClick={() => handleTabChange('requests')}
                          >
                            {activityStatsLoading ? (
                              <div className="h-8 w-12 mx-auto bg-[#333] rounded animate-pulse" />
                            ) : (
                              <div className="font-riccione text-2xl text-white">{activityStats.activeRequests}</div>
                            )}
                            <div className="text-[9px] font-gilroy tracking-[0.15em] text-[#666] uppercase mt-1">Requests</div>
                          </div>
                        </>
                      )}
                      <div
                        className="text-center p-3 rounded-xl bg-[#1a1a1a] border border-[#333] hover:border-[#CBAA5A]/50 transition-colors cursor-pointer"
                        onClick={() => handleTabChange('intros')}
                      >
                        {activityStatsLoading ? (
                          <div className="h-8 w-12 mx-auto bg-[#333] rounded animate-pulse" />
                        ) : (
                          <div className="font-riccione text-2xl text-white">{activityStats.introsMade}</div>
                        )}
                        <div className="text-[9px] font-gilroy tracking-[0.15em] text-[#666] uppercase mt-1">Intros Made</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-[#1a1a1a] border border-[#333]">
                        {activityStatsLoading ? (
                          <div className="h-8 w-12 mx-auto bg-[#333] rounded animate-pulse" />
                        ) : (
                          <div className="font-riccione text-2xl text-[#CBAA5A] flex items-center justify-center gap-1">
                            {activityStats.rating > 0 ? activityStats.rating.toFixed(1) : '—'}
                            {activityStats.rating > 0 && <span className="text-sm">⭐</span>}
                          </div>
                        )}
                        <div className="text-[9px] font-gilroy tracking-[0.15em] text-[#666] uppercase mt-1">Rating</div>
                      </div>
                    </div>
                    {isZaurqUser && (
                      <div className="mt-3 text-[10px] text-[#666] font-gilroy tracking-[0.05em]">
                        Offers and requests are hidden for Zaurq Users.
                      </div>
                    )}
                  </div>
                  )}

                  {/* VENTURE (lower) */}
                  <div className="mb-4 break-inside-avoid rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">VENTURE</h3>
                      <button
                        onClick={() => setShowSettings(true)}
                        className="text-[#CBAA5A] font-gilroy tracking-[0.1em] uppercase text-[9px] hover:underline"
                      >
                        EDIT
                      </button>
                    </div>

                    {founderProjectLoading ? (
                      <div className="space-y-2">
                        <div className="h-4 bg-[#222] rounded animate-pulse" />
                        <div className="h-4 bg-[#222] rounded animate-pulse" />
                      </div>
                    ) : (
                      <div className="space-y-2 flex-1 overflow-hidden">
                        <div className="text-white font-riccione text-lg">{founderProject?.name || 'My Venture'}</div>
                        {founderProject?.tagline ? (
                          <div className="text-[#aaa] font-gilroy text-sm line-clamp-4">{founderProject.tagline}</div>
                        ) : (
                          <div className="text-[#555] font-gilroy text-sm italic">Add a tagline to make this profile pop.</div>
                        )}
                        {founderProject?.website_url && (
                          <a
                            href={founderProject.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-[#CBAA5A] hover:text-white font-gilroy text-sm"
                          >
                            Website <ExternalLink className="w-4 h-4" />
                          </a>
                        )}

                        <div className="pt-2 flex flex-wrap gap-2">
                          <span className="px-2 py-1 rounded-full text-[9px] font-gilroy tracking-[0.15em] uppercase border border-[#333] bg-black/40 text-[#888]">
                            GitHub {githubConnected === null ? '—' : githubConnected ? 'Connected' : 'Not connected'}
                          </span>
                          <span className="px-2 py-1 rounded-full text-[9px] font-gilroy tracking-[0.15em] uppercase border border-[#333] bg-black/40 text-[#888]">
                            Repo {founderProject?.github_repo_full_name ? founderProject.github_repo_full_name : 'Not selected'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PITCH */}
                  <div className="mb-4 break-inside-avoid">
                    {founderProject?.pitch_url ? (
                      <EmbeddedVideo
                        title="Pitch"
                        url={String(founderProject.pitch_url)}
                      />
                    ) : (
                      <div className="rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">PITCH</h3>
                          <button
                            onClick={() => setShowSettings(true)}
                            className="text-[#CBAA5A] font-gilroy tracking-[0.1em] uppercase text-[9px] hover:underline"
                          >
                            ADD
                          </button>
                        </div>
                        <div className="text-[#666] font-gilroy text-sm">Add a Loom or YouTube link to embed your pitch.</div>
                      </div>
                    )}
                  </div>

                  {/* FOUNDER JOURNEY (standups) */}
                  <div className="mb-4 break-inside-avoid rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">FOUNDER JOURNEY</h3>
                      <button
                        onClick={async () => {
                          try {
                            setDailyStandupsLoading(true);
                            const data = await apiGet(`${API_ENDPOINTS.DAILY_STANDUP_HISTORY}?limit=20`, { skipCache: true });
                            setDailyStandups(Array.isArray(data?.standups) ? data.standups : []);
                          } catch {
                            // ignore
                          } finally {
                            setDailyStandupsLoading(false);
                          }
                        }}
                        className="text-[#CBAA5A] font-gilroy tracking-[0.1em] uppercase text-[9px] hover:underline"
                      >
                        REFRESH
                      </button>
                    </div>

                    {dailyStandupsLoading ? (
                      <div className="space-y-2">
                        <div className="h-4 bg-[#222] rounded animate-pulse" />
                        <div className="h-4 bg-[#222] rounded animate-pulse" />
                        <div className="h-4 bg-[#222] rounded animate-pulse" />
                      </div>
                    ) : dailyStandups.length === 0 ? (
                      <div className="text-[#666] font-gilroy tracking-[0.05em] text-sm">
                        No standups yet. Complete today’s standup on the feed to start your streak.
                      </div>
                    ) : (
                      <div className="max-h-[520px] overflow-y-auto space-y-3 scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {dailyStandups.map((s: any) => (
                          <div key={s.id} className="rounded-xl border border-[#222] bg-black/40 p-3">
                            <div className="flex items-center justify-between">
                              <div className="text-[10px] font-gilroy tracking-[0.15em] uppercase text-[#888]">
                                {s.local_date}
                              </div>
                              <div className="text-[10px] font-gilroy tracking-[0.15em] uppercase text-[#555]">
                                {s.timezone}
                              </div>
                            </div>
                            <div className="mt-3 space-y-2 text-sm">
                              <div>
                                <div className="text-[10px] font-gilroy tracking-[0.15em] uppercase text-[#666]">Yesterday</div>
                                <div className="text-white font-gilroy tracking-[0.02em]">{s.yesterday}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-gilroy tracking-[0.15em] uppercase text-[#666]">Today</div>
                                <div className="text-white font-gilroy tracking-[0.02em]">{s.today}</div>
                              </div>
                              {s.blockers && (
                                <div>
                                  <div className="text-[10px] font-gilroy tracking-[0.15em] uppercase text-[#666]">Blockers</div>
                                  <div className="text-[#CBAA5A] font-gilroy tracking-[0.02em]">{s.blockers}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* NETWORK COLLAGE (lower, partner-focused) */}
                  {isPartner && (
                  <div className="mb-4 break-inside-avoid rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">NETWORK COLLAGE</h3>
                      <button
                        onClick={() => setShowSettings(true)}
                        className="text-[#CBAA5A] font-gilroy tracking-[0.1em] uppercase text-[9px] hover:underline"
                      >
                        EDIT
                      </button>
                    </div>
                    {collageOrganizations.length > 0 ? (
                      <div className="space-y-3 flex-1 overflow-hidden">
                        <div className="relative bg-gradient-to-br from-[#CBAA5A]/5 via-transparent to-transparent rounded-xl border border-[#333] p-3">
                          <ProfileCollage organizations={collageOrganizations} />
                        </div>
                        <p className="text-center text-[9px] font-gilroy tracking-[0.15em] text-[#555] uppercase">
                          {collageOrganizations.length} organizations from your network
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Building2 className="h-8 w-8 mx-auto mb-2 text-[#333]" />
                        <p className="text-[#666] font-gilroy tracking-[0.1em] uppercase text-[10px]">
                          Add featured connections in settings
                        </p>
                      </div>
                    )}
                  </div>
                  )}

                  {/* WORK EXPERIENCE (each org = its own tile) */}
                  {userOrganizations.map((org: any, i: number) => (
                    <div
                      key={org?.id || org?.name || i}
                      className="mb-4 break-inside-avoid rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">WORK</h3>
                        <button
                          onClick={() => setShowSettings(true)}
                          className="text-[#CBAA5A] font-gilroy tracking-[0.1em] uppercase text-[9px] hover:underline"
                        >
                          EDIT
                        </button>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
                        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-[#333] flex items-center justify-center p-3 mb-4">
                          {org?.logo_url ? (
                            <img src={org.logo_url} alt={org?.name || 'Organization'} className="w-full h-full object-contain" />
                          ) : (
                            <Building2 className="w-8 h-8 text-[#555]" />
                          )}
                        </div>
                        <div className="text-white font-riccione text-xl leading-tight line-clamp-2">
                          {org?.name || 'Organization'}
                        </div>
                        {org?.role && (
                          <div className="mt-2 text-[#aaa] font-gilroy text-sm line-clamp-2">{org.role}</div>
                        )}
                        {org?.type && (
                          <div className="mt-2 text-[10px] text-[#666] font-gilroy tracking-[0.15em] uppercase">
                            {String(org.type)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* ADD WORK EXPERIENCE */}
                  <div className="mb-4 break-inside-avoid rounded-2xl border-2 border-dashed border-[#333] hover:border-[#CBAA5A]/50 bg-[#0a0a0a] p-10 flex flex-col items-center justify-center gap-3 transition-all">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center mx-auto mb-3">
                        <span className="text-3xl text-[#666]">+</span>
                      </div>
                      <div className="font-gilroy text-[11px] font-bold tracking-[0.15em] text-[#666] uppercase">
                        Add Work Experience
                      </div>
                      <div className="mt-2">
                        <Button
                          type="button"
                          onClick={() => setShowSettings(true)}
                          className="bg-[#CBAA5A] text-black hover:bg-white font-gilroy tracking-[0.15em] uppercase text-[10px] h-9 px-4"
                        >
                          Edit Profile
                        </Button>
                      </div>
                    </div>
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
                      {connectionStories.length < 6 && (
                        <div>
                          <AddStoryCard onClick={() => setShowAddStoryModal(true)} />
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

                  {/* REVENUE (placeholder until integrations exist) */}
                  <div className="mb-4 break-inside-avoid rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">REVENUE</h3>
                      <span className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#555]">Soon</span>
                    </div>
                    <div className="text-[#666] font-gilroy text-sm">
                      Revenue verification needs Stripe/Razorpay integration (not wired in this repo yet).
                    </div>
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled
                        className="border-[#333] text-white font-gilroy tracking-[0.15em] uppercase text-[10px] h-9 opacity-60"
                      >
                        Connect Stripe
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled
                        className="border-[#333] text-white font-gilroy tracking-[0.15em] uppercase text-[10px] h-9 opacity-60"
                      >
                        Connect Razorpay
                      </Button>
                    </div>
                    <div className="mt-auto" />
                  </div>

                  {/* SOCIAL (placeholder) */}
                  <div className="mb-4 break-inside-avoid rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">SOCIAL</h3>
                      <button
                        onClick={() => setShowSettings(true)}
                        className="text-[#CBAA5A] font-gilroy tracking-[0.1em] uppercase text-[9px] hover:underline"
                      >
                        EDIT
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-[#333] bg-black/40 p-3">
                        <div className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666]">LinkedIn</div>
                        <div className="mt-1 text-white font-gilroy text-sm">
                          {formData.linkedinUrl ? 'Connected' : 'Not connected'}
                        </div>
                        <div className="mt-1 text-[#555] text-[10px] font-gilroy">
                          Followers: —
                        </div>
                      </div>
                      <div className="rounded-xl border border-[#333] bg-black/40 p-3">
                        <div className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666]">X</div>
                        <div className="mt-1 text-white font-gilroy text-sm">
                          Not connected
                        </div>
                        <div className="mt-1 text-[#555] text-[10px] font-gilroy">
                          Followers: —
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-[10px] text-[#666] font-gilroy tracking-[0.05em]">
                      Follower counts require official APIs + OAuth permissions (LinkedIn is restricted; X requires API access). Not enabled yet.
                    </div>
                    <div className="mt-auto" />
                  </div>
                </div>

              </>
            )}
          </>
        )}

        {/* MY OFFERS Tab */}
        {activeTab === 'offers' && (
          <div className="space-y-4">
            <OffersTab />
          </div>
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

        {/* Profile Collage Preview */}
        <div className="rounded-[24px] border-2 border-[#222] bg-gradient-to-br from-[#111] to-black p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Eye className="h-5 w-5 text-[#CBAA5A]" />
            <h2 className="font-riccione text-xl text-white">Profile Collage</h2>
          </div>
          <p className="text-[#666] font-gilroy text-sm tracking-[0.1em] mb-6">
            YOUR PROFILE SHOWCASES ORGANIZATIONS FROM YOUR FEATURED CONNECTIONS
          </p>
          
          {collageOrganizations.length > 0 ? (
            <div className="space-y-6">
              {/* User Avatar */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#CBAA5A] to-[#8B7355] rounded-full blur-2xl opacity-20 scale-110" />
                  <Avatar className="w-36 h-36 border-4 border-[#CBAA5A]/30 relative shadow-[0_20px_60px_rgba(0,0,0,0.5)] grayscale">
                    <AvatarImage src={user?.avatar || ''} alt={`${user?.firstName} ${user?.lastName}`} className="grayscale" />
                    <AvatarFallback className="text-3xl font-gilroy bg-gradient-to-br from-[#1a1a1a] to-black text-[#CBAA5A]">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>

              {/* Metro Tiles Collage */}
              <div className="relative bg-gradient-to-br from-[#CBAA5A]/5 via-transparent to-transparent rounded-[20px] backdrop-blur-md border border-[#333] mx-auto p-4" style={{ maxWidth: '470px' }}>
                <ProfileCollage organizations={collageOrganizations} />
              </div>

              <p className="text-center text-[11px] font-gilroy tracking-[0.15em] text-[#555] uppercase">
                Showing {collageOrganizations.length} organization{collageOrganizations.length !== 1 ? 's' : ''} from your featured connections
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-[#333]" />
              <p className="text-[#666] font-gilroy tracking-[0.1em] uppercase text-sm">
                Add featured connections below to see your profile collage
              </p>
            </div>
          )}
        </div>

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