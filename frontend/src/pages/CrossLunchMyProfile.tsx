import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, ExternalLink, Linkedin, MapPin, Settings as SettingsIcon, User as UserIcon, Users } from 'lucide-react';
import CrossLunchSettings from '@/pages/CrossLunchSettings';

export default function CrossLunchMyProfile() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const didHydrateLinkedIn = useRef(false);

  const tab = (searchParams.get('tab') || 'profile').toLowerCase();
  const activeTab = tab === 'settings' ? 'settings' : 'profile';

  const setTab = (next: 'profile' | 'settings') => {
    const sp = new URLSearchParams(searchParams);
    if (next === 'profile') sp.delete('tab');
    else sp.set('tab', next);
    setSearchParams(sp, { replace: true });
  };

  const myPublicUrl = useMemo(() => {
    if (!user?.id) return null;
    return `/profile/${encodeURIComponent(user.id)}`;
  }, [user?.id]);

  const linkedin = (user as any)?.linkedinScrape;
  const liProfile = linkedin?.profile;
  const headline = String(liProfile?.headline || '').trim() || [liProfile?.jobTitle, liProfile?.companyName].filter(Boolean).join(' @ ') || '';
  const location = String(liProfile?.location || '').trim();
  const followers = liProfile?.followers;
  const connections = liProfile?.connections;
  const experiences: any[] = Array.isArray(liProfile?.experiences) ? liProfile.experiences : [];

  // If the user has a LinkedIn URL but we don’t have enrichment hydrated into the auth state yet,
  // do a best-effort refresh via backend (avoids “I synced but nothing shows” confusion).
  useEffect(() => {
    if (!user?.id) return;
    if (didHydrateLinkedIn.current) return;
    if (!user.linkedinUrl) return;

    const hasAnyLinkedIn =
      !!(user as any)?.linkedinScrape?.profile ||
      !!(user as any)?.linkedinScrape?.lastScrapedAt;

    const hasExperience = Array.isArray((user as any)?.linkedinScrape?.profile?.experiences) &&
      ((user as any)?.linkedinScrape?.profile?.experiences?.length || 0) > 0;

    // Only hydrate if we’re missing data (or have no experience list yet).
    if (!hasAnyLinkedIn || !hasExperience) {
      didHydrateLinkedIn.current = true;
      refreshProfile({ preferBackend: true }).catch(() => {
        // ignore
      });
    }
  }, [user?.id]);

  if (!user) {
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
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="text-lg font-bold text-foreground" style={{ fontFamily: "'Cherry Bomb One', system-ui, sans-serif" }}>
            My Profile
          </div>
          {myPublicUrl ? (
            <Button variant="outline" className="rounded-full" onClick={() => navigate(myPublicUrl)}>
              <ExternalLink className="w-4 h-4" />
              <span className="ml-2">Public preview</span>
            </Button>
          ) : null}
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setTab(v === 'settings' ? 'settings' : 'profile')}>
          <TabsList>
            <TabsTrigger value="profile" className="gap-2">
              <UserIcon className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <SettingsIcon className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4">
            <div className="space-y-6">
              <Card className="shadow-[var(--shadow-network)]">
                <CardContent className="p-6 flex gap-4">
                  <Avatar className="h-16 w-16 ring-1 ring-border">
                    <AvatarImage src={user.avatar || undefined} />
                    <AvatarFallback className="bg-accent text-foreground font-gilroy">
                      {(user.firstName?.[0] || 'C').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-xl font-bold text-foreground truncate" style={{ fontFamily: "'Cherry Bomb One', system-ui, sans-serif" }}>
                      {`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'You'}
                    </div>
                    {headline ? <div className="text-muted-foreground text-sm mt-1">{headline}</div> : null}

                    <div className="flex flex-wrap gap-4 mt-3 text-muted-foreground text-sm">
                      {location ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{location}</span>
                        </span>
                      ) : null}
                      {user.linkedinUrl ? (
                        <a href={user.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
                          <Linkedin className="w-4 h-4" />
                          <span className="truncate">LinkedIn</span>
                        </a>
                      ) : null}
                      {(typeof followers === 'number' || typeof connections === 'number') ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          <span className="truncate">
                            {[typeof followers === 'number' ? `${followers} followers` : null, typeof connections === 'number' ? `${connections} connections` : null]
                              .filter(Boolean)
                              .join(' • ')}
                          </span>
                        </span>
                      ) : null}
                    </div>

                    {(user.bio || liProfile?.about) ? (
                      <div className="mt-4 text-foreground/90 text-sm leading-relaxed">
                        {String(user.bio || liProfile?.about || '').trim()}
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-[var(--shadow-network)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Experience</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {experiences.length === 0 ? (
                    <div className="text-muted-foreground text-sm">
                      No LinkedIn experience loaded yet. Go to Settings → Sync to pull it.
                    </div>
                  ) : (
                    experiences.slice(0, 8).map((e, idx) => {
                      const companyName = String(e?.companyName || '').trim() || 'Organization';
                      const title = String(e?.title || '').trim();
                      const logo = typeof e?.logo === 'string' ? e.logo : null;
                      return (
                        <div key={`${companyName}-${idx}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                          <div className="w-10 h-10 rounded-xl bg-accent border border-border p-2 flex items-center justify-center shrink-0">
                            {logo ? <img src={logo} alt={companyName} className="w-full h-full object-contain" /> : <Building2 className="w-5 h-5 text-muted-foreground" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-foreground text-sm font-gilroy truncate">{companyName}</div>
                            <div className="text-muted-foreground text-xs truncate">{title || '—'}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <CrossLunchSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


