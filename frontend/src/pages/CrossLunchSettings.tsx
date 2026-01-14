import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { apiPost, apiPut } from '@/lib/api';
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
  const { user, refreshProfile } = useAuth();
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
  const liAbout = String(liProfile?.about || '').trim();
  const liHeadline = String(liProfile?.headline || '').trim();
  const liLocation = String(liProfile?.location || '').trim();
  const liJobTitle = String(liProfile?.jobTitle || '').trim();
  const liCompanyName = String(liProfile?.companyName || '').trim();

  const displayName = useMemo(() => {
    const n = `${firstName} ${lastName}`.trim();
    return n || 'Profile';
  }, [firstName, lastName]);

  const lastSynced = formatRelativeTime(linkedin?.lastScrapedAt);

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Use backend endpoint so it’s visible in Network and not blocked by client-side RLS quirks.
      await apiPut('/api/users/profile', {
        firstName,
        lastName,
        bio,
        linkedinUrl,
      });
      await refreshProfile({ preferBackend: true });
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
      toast({ title: 'Syncing LinkedIn…', description: 'This can take a few seconds.' });
      const resp = await apiPost('/api/linkedin/scrape', { linkedinUrl: url });

      // Best-effort: immediately reflect scraped fields in the form (UX),
      // while the authoritative data persists via refreshProfile.
      const scraped = resp?.scraped;
      if (scraped && typeof scraped === 'object') {
        if (typeof scraped.firstName === 'string' && scraped.firstName.trim()) setFirstName(scraped.firstName.trim());
        if (typeof scraped.lastName === 'string' && scraped.lastName.trim()) setLastName(scraped.lastName.trim());
        if (!bio.trim() && typeof scraped.about === 'string' && scraped.about.trim()) setBio(scraped.about.trim());
        if (typeof scraped.linkedinUrl === 'string' && scraped.linkedinUrl.trim()) setLinkedinUrl(scraped.linkedinUrl.trim());
      }

      await refreshProfile({ preferBackend: true });
      toast({ title: 'Synced', description: 'LinkedIn details pulled and saved.' });
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
              {liAbout && !bio.trim() ? (
                <div className="text-xs text-muted-foreground mt-1">
                  Tip: you have a LinkedIn “About” available — hit Sync to auto-fill.
                </div>
              ) : null}
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

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">LinkedIn fields (synced)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Headline</Label>
                  <Input value={liHeadline || ''} readOnly />
                </div>
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Input value={liLocation || ''} readOnly />
                </div>
                <div className="space-y-1.5">
                  <Label>Job title</Label>
                  <Input value={liJobTitle || ''} readOnly />
                </div>
                <div className="space-y-1.5">
                  <Label>Company</Label>
                  <Input value={liCompanyName || ''} readOnly />
                </div>
              </div>
              {(typeof liProfile?.followers === 'number' || typeof liProfile?.connections === 'number') ? (
                <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
                  {typeof liProfile?.followers === 'number' ? <span>{liProfile.followers} followers</span> : null}
                  {typeof liProfile?.connections === 'number' ? <span>{liProfile.connections} connections</span> : null}
                </div>
              ) : null}
              <div className="text-xs text-muted-foreground">
                These are read-only for now (source of truth: LinkedIn scrape). Use “About” above to control what shows on your CrossLunch profile.
              </div>
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


