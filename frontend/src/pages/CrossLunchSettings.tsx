import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Linkedin, MapPin, Users, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function formatRelativeTime(iso?: string | null) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function CrossLunchSettings() {
  const navigate = useNavigate();
  const { user, updateProfile, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedinUrl || '');

  useEffect(() => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setBio(user?.bio || '');
    setLinkedinUrl(user?.linkedinUrl || '');
  }, [user?.id]);

  const linkedin = user?.linkedinScrape;
  const liProfile = linkedin?.profile;

  const displayName = useMemo(() => {
    const n = `${firstName} ${lastName}`.trim();
    return n || 'Profile';
  }, [firstName, lastName]);

  const lastSynced = formatRelativeTime(linkedin?.lastScrapedAt);

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await updateProfile({
        firstName,
        lastName,
        bio,
        linkedinUrl,
      } as any);
      if (error) throw error;
      toast({ title: 'Saved', description: 'Profile updated.' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message || 'Could not save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const onSyncLinkedIn = async () => {
    const url = (linkedinUrl || '').trim();
    if (!url) {
      toast({ title: 'Add LinkedIn URL', description: 'Paste your LinkedIn URL first.', variant: 'destructive' });
      return;
    }
    setSyncing(true);
    try {
      await apiPost('/api/linkedin/scrape', { linkedinUrl: url });
      await refreshProfile({ preferBackend: true });
      toast({ title: 'Synced', description: 'Pulled details from LinkedIn.' });
    } catch (e: any) {
      toast({ title: 'Sync failed', description: e?.message || 'Could not sync', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  if (!user) {
    // Shouldn’t happen inside authenticated shell, but be safe.
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <div className="text-foreground font-gilroy font-bold">Please sign in.</div>
            <Button className="mt-4 rounded-full" onClick={() => navigate('/auth')}>
              Sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <Card className="shadow-[var(--shadow-network)]">
          <CardContent className="p-6 flex gap-4">
            <Avatar className="h-16 w-16 ring-1 ring-border">
              <AvatarImage src={user.avatar || undefined} />
              <AvatarFallback className="bg-accent text-foreground font-gilroy">
                {(user.firstName?.[0] || 'C').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-xl font-bold text-foreground truncate" style={{ fontFamily: "'Cherry Bomb One', system-ui, sans-serif" }}>
                {displayName}
              </div>
              {liProfile?.headline ? <div className="text-muted-foreground text-sm mt-1">{liProfile.headline}</div> : null}
              <div className="flex flex-wrap gap-4 mt-3 text-muted-foreground text-sm">
                {liProfile?.location ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{liProfile.location}</span>
                  </span>
                ) : null}
                {(typeof liProfile?.followers === 'number' || typeof liProfile?.connections === 'number') ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span className="truncate">
                      {[typeof liProfile.followers === 'number' ? `${liProfile.followers} followers` : null, typeof liProfile.connections === 'number' ? `${liProfile.connections} connections` : null]
                        .filter(Boolean)
                        .join(' • ')}
                    </span>
                  </span>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-network)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Edit profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">About</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What should people know about you?" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <div className="flex gap-2">
                <Input id="linkedinUrl" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://www.linkedin.com/in/..." />
                <Button variant="outline" className="rounded-full" onClick={onSyncLinkedIn} disabled={syncing}>
                  {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Linkedin className="w-4 h-4" />}
                  <span className="ml-2 hidden sm:inline">{syncing ? 'Syncing…' : 'Sync'}</span>
                </Button>
              </div>
              {lastSynced ? <div className="text-xs text-muted-foreground mt-1">Last synced {lastSynced}</div> : null}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button className="rounded-full" onClick={onSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


