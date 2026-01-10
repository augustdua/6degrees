import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useAuth } from '@/hooks/useAuth';

const ThursdayRitual: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Minimal v0: shell page so we can safely make it the default route.
  // Next iterations will populate suggestions, progress, and actions per Update.txt.
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#777]">Thursday</div>
            <h1 className="text-2xl font-semibold">Keep 3 relationships warm today</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-[#333] text-white hover:bg-[#111]"
              onClick={() => navigate('/')}
            >
              Home
            </Button>
            <Button
              variant="outline"
              className="border-[#333] text-white hover:bg-[#111]"
              onClick={() => navigate('/profile?tab=settings')}
            >
              Settings
            </Button>
          </div>
        </div>

        <Card className="bg-[#0b0b0b] border-[#222]">
          <CardHeader>
            <CardTitle className="text-sm tracking-[0.15em] uppercase">Action Pack</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[#bbb]">
            <p>
              This will show 3–5 suggested actions (message, catch-up, intro) with snooze/skip and a progress meter.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate('/messages')} className="bg-[#CBAA5A] text-black hover:bg-white">
                Open Messages
              </Button>
              <Button variant="outline" className="border-[#333] text-white hover:bg-[#111]" onClick={() => navigate('/profile?tab=intros')}>
                Introductions
              </Button>
              <Button variant="outline" className="border-[#333] text-white hover:bg-[#111]" onClick={() => navigate('/profile')}>
                Profile
              </Button>
            </div>
            {user ? (
              <div className="text-[11px] text-[#777]">Signed in as {(user as any)?.email || 'user'}</div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default ThursdayRitual;


