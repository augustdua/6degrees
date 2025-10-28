import React, { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Phone, Video, Users, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { IntroCallStartModal } from './IntroCallStartModal';

interface Intro {
  id: string;
  offer_id: string;
  buyer_id: string;
  creator_id: string;
  target_id: string;
  status: string;
  buyer_context?: string;
  buyer_questions?: any;
  daily_room_url?: string;
  daily_room_name?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  user_role: 'buyer' | 'creator' | 'target';
  offer: {
    id: string;
    title: string;
    description: string;
    asking_price_inr: number;
  };
  buyer: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  creator: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  target: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

const IntrosTab: React.FC = () => {
  const [intros, setIntros] = useState<Intro[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedIntro, setSelectedIntro] = useState<Intro | null>(null);
  const [showStartModal, setShowStartModal] = useState(false);

  const loadIntros = async () => {
    setLoading(true);
    try {
      const data = await apiGet<Intro[]>('/api/intros/my');
      setIntros(data || []);
    } catch (error) {
      console.error('Error loading intros:', error);
    } finally {
      setLoading(false);
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
      pending: { 
        label: 'Ready to Start', 
        variant: 'default',
        icon: <Clock className="w-3 h-3" />
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
        icon: <AlertCircle className="w-3 h-3" />
      },
    };

    const config = statusConfig[status] || { 
      label: status, 
      variant: 'outline',
      icon: null
    };
    
    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const filteredIntros = intros.filter(intro => {
    if (filter === 'pending') return intro.status === 'pending' || intro.status === 'in_progress';
    if (filter === 'completed') return intro.status === 'completed';
    return true;
  });

  const pendingCount = intros.filter(i => i.status === 'pending' || i.status === 'in_progress').length;

  const handleStartCall = (intro: Intro) => {
    setSelectedIntro(intro);
    setShowStartModal(true);
  };

  const handleCallStarted = () => {
    setShowStartModal(false);
    loadIntros(); // Reload to get updated status
  };

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>My Intros</CardTitle>
                <CardDescription>
                  Your intro call requests and scheduled calls
                </CardDescription>
              </div>
              {pendingCount > 0 && (
                <Badge className="text-sm">
                  {pendingCount} pending
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
                variant={filter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('pending')}
              >
                Pending
              </Button>
              <Button
                variant={filter === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('completed')}
              >
                Completed
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
                <Phone className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {filter === 'pending' ? 'No pending intros' : 
                 filter === 'completed' ? 'No completed intros' : 
                 'No intros yet'}
              </h3>
              <p className="text-muted-foreground">
                {filter === 'pending' 
                  ? 'You don\'t have any pending intro calls' 
                  : filter === 'completed'
                  ? 'Your completed intros will appear here'
                  : 'When creators approve your call requests, they\'ll appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredIntros.map((intro) => {
                const isInProgress = intro.status === 'in_progress';

                return (
                  <Card key={intro.id} className={`${isInProgress ? 'border-primary border-2' : ''}`}>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">
                                {intro.offer?.title || 'Intro Call'}
                              </h3>
                              {isInProgress && (
                                <Badge variant="default" className="animate-pulse">
                                  In Progress
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
                        <div className="flex flex-wrap items-center gap-4">
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

                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={intro.target?.avatar_url} />
                              <AvatarFallback>
                                {intro.target?.first_name?.[0]}
                                {intro.target?.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {intro.target?.first_name} {intro.target?.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">Target</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span className="text-xs">+AI Co-pilot</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          {intro.status === 'pending' && (
                            <Button
                              className="flex-1"
                              onClick={() => handleStartCall(intro)}
                            >
                              <Video className="w-4 h-4 mr-2" />
                              Start Call
                            </Button>
                          )}
                          
                          {intro.status === 'in_progress' && intro.daily_room_url && (
                            <Button
                              className="flex-1"
                              onClick={() => window.open(intro.daily_room_url, '_blank')}
                            >
                              <Video className="w-4 h-4 mr-2" />
                              Join Call
                            </Button>
                          )}

                          {intro.status === 'completed' && intro.completed_at && (
                            <div className="text-sm text-muted-foreground">
                              Completed {format(new Date(intro.completed_at), 'MMM dd, yyyy')}
                            </div>
                          )}
                        </div>
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

    {/* Start Call Modal */}
    {selectedIntro && (
      <IntroCallStartModal
        open={showStartModal}
        onClose={() => setShowStartModal(false)}
        intro={selectedIntro}
        onCallStarted={handleCallStarted}
      />
    )}
  </>
  );
};

export default IntrosTab;

