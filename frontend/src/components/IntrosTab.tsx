import React, { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Phone, Video, Users, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { IntroCallStartModal } from './IntroCallStartModal';
import { getAvatarColor, getInitials } from '@/lib/avatarUtils';

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
    profile_picture_url?: string;
  };
  creator: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
  };
  target: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-gilroy tracking-[0.15em] uppercase text-sm text-white flex items-center gap-2">
              <Video className="w-4 h-4 text-[#CBAA5A]" />
              MY INTROS
            </h3>
            <p className="font-gilroy tracking-[0.1em] uppercase text-[10px] text-[#666]">
              YOUR INTRO CALL REQUESTS AND SCHEDULED CALLS
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge className="font-gilroy tracking-[0.1em] uppercase text-[9px] bg-[#CBAA5A] text-black">
              {pendingCount} PENDING
            </Badge>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className={`font-gilroy tracking-[0.1em] uppercase text-[9px] ${filter === 'all' ? 'bg-[#CBAA5A] text-black' : 'border-[#333] text-[#888]'}`}
          >
            ALL
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
            className={`font-gilroy tracking-[0.1em] uppercase text-[9px] ${filter === 'pending' ? 'bg-[#CBAA5A] text-black' : 'border-[#333] text-[#888]'}`}
          >
            PENDING
          </Button>
          <Button
            variant={filter === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('completed')}
            className={`font-gilroy tracking-[0.1em] uppercase text-[9px] ${filter === 'completed' ? 'bg-[#CBAA5A] text-black' : 'border-[#333] text-[#888]'}`}
          >
            COMPLETED
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#CBAA5A] mx-auto"></div>
            <p className="mt-2 font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#666]">LOADING INTROS...</p>
          </div>
          ) : filteredIntros.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-gilroy tracking-[0.15em] uppercase text-sm text-white mb-2">
                {filter === 'pending' ? 'NO PENDING INTROS' : 
                 filter === 'completed' ? 'NO COMPLETED INTROS' : 
                 'NO INTROS YET'}
              </h3>
              <p className="font-gilroy tracking-[0.1em] uppercase text-[10px] text-[#666]">
                {filter === 'pending' 
                  ? 'YOU DON\'T HAVE ANY PENDING INTRO CALLS' 
                  : filter === 'completed'
                  ? 'YOUR COMPLETED INTROS WILL APPEAR HERE'
                  : 'WHEN CREATORS APPROVE YOUR CALL REQUESTS, THEY\'LL APPEAR HERE'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredIntros.map((intro) => {
                const isInProgress = intro.status === 'in_progress';

                return (
                  <div key={intro.id} className={`rounded-2xl border ${isInProgress ? 'border-[#CBAA5A] border-2' : 'border-[#222]'} bg-gradient-to-br from-[#111] to-black p-4`}>
                    <div className="space-y-3">
                      {/* Status Badge */}
                      <div className="flex items-center justify-between">
                        {getStatusBadge(intro.status)}
                        {isInProgress && (
                          <Badge className="animate-pulse font-gilroy tracking-[0.1em] uppercase text-[8px] bg-[#CBAA5A] text-black">
                            LIVE
                          </Badge>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-gilroy tracking-[0.1em] uppercase text-[11px] text-white line-clamp-2">
                        {intro.offer?.title || 'INTRO CALL'}
                      </h3>

                      {/* Description */}
                      <p className="font-gilroy tracking-[0.05em] uppercase text-[9px] text-[#666] line-clamp-2">
                        {intro.offer?.description}
                      </p>

                      {/* Participants */}
                      <div className="flex items-center gap-2 pt-2 border-t border-[#222]">
                        <div className="flex -space-x-2">
                          <Avatar className="h-6 w-6 border-2 border-black">
                            <AvatarImage src={intro.buyer?.profile_picture_url} />
                            <AvatarFallback className="bg-[#CBAA5A] text-black text-[8px] font-gilroy">
                              {getInitials(intro.buyer?.first_name, intro.buyer?.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <Avatar className="h-6 w-6 border-2 border-black">
                            <AvatarImage src={intro.creator?.profile_picture_url} />
                            <AvatarFallback className="bg-[#333] text-white text-[8px] font-gilroy">
                              {getInitials(intro.creator?.first_name, intro.creator?.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <Avatar className="h-6 w-6 border-2 border-black">
                            <AvatarImage src={intro.target?.profile_picture_url} />
                            <AvatarFallback className="bg-[#222] text-white text-[8px] font-gilroy">
                              {getInitials(intro.target?.first_name, intro.target?.last_name)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <span className="font-gilroy tracking-[0.1em] uppercase text-[8px] text-[#666]">3 PARTICIPANTS</span>
                      </div>

                      {/* Action Button */}
                      <div className="pt-2">
                        {intro.status === 'pending' && (
                          <Button
                            className="w-full bg-[#CBAA5A] text-black hover:bg-white font-gilroy tracking-[0.1em] uppercase text-[9px] h-8"
                            onClick={() => handleStartCall(intro)}
                          >
                            <Video className="w-3 h-3 mr-2" />
                            START CALL
                          </Button>
                        )}
                        
                        {intro.status === 'in_progress' && intro.daily_room_url && (
                          <Button
                            className="w-full bg-green-600 text-white hover:bg-green-700 font-gilroy tracking-[0.1em] uppercase text-[9px] h-8"
                            onClick={() => window.open(intro.daily_room_url, '_blank')}
                          >
                            <Video className="w-3 h-3 mr-2" />
                            JOIN CALL
                          </Button>
                        )}

                        {intro.status === 'completed' && intro.completed_at && (
                          <p className="font-gilroy tracking-[0.1em] uppercase text-[9px] text-[#666] text-center">
                            COMPLETED {format(new Date(intro.completed_at), 'MMM DD, YYYY').toUpperCase()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

