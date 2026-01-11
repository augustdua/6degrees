import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import WhatsAppConnectCard from '@/components/profile/WhatsAppConnectCard';

export function WhatsAppInviteModal(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-[760px]">
        <DialogHeader>
          <DialogTitle className="font-gilroy tracking-[0.12em] uppercase text-xs">Add contacts (WhatsApp)</DialogTitle>
        </DialogHeader>
        <div className="max-h-[75vh] overflow-auto pr-1">
          <WhatsAppConnectCard />
        </div>
      </DialogContent>
    </Dialog>
  );
}


