import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useNavigate, Link } from 'react-router-dom';
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
import OrganizationSearch from '@/components/OrganizationSearch';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import { TelegramSettings } from '@/components/TelegramSettings';
import FeaturedConnectionSelector from '@/components/FeaturedConnectionSelector';
import ProfileCollage from '@/components/ProfileCollage';
import { apiPost } from '@/lib/api';
import { Currency } from '@/lib/currency';
import { useSocialCapital } from '@/hooks/useSocialCapital';
import { SocialCapitalScore } from '@/components/SocialCapitalScore';
import { SocialCapitalBreakdownModal } from '@/components/SocialCapitalBreakdownModal';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  User,
  Save,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Building2,
  Eye,
  EyeOff,
  Camera,
  Upload,
  DollarSign,
  Edit,
  TrendingUp
} from 'lucide-react';

const UserProfile = () => {
  const { user, updateProfile } = useAuth();
  const { userCurrency, setUserCurrency } = useCurrency();
  const navigate = useNavigate();
  const { toast } = useToast();
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
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [scoreBreakdownData, setScoreBreakdownData] = useState<any>(null);
  const [calculatingScore, setCalculatingScore] = useState(false);
  
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

  // Load user profile data from database
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id) return;

      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('first_name, last_name, bio, linkedin_url, profile_picture_url')
          .eq('id', user.id)
          .single();

        if (error) {
          console.warn('Could not load user profile from database:', error);
          // Use the data from auth context as fallback
          setFormData({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            bio: user.bio || '',
            linkedinUrl: user.linkedinUrl || '',
            isProfilePublic: true,
          });
        } else {
          console.log('Loaded user data from database:', userData);
          setFormData({
            firstName: (userData as any).first_name || user.firstName || '',
            lastName: (userData as any).last_name || user.lastName || '',
            bio: (userData as any).bio || user.bio || '',
            linkedinUrl: (userData as any).linkedin_url || user.linkedinUrl || '',
            // Some environments may not have is_profile_public column; default to true
            isProfilePublic: (user as any).isProfilePublic ?? true,
          });
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };

    loadUserProfile();
  }, [user?.id]);

  // Load collage organizations (includes featured connections' orgs)
  useEffect(() => {
    const loadCollageOrgs = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .rpc('get_public_profile' as any, { p_user_id: user.id }) as any;

        if (error) {
          console.error('Error loading collage organizations:', error);
          return;
        }

        // Use collage_organizations if available, fallback to organizations
        if (data && data.collage_organizations) {
          setCollageOrganizations(data.collage_organizations);
        } else if (data && data.organizations) {
          setCollageOrganizations(data.organizations);
        }
      } catch (error) {
        console.error('Error loading collage:', error);
      }
    };

    loadCollageOrgs();
  }, [user?.id]);

  // Update form data when user data changes
  useEffect(() => {
    console.log('User data updated:', user);
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
      console.log('Saving profile data:', formData);
      console.log('Current user:', user);

      // First ensure user record exists in public.users table
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          bio: formData.bio,
          linkedin_url: formData.linkedinUrl,
          // Omit is_profile_public if the column does not exist
        }, { onConflict: 'id' });

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        throw upsertError;
      }

      // Then use the updateProfile function
      const { error } = await updateProfile(formData);

      if (error) {
        console.error('Update profile error:', error);
        throw error;
      }

      console.log('Profile saved successfully');

      // Refresh the user profile data to reflect the changes
      const { data: updatedUserData, error: fetchError } = await supabase
        .from('users')
        .select('linkedin_url, bio, profile_picture_url')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.warn('Could not refresh user data:', fetchError);
      } else {
        console.log('Updated user data:', updatedUserData);
        // Update the auth context with the new data
        await updateProfile({
          linkedinUrl: updatedUserData.linkedin_url,
          bio: updatedUserData.bio,
          avatar: updatedUserData.profile_picture_url,
        });
      }

      setSaved(true);
      setIsEditingProfile(false); // Exit edit mode on successful save
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
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
      // Refresh user data to get updated score
      const { data: userData } = await supabase
        .from('users')
        .select('social_capital_score')
        .eq('id', user.id)
        .single();
      
      if (userData) {
        // Update the user object in auth context
        await updateProfile({ socialCapitalScore: userData.social_capital_score });
      }
      
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
    } catch (error) {
      console.error('Avatar upload error:', error);
      alert(`Failed to upload avatar: ${error.message || error}`);
    } finally {
      setUploadingAvatar(false);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">6°</span>
              </div>
              <span className="font-semibold text-lg">Profile Settings</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Email Verification Banner */}
        <EmailVerificationBanner />

        {/* Profile Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarPreview || user.avatar} />
              <AvatarFallback className="text-2xl">
                {user.firstName[0]}{user.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <input
              type="file"
              id="avatar-upload"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarSelect}
            />
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-lg"
            >
              <Camera className="h-4 w-4" />
            </label>
          </div>
          
          {avatarFile && (
            <div className="mb-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                Selected: {avatarFile.name}
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  size="sm"
                >
                  {uploadingAvatar ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Avatar
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
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          
          <h1 className="text-2xl font-bold">{user.firstName} {user.lastName}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>

        {/* LinkedIn Optional Info */}
        {!user.linkedinUrl && (
          <Alert className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <strong>LinkedIn Optional:</strong> Adding your LinkedIn profile URL helps others connect with you professionally and increases trust in the community.
            </AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {saved && (
          <Alert className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Profile updated successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Profile Collage Preview */}
        <Card className="bg-gradient-to-br from-primary/5 via-background to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Profile Collage Preview
            </CardTitle>
            <CardDescription>
              This is how your profile will appear to others
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {collageOrganizations.length > 0 ? (
              <>
                {/* User Avatar */}
                <div className="flex justify-center">
                  <Avatar className="w-44 h-44 border-[10px] border-white ring-4 ring-primary/30 shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_0_4px_rgba(55,213,163,0.4)]">
                    <AvatarImage src={user?.avatar || ''} alt={`${user?.firstName} ${user?.lastName}`} />
                    <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-primary to-primary/70">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Metro Tiles Collage */}
                <div className="relative bg-gradient-to-br from-primary/8 via-primary/3 to-transparent rounded-[30px] backdrop-blur-md border-2 border-primary/15 shadow-lg mx-auto" style={{ maxWidth: '470px' }}>
                  <ProfileCollage organizations={collageOrganizations} />
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  Showing {collageOrganizations.filter((o: any) => o.source === 'own').length} of your organizations + {collageOrganizations.filter((o: any) => o.source === 'featured_connection').length} from featured connections
                </p>
              </>
            ) : (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Add organizations and featured connections below to see your profile collage
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Organizations Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organizations
            </CardTitle>
            <CardDescription>
              Add your work, education, and affiliations. Organization logos will appear in your profile collage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OrganizationSearch userId={user.id} />
          </CardContent>
        </Card>

        {/* Featured Connections Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Featured Connections
            </CardTitle>
            <CardDescription>
              Showcase your top professional connections on your public profile. Your profile will display a beautiful collage of your photo, organization logos, and your featured connections.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FeaturedConnectionSelector />
          </CardContent>
        </Card>

        {/* Social Capital Score Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Social Capital Score
            </CardTitle>
            <CardDescription>
              Your professional network strength based on your featured connections
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
              <div className="flex-1">
                {user?.socialCapitalScore && user.socialCapitalScore > 0 ? (
                  <div className="flex items-center gap-4">
                    <SocialCapitalScore 
                      score={user.socialCapitalScore} 
                      size="lg" 
                      showLabel
                    />
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={handleShowBreakdown}
                      disabled={scoreLoading}
                    >
                      View Breakdown
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Calculate your social capital score
                    </p>
                    <p className="text-xs text-gray-500">
                      Add featured connections above, then click calculate to see your score
                    </p>
                  </div>
                )}
              </div>
              <Button 
                onClick={handleCalculateScore}
                disabled={calculatingScore || scoreLoading}
                className="ml-4"
              >
                {calculatingScore ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Calculating...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    {user?.socialCapitalScore && user.socialCapitalScore > 0 ? 'Recalculate' : 'Calculate Score'}
                  </>
                )}
              </Button>
            </div>
            
            <Alert>
              <AlertDescription className="text-sm">
                <strong>How it works:</strong> We analyze your featured connections' organizations and roles using AI to calculate a score (0-500+). 
                Higher scores reflect connections at prestigious organizations in senior positions.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  {isEditingProfile ? 'Update your profile information and LinkedIn URL' : 'Your personal information'}
                </CardDescription>
              </div>
              {!isEditingProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingProfile(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email Display (Read-only) */}
            <div className="space-y-2">
              <Label>Email Address</Label>
              <div className="relative">
                <div className="px-3 py-2 bg-muted/30 rounded-md border flex items-center justify-between">
                  <span className="text-sm">{user.email}</span>
                  {user.isVerified ? (
                    <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                      <CheckCircle className="h-4 w-4" />
                      Verified
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-orange-600 text-xs font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      Not Verified
                    </div>
                  )}
                </div>
              </div>
              {!user.isVerified && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Please check your inbox and verify your email address.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResendVerification}
                    disabled={sendingVerification || verificationSent}
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

            <Separator />

            {!isEditingProfile ? (
              /* Display Mode */
              <div className="space-y-6">
                {/* Name Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">First Name</Label>
                    <p className="text-base font-medium">{formData.firstName || 'Not provided'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Last Name</Label>
                    <p className="text-base font-medium">{formData.lastName || 'Not provided'}</p>
                  </div>
                </div>

                {/* Bio Display */}
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Bio</Label>
                  <p className="text-base whitespace-pre-wrap">{formData.bio || 'No bio provided'}</p>
                </div>

                <Separator />

                {/* Privacy Display */}
                <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
                  <div className="flex items-center gap-3">
                    {formData.isProfilePublic ? (
                      <Eye className="h-5 w-5 text-green-600" />
                    ) : (
                      <EyeOff className="h-5 w-5 text-orange-600" />
                    )}
                    <div>
                      <p className="font-medium">
                        {formData.isProfilePublic ? 'Public Profile' : 'Private Profile'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formData.isProfilePublic
                          ? 'Your profile is visible to others'
                          : 'Your profile is hidden from others'}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* LinkedIn Display */}
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs flex items-center gap-2">
                    <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn Profile
                  </Label>
                  {formData.linkedinUrl ? (
                    <a
                      href={formData.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base text-blue-600 hover:underline flex items-center gap-2"
                    >
                      View LinkedIn Profile
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <p className="text-base text-muted-foreground">Not provided</p>
                  )}
                </div>
              </div>
            ) : (
              /* Edit Mode */
              <div className="space-y-6">
                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="Tell others about yourself..."
                    rows={3}
                  />
                </div>

                <Separator />

                {/* Privacy Toggle */}
                <div className="flex items-start justify-between space-x-4 rounded-lg border p-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {formData.isProfilePublic ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-orange-600" />
                      )}
                      <Label htmlFor="privacy-toggle" className="font-medium cursor-pointer">
                        {formData.isProfilePublic ? 'Public Profile' : 'Private Profile'}
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
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

                <Separator />

                {/* LinkedIn URL */}
                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl" className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
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
                    className={!isLinkedInValid && formData.linkedinUrl ? 'border-red-300' : ''}
                  />
                  {formData.linkedinUrl && (
                    <div className="flex items-center justify-between">
                      {isLinkedInValid ? (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Valid LinkedIn URL
                        </p>
                      ) : (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Please enter a valid LinkedIn URL
                        </p>
                      )}
                      {isLinkedInValid && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={formData.linkedinUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Preview
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Your LinkedIn profile helps others connect with you professionally and increases trust in the community.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/profile/public')}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Public Profile
            </Button>
            {isEditingProfile && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingProfile(false);
                    // Reset form data to current user values
                    setFormData({
                      firstName: user?.firstName || '',
                      lastName: user?.lastName || '',
                      bio: user?.bio || '',
                      linkedinUrl: user?.linkedinUrl || '',
                      isProfilePublic: formData.isProfilePublic, // Keep current value
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={loading || (!isLinkedInValid && formData.linkedinUrl !== '')}>
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
          </CardFooter>
        </Card>

        {/* Currency Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Currency Preferences
            </CardTitle>
            <CardDescription>
              Choose your preferred currency for displaying prices throughout the app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Preferred Currency</Label>
              <Select 
                value={selectedCurrency} 
                onValueChange={(value: Currency) => setSelectedCurrency(value)}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">₹ Indian Rupee (INR)</SelectItem>
                  <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                All prices will be displayed in your selected currency. Offers created in other currencies will be automatically converted.
              </p>
            </div>

            {selectedCurrency !== userCurrency && (
              <Button
                onClick={handleCurrencySave}
                disabled={currencySaving}
                className="w-full"
              >
                {currencySaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
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
          </CardContent>
        </Card>

        {/* Telegram Notifications */}
        <TelegramSettings />
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
    </div>
  );
};

export default UserProfile;