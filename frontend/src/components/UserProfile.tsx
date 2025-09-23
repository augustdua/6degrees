import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Edit3, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function UserProfile() {
  const { user, signOut, updateProfile } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    bio: user?.bio || "",
    linkedinUrl: user?.linkedinUrl || "",
    twitterUrl: user?.twitterUrl || "",
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await updateProfile(profileData);
      
      if (error) {
        throw error;
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setProfileData({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      bio: user?.bio || "",
      linkedinUrl: user?.linkedinUrl || "",
      twitterUrl: user?.twitterUrl || "",
    });
    setIsEditing(false);
  };

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) throw error;
      
      toast({
        title: "Signed Out",
        description: "You've been signed out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  return (
    <Card className="p-6 max-w-2xl mx-auto shadow-network">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
            <AvatarFallback>
              <User className="w-8 h-8" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold">{user.firstName} {user.lastName}</h2>
            <p className="text-muted-foreground">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={user.isVerified ? "default" : "secondary"}>
                {user.isVerified ? "Verified" : "Unverified"}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={loading}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                variant="hero"
                size="sm"
                onClick={handleSave}
                disabled={loading}
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            {isEditing ? (
              <Input
                id="firstName"
                value={profileData.firstName}
                onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
              />
            ) : (
              <p className="text-sm py-2 px-3 bg-muted rounded-md">{user.firstName}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            {isEditing ? (
              <Input
                id="lastName"
                value={profileData.lastName}
                onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
              />
            ) : (
              <p className="text-sm py-2 px-3 bg-muted rounded-md">{user.lastName}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          {isEditing ? (
            <Textarea
              id="bio"
              placeholder="Tell us about yourself..."
              value={profileData.bio}
              onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
              rows={3}
            />
          ) : (
            <p className="text-sm py-2 px-3 bg-muted rounded-md min-h-[60px]">
              {user.bio || "No bio provided"}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
          {isEditing ? (
            <Input
              id="linkedinUrl"
              placeholder="https://linkedin.com/in/yourprofile"
              value={profileData.linkedinUrl}
              onChange={(e) => setProfileData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
            />
          ) : (
            <p className="text-sm py-2 px-3 bg-muted rounded-md">
              {user.linkedinUrl || "No LinkedIn profile"}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="twitterUrl">Twitter URL</Label>
          {isEditing ? (
            <Input
              id="twitterUrl"
              placeholder="https://twitter.com/yourhandle"
              value={profileData.twitterUrl}
              onChange={(e) => setProfileData(prev => ({ ...prev, twitterUrl: e.target.value }))}
            />
          ) : (
            <p className="text-sm py-2 px-3 bg-muted rounded-md">
              {user.twitterUrl || "No Twitter profile"}
            </p>
          )}
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Member since {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </Card>
  );
}


