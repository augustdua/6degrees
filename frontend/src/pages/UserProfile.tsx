import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import OrganizationSearch from '@/components/OrganizationSearch';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import {
  ArrowLeft,
  User,
  Save,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Building2,
  Eye,
  EyeOff
} from 'lucide-react';

const UserProfile = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    bio: user?.bio || '',
    linkedinUrl: user?.linkedinUrl || '',
    isProfilePublic: true,
  });

  // Load user profile data from database
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id) return;

      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('first_name, last_name, bio, linkedin_url, avatar_url, is_profile_public')
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
            firstName: userData.first_name || user.firstName || '',
            lastName: userData.last_name || user.lastName || '',
            bio: userData.bio || user.bio || '',
            linkedinUrl: userData.linkedin_url || user.linkedinUrl || '',
            isProfilePublic: userData.is_profile_public ?? true,
          });
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };

    loadUserProfile();
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
          is_profile_public: formData.isProfilePublic,
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
        .select('linkedin_url, bio, avatar_url')
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
          avatar: updatedUserData.avatar_url,
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Profile update error:', error);
      alert(`Failed to update profile: ${error.message || error}`);
    } finally {
      setLoading(false);
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
          <Avatar className="h-20 w-20 mx-auto mb-4">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="text-xl">
              {user.firstName[0]}{user.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold">{user.firstName} {user.lastName}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>

        {/* LinkedIn Alert */}
        {!user.linkedinUrl && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              <strong>LinkedIn Required:</strong> Add your LinkedIn profile URL to connect with others professionally and participate in connection chains.
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

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your profile information and LinkedIn URL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
                LinkedIn Profile URL *
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
                Your LinkedIn profile helps others connect with you professionally and is required for participating in connection chains.
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={loading || (!isLinkedInValid && formData.linkedinUrl)}
              >
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
              Add your work, education, and affiliations. Organization logos will appear in the connection network.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OrganizationSearch userId={user.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserProfile;