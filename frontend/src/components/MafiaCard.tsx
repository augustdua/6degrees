import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, DollarSign, Crown } from 'lucide-react';
import type { Mafia } from '@/hooks/useMafias';

interface MafiaCardProps {
  mafia: Mafia;
  onViewDetails: (mafiaId: string) => void;
  onJoin?: (mafiaId: string) => void;
}

export const MafiaCard: React.FC<MafiaCardProps> = ({ mafia, onViewDetails, onJoin }) => {
  return (
    <Card 
      className="hover:shadow-lg transition-shadow overflow-hidden border-primary/10 hover:border-primary/30 transition-colors cursor-pointer"
      onClick={() => onViewDetails(mafia.id)}
    >
      <CardContent className="p-0 space-y-0">
        {/* Cover Image / Placeholder */}
        <div className="relative w-full h-48 md:h-56 flex flex-col items-center justify-center bg-gradient-to-br from-primary/8 via-background to-primary/12 overflow-hidden">
          {mafia.cover_image_url ? (
            <img
              src={mafia.cover_image_url}
              alt={mafia.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              {/* Ambient glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-accent/10"></div>
              
              {/* Icon placeholder */}
              <div className="relative backdrop-blur-sm bg-white/60 dark:bg-slate-900/60 p-6 rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30">
                <Crown className="w-16 h-16 text-primary" />
              </div>
            </>
          )}

          {/* Status badge */}
          {mafia.status === 'active' && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-green-500/90 text-white border-0">Active</Badge>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4 md:p-5 space-y-3">
          {/* Mafia Name */}
          <h3 className="text-lg md:text-xl font-bold truncate">{mafia.name}</h3>

          {/* Description */}
          <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {mafia.description}
          </p>

          {/* Stats */}
          <div className="flex items-center justify-between pt-3 border-t mt-3">
            <div className="flex items-center gap-2.5 text-xs md:text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span>{mafia.member_count || 0} members</span>
              </div>
              {mafia.founding_member_count !== undefined && (
                <div className="flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-primary" />
                  <span>{mafia.founding_member_count}/{mafia.founding_member_limit}</span>
                </div>
              )}
            </div>
            <div className="text-primary font-bold text-base md:text-lg">
              ${mafia.monthly_price.toLocaleString()}/mo
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-3">
            <Button
              variant="outline"
              className="flex-1 border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(mafia.id);
              }}
            >
              View Details
            </Button>
            {onJoin && (
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onJoin(mafia.id);
                }}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Join
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

