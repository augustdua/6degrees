import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Linkedin, MapPin, Users } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TopHeader from '@/components/TopHeader';

type SeedProfile = {
  id: string;
  slug: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  linkedin_url: string | null;
  profile_picture_url: string | null;
  enrichment: any;
  status: 'unclaimed' | 'claimed';
};

type SeedProfileOrgRow = {
  id: string;
  position: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  logo_url: string | null;
  organizations?: {
    id: string;
    name: string;
    logo_url: string | null;
    website?: string | null;
    domain?: string | null;
    industry?: string | null;
  } | null;
};

export default function SeedPublicProfile() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState<SeedProfile | null>(null);
  const [orgs, setOrgs] = useState<SeedProfileOrgRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) return;
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet(`/api/seed-profiles/${encodeURIComponent(slug)}`, { skipCache: true });
        if (cancelled) return;
        setSeed((data as any)?.seed_profile || null);
        setOrgs(Array.isArray((data as any)?.organizations) ? (data as any).organizations : []);
      } catch (e: any) {
        if (cancelled) return;
        if (String(e?.message || '').includes('404')) setError('Profile not found');
        else setError('Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground font-gilroy text-sm">Loading profile…</div>
        </div>
      </div>
    );
  }

  if (error || !seed) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopHeader />
        <div className="max-w-4xl mx-auto px-4 py-8 w-full">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-gilroy text-sm">Back</span>
          </button>
          <Card>
            <CardContent className="py-10 text-center">
              <div className="text-foreground font-gilroy font-bold text-lg">{error || 'Profile not found'}</div>
              <div className="text-muted-foreground text-sm mt-2">Try checking the link or come back later.</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const displayName =
    (seed.display_name || '').trim() ||
    [seed.first_name, seed.last_name].filter(Boolean).join(' ').trim() ||
    'Unknown';

  const headline = (seed.headline || '').trim();
  const bio = (seed.bio || '').trim();
  const location = (seed.location || '').trim();
  const linkedinUrl = (seed.linkedin_url || '').trim();

  const followers = (seed?.enrichment as any)?.linkedin?.profile?.followers;
  const connections = (seed?.enrichment as any)?.linkedin?.profile?.connections;

  return (
    <div className="min-h-screen bg-background">
      <TopHeader />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-gilroy text-sm">Back</span>
          </button>
          <Button onClick={() => navigate(`/auth?returnUrl=${encodeURIComponent(window.location.pathname)}`)} className="rounded-full">
            Join to connect
          </Button>
        </div>

        <Card className="shadow-[var(--shadow-network)]">
          <CardContent className="p-6">
            <div className="flex gap-5">
              <div className="w-20 h-20 rounded-2xl bg-accent border border-border overflow-hidden flex items-center justify-center shrink-0">
                {seed.profile_picture_url ? (
                  <img src={seed.profile_picture_url} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-foreground">
                    {(seed.first_name?.[0] || 'A').toUpperCase()}
                    {(seed.last_name?.[0] || 'B').toUpperCase()}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-foreground truncate">
                      {displayName}
                    </h1>
                    {headline ? <div className="text-muted-foreground text-sm mt-1">{headline}</div> : null}

                    {(location || linkedinUrl) ? (
                      <div className="flex flex-wrap gap-4 mt-3 text-muted-foreground text-sm">
                        {location ? (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate">{location}</span>
                          </span>
                        ) : null}
                        {linkedinUrl ? (
                          <a
                            href={linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                          >
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
                    ) : null}
                  </div>
                </div>

                {bio ? <div className="mt-4 text-foreground/90 text-sm leading-relaxed">{bio}</div> : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 shadow-[var(--shadow-network)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orgs.length === 0 ? (
              <div className="text-muted-foreground text-sm">No experience loaded yet.</div>
            ) : (
              orgs.slice(0, 8).map((r) => {
                const org = r.organizations;
                const orgName = org?.name || 'Organization';
                const logo = r.logo_url || org?.logo_url || null;
                return (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <div className="w-10 h-10 rounded-xl bg-accent border border-border p-2 flex items-center justify-center shrink-0">
                      {logo ? <img src={logo} alt={orgName} className="w-full h-full object-contain" /> : <Building2 className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-foreground text-sm font-gilroy truncate">{orgName}</div>
                      <div className="text-muted-foreground text-xs truncate">
                        {[r.position, r.is_current ? 'Current' : null].filter(Boolean).join(' • ')}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="text-center pt-6 mt-8 border-t border-border">
          <p className="text-xs text-muted-foreground">
            This is an auto-generated profile from public data. If you are this person, you’ll be able to claim it soon.
          </p>
        </div>
      </div>
    </div>
  );
}


