import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award } from 'lucide-react';
import { apiGet } from '@/lib/api';

interface LeaderboardUser {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  social_capital_score: number;
}

export default function SocialCapitalLeaderboard() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/api/social-capital/leaderboard?limit=10');
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Premium CRED-inspired rank icons with gold/platinum
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-[#CBAA5A]" />; // Gold for #1
    if (rank === 2) return <Medal className="h-5 w-5 text-[#D3D7DB]" />; // Platinum for #2
    if (rank === 3) return <Award className="h-5 w-5 text-[#8A8F99]" />; // Slate for #3
    return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
  };

  // Premium tier-based badge colors matching SOCAP score tiers
  const getScoreBadgeColor = (score: number) => {
    if (score > 500) return 'bg-black text-[#CBAA5A] border border-[#CBAA5A] shadow-[0_0_15px_rgba(203,170,90,0.3)]'; // Black Tier
    if (score >= 400) return 'bg-gradient-to-r from-[#B28A28] to-[#CBAA5A] text-white'; // Platinum/Elite (Rich Gold)
    if (score >= 300) return 'bg-[#CBAA5A]/90 text-[#0B0E11]'; // Elite (Gold)
    if (score >= 200) return 'bg-[#D3D7DB] text-[#0B0E11]'; // Strong (Platinum Silver)
    if (score >= 100) return 'bg-[#8A8F99] text-white'; // Growing (Slate Grey)
    return 'bg-[#666B72] text-white'; // Emerging (Steel Grey)
  };

  if (loading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Social Capital Leaderboard
          </CardTitle>
          <CardDescription>Top professionals in the network</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 animate-pulse">
                <div className="w-8 h-8 bg-muted rounded" />
                <div className="w-12 h-12 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-32" />
                </div>
                <div className="w-16 h-6 bg-muted rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (users.length === 0) {
    return null;
  }

  return (
    <Card className="mb-8 bg-card dark:bg-card border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-white" />
          Social Capital Leaderboard
        </CardTitle>
        <CardDescription>Top professionals in the network by social capital score</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {users.map((user, index) => {
            const rank = index + 1;
            const isTopThree = rank <= 3;

            return (
              <div
                key={user.id}
                className={`flex items-center gap-4 p-3 rounded-lg transition-all hover:scale-[1.02] ${
                  isTopThree
                    ? 'bg-white/5 border border-white/10'
                    : 'bg-white/[0.02] hover:bg-white/5'
                }`}
              >
                {/* Rank */}
                <div className="w-8 flex items-center justify-center">
                  {getRankIcon(rank)}
                </div>

                {/* Avatar */}
                <Avatar className={`h-12 w-12 ${rank === 1 ? 'ring-2 ring-[#CBAA5A]' : ''}`}>
                  <AvatarImage src={user.profile_picture_url || undefined} />
                  <AvatarFallback className="text-sm font-semibold">
                    {user.first_name[0]}{user.last_name[0]}
                  </AvatarFallback>
                </Avatar>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${isTopThree ? 'text-base' : 'text-sm'}`}>
                    {user.first_name} {user.last_name}
                  </p>
                </div>

                {/* Score Badge */}
                <Badge className={`${getScoreBadgeColor(user.social_capital_score)} font-bold px-3 py-1`}>
                  {user.social_capital_score}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}







