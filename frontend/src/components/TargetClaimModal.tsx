import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, User, DollarSign, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ConnectionRequest, Chain } from "@/hooks/useRequests";

interface TargetClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ConnectionRequest;
  chain: Chain | null;
  onClaim: (claimData: TargetClaimData) => void;
}

export interface TargetClaimData {
  targetName: string;
  targetEmail: string;
  targetCompany: string;
  targetRole: string;
  message: string;
  contactPreference: 'email' | 'linkedin' | 'phone';
  contactInfo: string;
}

export default function TargetClaimModal({ 
  isOpen, 
  onClose, 
  request, 
  chain, 
  onClaim 
}: TargetClaimModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [claimData, setClaimData] = useState<TargetClaimData>({
    targetName: '',
    targetEmail: '',
    targetCompany: '',
    targetRole: '',
    message: '',
    contactPreference: 'email',
    contactInfo: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onClaim(claimData);
      toast({
        title: "Target Claim Submitted!",
        description: "The chain creator will review your claim and decide whether to accept it.",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit claim",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const rewardPerPerson = chain ? (request.reward || 0) / (chain.chainLength || 1) : (request.reward || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Claim Target Reward
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Request Summary */}
          <Card className="p-6 bg-muted/50">
            <div className="flex items-start gap-4 mb-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src={request.creator?.avatar} />
                <AvatarFallback>
                  <User className="w-6 h-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold">{request.creator?.firstName} {request.creator?.lastName}</h3>
                <p className="text-sm text-muted-foreground">wants to connect with:</p>
              </div>
            </div>
            
            <div className="bg-background p-4 rounded-lg border">
              <h4 className="font-medium mb-2">{request.target}</h4>
              {request.message && (
                <p className="text-sm text-muted-foreground mb-3">{request.message}</p>
              )}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-success/10 text-success">
                  <DollarSign className="w-3 h-3 mr-1" />
                  ${request.reward} Total Reward
                </Badge>
                <Badge variant="outline">
                  {chain?.chainLength || 1} participants
                </Badge>
              </div>
            </div>
          </Card>

          {/* Reward Breakdown */}
          <Card className="p-6 bg-gradient-success/10 border-success/20">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-success" />
              <h3 className="font-semibold text-success">Your Potential Reward</h3>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-success mb-2">
                ${(rewardPerPerson || 0).toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">
                Split equally among {chain?.chainLength || 1} chain participants
              </p>
            </div>
          </Card>

          {/* Claim Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Confirm Your Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetName">Your Name</Label>
                  <Input
                    id="targetName"
                    value={claimData.targetName}
                    onChange={(e) => setClaimData(prev => ({ ...prev, targetName: e.target.value }))}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetEmail">Email Address</Label>
                  <Input
                    id="targetEmail"
                    type="email"
                    value={claimData.targetEmail}
                    onChange={(e) => setClaimData(prev => ({ ...prev, targetEmail: e.target.value }))}
                    placeholder="john@company.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetCompany">Company</Label>
                  <Input
                    id="targetCompany"
                    value={claimData.targetCompany}
                    onChange={(e) => setClaimData(prev => ({ ...prev, targetCompany: e.target.value }))}
                    placeholder="OpenAI"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetRole">Role/Title</Label>
                  <Input
                    id="targetRole"
                    value={claimData.targetRole}
                    onChange={(e) => setClaimData(prev => ({ ...prev, targetRole: e.target.value }))}
                    placeholder="Software Engineer"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message to Creator</Label>
                <Textarea
                  id="message"
                  value={claimData.message}
                  onChange={(e) => setClaimData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Hi! I'm interested in connecting. Here's what I can help with..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPreference">Preferred Contact Method</Label>
                <select
                  id="contactPreference"
                  value={claimData.contactPreference}
                  onChange={(e) => setClaimData(prev => ({ 
                    ...prev, 
                    contactPreference: e.target.value as 'email' | 'linkedin' | 'phone' 
                  }))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="email">Email</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="phone">Phone</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactInfo">Contact Information</Label>
                <Input
                  id="contactInfo"
                  value={claimData.contactInfo}
                  onChange={(e) => setClaimData(prev => ({ ...prev, contactInfo: e.target.value }))}
                  placeholder={
                    claimData.contactPreference === 'email' ? 'john@company.com' :
                    claimData.contactPreference === 'linkedin' ? 'linkedin.com/in/johndoe' :
                    '+1 (555) 123-4567'
                  }
                  required
                />
              </div>
            </div>

            {/* Warning */}
            <Card className="p-4 bg-amber-50 border-amber-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 mb-1">Important:</p>
                  <p className="text-amber-700">
                    By claiming this reward, you confirm that you are the target person described in the request. 
                    The chain creator will review your claim and decide whether to accept it. 
                    If accepted, all chain participants will receive their rewards.
                  </p>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="hero"
                className="flex-1"
                disabled={loading}
              >
                {loading ? "Submitting..." : "Claim Reward"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

