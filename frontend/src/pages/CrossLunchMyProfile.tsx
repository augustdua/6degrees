import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, User as UserIcon, Settings as SettingsIcon } from 'lucide-react';
import CrossLunchSettings from '@/pages/CrossLunchSettings';

export default function CrossLunchMyProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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
            <Card className="shadow-[var(--shadow-network)]">
              <CardContent className="p-6 text-sm text-muted-foreground">
                This is your profile hub. Use the Settings tab to edit your info and sync LinkedIn.
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <CrossLunchSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


