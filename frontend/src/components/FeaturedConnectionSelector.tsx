import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ProfileCollage from './ProfileCollage';
import {
  Plus,
  X,
  GripVertical,
  UserPlus,
  Mail,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface Connection {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  email: string;
}

interface FeaturedConnection {
  id: string;
  user_id: string;
  featured_user_id: string | null;
  featured_email: string | null;
  display_order: number;
  user?: {
    first_name: string;
    last_name: string;
    profile_picture_url: string | null;
  };
}

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
}

const FeaturedConnectionSelector: React.FC = () => {
  const { user } = useAuth();
  const [featuredConnections, setFeaturedConnections] = useState<FeaturedConnection[]>([]);
  const [availableConnections, setAvailableConnections] = useState<Connection[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_FEATURED = 8;

  useEffect(() => {
    if (user) {
      loadFeaturedConnections();
      loadConnections();
      loadOrganizations();
    }
  }, [user]);

  const loadFeaturedConnections = async () => {
    if (!user) return;

    try {
      const response = await apiGet('/api/profile/me/featured-connections');
      const data = response.featured_connections || [];
      
      // Transform the data to match the expected format
      const transformed = data.map((fc: any) => ({
        id: fc.id,
        user_id: fc.user_id,
        featured_user_id: fc.featured_user_id,
        featured_email: fc.featured_email,
        display_order: fc.display_order,
        user: fc.featured_user ? {
          first_name: fc.featured_user.first_name,
          last_name: fc.featured_user.last_name,
          profile_picture_url: fc.featured_user.profile_picture_url
        } : null
      }));
      
      setFeaturedConnections(transformed);
    } catch (err: any) {
      console.error('Error loading featured connections:', err);
    }
  };

  const loadConnections = async () => {
    if (!user) return;

    try {
      // Use API endpoint instead of direct Supabase query
      const data = await apiGet('/api/connections');
      
      // Extract the other user from each connection
      const connections: Connection[] = (data || []).map((conn: any) => {
        return {
          id: conn.id || conn.user_id,
          user_id: conn.id || conn.user_id,
          first_name: conn.first_name,
          last_name: conn.last_name,
          profile_picture_url: conn.profile_picture_url,
          email: conn.email
        };
      });

      setAvailableConnections(connections);
    } catch (err: any) {
      console.error('Error loading connections:', err);
    }
  };

  const loadOrganizations = async () => {
    if (!user) return;

    try {
      const response = await apiGet(`/api/organizations/user/${user.id}`);
      const orgs = (response.organizations || [])
        .map((item: any) => item.organization)
        .filter(Boolean);
      setOrganizations(orgs);
    } catch (err: any) {
      console.error('Error loading organizations:', err);
    }
  };

  const addFeaturedConnection = async (connectionId: string) => {
    if (!user || featuredConnections.length >= MAX_FEATURED) return;

    setSaving(true);
    setError(null);

    try {
      await apiPost('/api/profile/me/featured-connections', {
        featured_user_id: connectionId,
        display_order: featuredConnections.length
      });

      await loadFeaturedConnections();
      setShowAddDialog(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error adding featured connection:', err);
      setError(err.message || 'Failed to add connection');
    } finally {
      setSaving(false);
    }
  };

  const inviteConnection = async () => {
    if (!user || !inviteEmail.trim() || featuredConnections.length >= MAX_FEATURED) return;

    setSaving(true);
    setError(null);

    try {
      await apiPost('/api/profile/me/featured-connections', {
        featured_email: inviteEmail.trim().toLowerCase(),
        display_order: featuredConnections.length
      });

      await loadFeaturedConnections();
      setInviteEmail('');
      setShowAddDialog(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error inviting connection:', err);
      setError(err.message || 'Failed to send invite');
    } finally {
      setSaving(false);
    }
  };

  const removeFeaturedConnection = async (id: string) => {
    if (!user) return;

    try {
      await apiDelete(`/api/profile/me/featured-connections/${id}`);
      await loadFeaturedConnections();
    } catch (err: any) {
      console.error('Error removing featured connection:', err);
      setError(err.message || 'Failed to remove connection');
    }
  };

  const filteredConnections = availableConnections.filter(conn => {
    const alreadyFeatured = featuredConnections.some(
      fc => fc.featured_user_id === conn.user_id
    );
    if (alreadyFeatured) return false;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const name = `${conn.first_name} ${conn.last_name}`.toLowerCase();
      return name.includes(query) || conn.email.toLowerCase().includes(query);
    }
    return true;
  });

  // Prepare collage preview data
  const collageConnections = featuredConnections
    .filter(fc => fc.user && fc.featured_user_id)
    .map(fc => ({
      id: fc.id,
      user_id: fc.featured_user_id!,
      first_name: fc.user!.first_name,
      last_name: fc.user!.last_name,
      profile_picture_url: fc.user!.profile_picture_url
    }));

  return (
    <div className="space-y-6">
      {success && (
        <Alert className="border-white/30 bg-white/10 dark:border-white/20 dark:bg-white/5">
          <CheckCircle className="h-4 w-4 text-white" />
          <AlertDescription className="text-white dark:text-white">
            Featured connections updated successfully!
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Preview removed - now shown in main Profile Collage Preview above */}

      {/* Featured Connections List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Featured Connections</CardTitle>
              <CardDescription>
                Showcase up to {MAX_FEATURED} connections on your profile ({featuredConnections.length}/{MAX_FEATURED})
              </CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  disabled={featuredConnections.length >= MAX_FEATURED}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Connection
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Featured Connection</DialogTitle>
                  <DialogDescription>
                    Choose from your existing connections or invite someone new
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Search */}
                  <div>
                    <Label htmlFor="search">Search Connections</Label>
                    <Input
                      id="search"
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Connections List */}
                  <div className="space-y-2">
                    {filteredConnections.length > 0 ? (
                      filteredConnections.map((conn) => (
                        <div
                          key={conn.id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={conn.profile_picture_url || undefined} />
                              <AvatarFallback>
                                {conn.first_name[0]}{conn.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {conn.first_name} {conn.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {conn.email}
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addFeaturedConnection(conn.user_id)}
                            disabled={saving}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No connections found
                      </p>
                    )}
                  </div>

                  {/* Invite by Email */}
                  <div className="pt-4 border-t">
                    <Label htmlFor="invite-email">Or invite by email</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="email@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                      <Button
                        onClick={inviteConnection}
                        disabled={!inviteEmail.trim() || saving}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Invite
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      They'll need to join 6Degrees to appear on your profile
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {featuredConnections.length > 0 ? (
            <div className="space-y-2">
              {featuredConnections.map((fc) => (
                <div
                  key={fc.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    {fc.user ? (
                      <>
                        <Avatar>
                          <AvatarImage src={fc.user.profile_picture_url || undefined} />
                          <AvatarFallback>
                            {fc.user.first_name[0]}{fc.user.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {fc.user.first_name} {fc.user.last_name}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <Avatar>
                          <AvatarFallback>
                            <Mail className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{fc.featured_email}</div>
                          <div className="text-xs text-muted-foreground">Invited</div>
                        </div>
                      </>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFeaturedConnection(fc.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No featured connections yet.</p>
              <p className="text-sm mt-2">
                Add connections to showcase on your profile collage.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeaturedConnectionSelector;


