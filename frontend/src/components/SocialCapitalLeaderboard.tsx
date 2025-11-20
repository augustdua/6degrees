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

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white';
    if (score >= 60) return 'bg-gradient-to-r from-purple-500 to-pink-600 text-white';
    if (score >= 40) return 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white';
    if (score >= 20) return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white';
    return 'bg-gradient-to-r from-gray-500 to-slate-600 text-white';
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
    <Card className="mb-8 bg-gradient-to-br from-primary/5 via-background to-background border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
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
                    ? 'bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30'
                    : 'bg-muted/30 hover:bg-muted/50'
                }`}
              >
                {/* Rank */}
                <div className="w-8 flex items-center justify-center">
                  {getRankIcon(rank)}
                </div>

                {/* Avatar */}
                <Avatar className={`h-12 w-12 ${isTopThree ? 'ring-2 ring-primary/50' : ''}`}>
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

