import React, { useState, useEffect } from 'react';
import { useOffers, Intro } from '@/hooks/useOffers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Clock, Video, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const IntrosTab: React.FC = () => {
  const { getMyIntros, loading } = useOffers();
  const [intros, setIntros] = useState<Intro[]>([]);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  const loadIntros = async () => {
    try {
      const data = await getMyIntros();
      setIntros(data || []);
    } catch (error) {
      console.error('Error loading intros:', error);
    }
  };

  useEffect(() => {
    loadIntros();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { 
      label: string; 
      variant: 'default' | 'secondary' | 'destructive' | 'outline';
      icon: React.ReactNode;
    }> = {
      scheduled: { 
        label: 'Scheduled', 
        variant: 'default',
        icon: <Calendar className="w-3 h-3" />
      },
      in_progress: { 
        label: 'In Progress', 
        variant: 'default',
        icon: <Video className="w-3 h-3" />
      },
      completed: { 
        label: 'Completed', 
        variant: 'secondary',
        icon: <CheckCircle className="w-3 h-3" />
      },
      cancelled: { 
        label: 'Cancelled', 
        variant: 'destructive',
        icon: <XCircle className="w-3 h-3" />
      },
      no_show: { 
        label: 'No Show', 
        variant: 'destructive',
        icon: <AlertCircle className="w-3 h-3" />
      },
    };

    const config = statusConfig[status] || { 
      label: status, 
      variant: 'outline',
      icon: null
    };
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const filteredIntros = intros.filter(intro => {
    const scheduledTime = new Date(intro.scheduled_start);
    const now = new Date();
    const isUpcoming = scheduledTime > now && intro.status === 'scheduled';
    const isPast = scheduledTime <= now || ['completed', 'cancelled', 'no_show'].includes(intro.status);

    if (filter === 'upcoming') return isUpcoming;
    if (filter === 'past') return isPast;
    return true;
  });

  const upcomingCount = intros.filter(c => {
    const scheduledTime = new Date(c.scheduled_start);
    const now = new Date();
    return scheduledTime > now && c.status === 'scheduled';
  }).length;

  const isCallActive = (intro: Intro) => {
    const now = new Date();
    const start = new Date(intro.scheduled_start);
    const end = new Date(intro.scheduled_end);
    return intro.status === 'scheduled' && now >= start && now <= end;
  };

  const canJoinSoon = (intro: Intro) => {
    const now = new Date();
    const start = new Date(intro.scheduled_start);
    const minutesUntilStart = (start.getTime() - now.getTime()) / (1000 * 60);
    return intro.status === 'scheduled' && minutesUntilStart <= 10 && minutesUntilStart > 0;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Intros</CardTitle>
              <CardDescription>
                Scheduled and past introduction calls
              </CardDescription>
            </div>
            {upcomingCount > 0 && (
              <Badge className="text-sm">
                {upcomingCount} upcoming
              </Badge>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 pt-4">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'upcoming' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('upcoming')}
            >
              Upcoming
            </Button>
            <Button
              variant={filter === 'past' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('past')}
            >
              Past
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading intros...</p>
            </div>
          ) : filteredIntros.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Video className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {filter === 'upcoming' ? 'No upcoming intros' : 
                 filter === 'past' ? 'No past intros' : 
                 'No intros yet'}
              </h3>
              <p className="text-muted-foreground">
                {filter === 'upcoming' 
                  ? 'You don\'t have any scheduled intros' 
                  : filter === 'past'
                  ? 'Your past intros will appear here'
                  : 'When you accept bids and schedule intros, they\'ll appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredIntros.map((intro) => {
                const scheduledDate = new Date(intro.scheduled_start);
                const scheduledEnd = new Date(intro.scheduled_end);
                const active = isCallActive(intro);
                const joinable = canJoinSoon(intro);

                return (
                  <Card key={intro.id} className={`${active ? 'border-primary border-2' : ''}`}>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">
                                {intro.offer?.title || 'Intro Call'}
                              </h3>
                              {active && (
                                <Badge variant="default" className="animate-pulse">
                                  Live Now
                                </Badge>
                              )}
                              {joinable && (
                                <Badge variant="outline">
                                  Starts Soon
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {intro.offer?.description}
                            </p>
                          </div>
                          {getStatusBadge(intro.status)}
                        </div>

                        {/* Participants */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={intro.buyer?.avatar_url} />
                              <AvatarFallback>
                                {intro.buyer?.first_name?.[0]}
                                {intro.buyer?.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {intro.buyer?.first_name} {intro.buyer?.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">Buyer</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={intro.creator?.avatar_url} />
                              <AvatarFallback>
                                {intro.creator?.first_name?.[0]}
                                {intro.creator?.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {intro.creator?.first_name} {intro.creator?.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">Connector</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span className="text-xs">+AI Co-pilot</span>
                          </div>
                        </div>

                        {/* Date & Time */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{format(scheduledDate, 'MMM dd, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>
                              {format(scheduledDate, 'h:mm a')} - {format(scheduledEnd, 'h:mm a')}
                            </span>
                          </div>
                        </div>

                        {/* Join Button */}
                        {(active || joinable) && intro.daily_room_url && (
                          <Button
                            className="w-full"
                            onClick={() => {
                              window.open(intro.daily_room_url, '_blank');
                            }}
                          >
                            <Video className="w-4 h-4 mr-2" />
                            {active ? 'Join Call Now' : 'Join Call'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default IntrosTab;

