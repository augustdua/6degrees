import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, User, DollarSign, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TargetClaimData } from "./TargetClaimModal";

interface ChainApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimData: TargetClaimData;
  chainLength: number;
  totalReward: number;
  onApprove: () => void;
  onReject: () => void;
}

export default function ChainApprovalModal({
  isOpen,
  onClose,
  claimData,
  chainLength,
  totalReward,
  onApprove,
  onReject
}: ChainApprovalModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const rewardPerPerson = (totalReward || 0) / (chainLength || 1);

  const handleApprove = async () => {
    setAction('approve');
    setLoading(true);

    try {
      await onApprove();
      toast({
        title: "Chain Approved!",
        description: `All ${chainLength || 0} participants will receive $${(rewardPerPerson || 0).toFixed(2)} each.`,
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve chain",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handleReject = async () => {
    setAction('reject');
    setLoading(true);

    try {
      await onReject();
      toast({
        title: "Chain Rejected",
        description: "The target claim has been rejected. The chain remains active.",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject chain",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Target Claim Review
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Alert */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800 mb-1">Action Required</p>
                <p className="text-blue-700">
                  Someone has claimed to be the target of your connection request. 
                  Review their details and decide whether to approve or reject the claim.
                </p>
              </div>
            </div>
          </Card>

          {/* Claim Details */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Target Claim Details</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarFallback>
                    <User className="w-6 h-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">{claimData.targetName}</h4>
                  <p className="text-sm text-muted-foreground">{claimData.targetRole} at {claimData.targetCompany}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Email:</p>
                  <p className="text-muted-foreground">{claimData.targetEmail}</p>
                </div>
                <div>
                  <p className="font-medium">Contact Method:</p>
                  <p className="text-muted-foreground capitalize">{claimData.contactPreference}</p>
                </div>
              </div>

              <div>
                <p className="font-medium">Contact Info:</p>
                <p className="text-muted-foreground">{claimData.contactInfo}</p>
              </div>

              {claimData.message && (
                <div>
                  <p className="font-medium">Message:</p>
                  <p className="text-muted-foreground bg-muted p-3 rounded-lg">
                    {claimData.message}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Reward Impact */}
          <Card className="p-6 bg-gradient-success/10 border-success/20">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-success" />
              <h3 className="font-semibold text-success">Reward Distribution</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Total Reward Pool:</span>
                <span className="font-semibold">${totalReward}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Chain Participants:</span>
                <span className="font-semibold">{chainLength}</span>
              </div>
              <div className="flex justify-between items-center text-success font-semibold">
                <span>Each Participant Gets:</span>
                <span>${(rewardPerPerson || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-success/20 rounded-lg">
              <p className="text-sm text-success-foreground">
                ✓ If approved, all participants will receive their rewards immediately
              </p>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Review Later
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              className="flex-1"
              disabled={loading}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {loading && action === 'reject' ? "Rejecting..." : "Reject Claim"}
            </Button>
            <Button
              variant="hero"
              onClick={handleApprove}
              className="flex-1"
              disabled={loading}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {loading && action === 'approve' ? "Approving..." : "Approve & Pay Rewards"}
            </Button>
          </div>

          {/* Warning */}
          <Card className="p-4 bg-amber-50 border-amber-200">
            <div className="text-sm text-amber-700">
              <p className="font-medium mb-1">Important:</p>
              <p>
                Once you approve this claim, the rewards will be distributed to all chain participants 
                and the connection request will be marked as completed. This action cannot be undone.
              </p>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

