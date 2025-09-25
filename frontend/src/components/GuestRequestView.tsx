import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { User, ArrowRight, Shield, DollarSign, Copy, Share2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useRequests } from "@/hooks/useRequests";
import { useTargetClaims } from "@/hooks/useTargetClaims";
import { ConnectionRequest, Chain } from "@/hooks/useRequests";
import TargetClaimModal, { TargetClaimData } from "./TargetClaimModal";

interface GuestRequestViewProps {
  request: ConnectionRequest;
  chain: Chain | null;
  linkId: string;
}

export default function GuestRequestView({ request, chain, linkId }: GuestRequestViewProps) {
  const [showSignupPrompt, setShowSignupPrompt] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [newShareableLink, setNewShareableLink] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showTargetClaimModal, setShowTargetClaimModal] = useState(false);
  const { user } = useAuth();
  const { joinChain } = useRequests();
  const { submitTargetClaim } = useTargetClaims();
  const { toast } = useToast();

  const handleJoinChain = async () => {
    if (!user) {
      setShowSignupPrompt(true);
      return;
    }

    try {
      const result = await joinChain(request.id);
      setHasJoined(true);

      // Generate new shareable link for this user
      const newLinkId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const newLink = `${window.location.origin}/r/${newLinkId}`;
      setNewShareableLink(newLink);

      toast({
        title: "Welcome to the Chain!",
        description: "You've successfully joined. Share your new link to continue building the connection.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join chain",
        variant: "destructive",
      });
    }
  };

  const handleSignUp = () => {
    // Redirect to signup with return URL
    window.location.href = `/auth?returnUrl=/r/${linkId}`;
  };

  const copyNewLink = () => {
    if (newShareableLink) {
      const shareText = customMessage
        ? `${customMessage}\n\n${newShareableLink}`
        : newShareableLink;

      navigator.clipboard.writeText(shareText);
      toast({
        title: "Link Copied!",
        description: customMessage
          ? "Your personalized message and link have been copied."
          : "Share this link to continue building the connection chain.",
      });
    }
  };

  const shareToSocialMedia = (platform: string) => {
    if (!newShareableLink) return;

    const defaultMessage = `Help me connect with ${request.target}! Join this networking chain and earn rewards when we succeed.`;
    const shareText = customMessage || defaultMessage;
    const fullText = `${shareText} ${newShareableLink}`;

    let url = "";
    switch (platform) {
      case "linkedin":
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(newShareableLink)}&text=${encodeURIComponent(shareText)}`;
        break;
      case "twitter":
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`;
        break;
      case "whatsapp":
        url = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
        break;
      default:
        copyNewLink();
        return;
    }

    window.open(url, '_blank', 'width=600,height=400');
  };

  const handleTargetClaim = async (claimData: TargetClaimData) => {
    try {
      await submitTargetClaim(
        request.id,
        chain?.id || 'temp-chain-id', // We'll handle this properly
        {
          targetName: claimData.targetName,
          targetEmail: claimData.targetEmail,
          targetCompany: claimData.targetCompany,
          targetRole: claimData.targetRole,
          message: claimData.message,
          contactPreference: claimData.contactPreference,
          contactInfo: claimData.contactInfo,
        }
      );

      toast({
        title: "Target Claim Submitted!",
        description: "The chain creator will review your claim and decide whether to accept it.",
      });

      setShowTargetClaimModal(false);
    } catch (error) {
      console.error('Error submitting target claim:', error);
      throw error; // Let the modal handle the error display
    }
  };

  if (showSignupPrompt && !user) {
    return (
      <Card className="p-8 max-w-2xl mx-auto shadow-network">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-network rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          
          <h2 className="text-2xl font-bold mb-4">Join 6Degree to Continue</h2>
          <p className="text-muted-foreground mb-6">
            You've been invited to join a connection chain! Sign up to participate and earn rewards.
          </p>
        </div>

        {/* Request Preview */}
        <div className="bg-muted p-6 rounded-lg mb-6">
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
                ${request.reward} Reward
              </Badge>
              <Badge variant="outline">
                {chain?.chainLength || 1} in chain
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Button onClick={handleSignUp} variant="hero" size="lg" className="w-full">
            Sign Up & Join Chain
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          
          <Button 
            onClick={() => setShowSignupPrompt(false)} 
            variant="outline" 
            size="lg" 
            className="w-full"
          >
            View Details First
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground mt-6">
          <p>✓ Secure & encrypted</p>
          <p>✓ No spam, just connections</p>
          <p>✓ Earn rewards for helping</p>
        </div>
      </Card>
    );
  }

  // Success view after joining the chain
  if (hasJoined && newShareableLink) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="p-8 shadow-success">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-success rounded-full flex items-center justify-center mx-auto mb-6">
              <Share2 className="w-8 h-8 text-success-foreground" />
            </div>

            <h2 className="text-2xl font-bold mb-4">You're Now Part of the Chain!</h2>
            <p className="text-muted-foreground mb-8">
              You've successfully joined the connection chain for: <span className="font-semibold text-foreground">{request.target}</span>
            </p>

            <div className="bg-gradient-success/10 p-4 rounded-lg border border-success/20 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-success" />
                <h4 className="font-medium text-success">Potential Reward: ${request.reward / ((chain?.chainLength || 1) + 1)}</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Your share if the connection succeeds
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Personalize Your Share</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Add a personal message to increase engagement when sharing with your network.
              </p>

              <div className="space-y-3">
                <Label htmlFor="custom-message">Your message (optional)</Label>
                <Textarea
                  id="custom-message"
                  placeholder="e.g., 'I know someone who might be perfect for this opportunity!' or 'This could be great for your network!'"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="min-h-[100px] resize-none"
                  maxLength={280}
                />
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Personal messages get 3x more engagement</span>
                  <span>{customMessage.length}/280</span>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Preview</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? "Hide" : "Show"} Preview
                </Button>
              </div>

              {showPreview && (
                <div className="bg-muted/50 p-4 rounded-lg border-2 border-dashed">
                  {customMessage && (
                    <p className="text-sm mb-3 text-foreground">{customMessage}</p>
                  )}
                  <div className="bg-background p-3 rounded border">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <span className="text-primary-foreground font-bold text-xs">6°</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">6Degree Connection Chain</p>
                        <p className="text-xs text-muted-foreground">Help connect with {request.target}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground break-all">{newShareableLink}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Sharing Options */}
            <div className="space-y-4">
              <Label>Share Your Link</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={copyNewLink} variant="default" className="w-full">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
                <Button onClick={() => shareToSocialMedia('linkedin')} variant="outline" className="w-full">
                  LinkedIn
                </Button>
                <Button onClick={() => shareToSocialMedia('twitter')} variant="outline" className="w-full">
                  Twitter
                </Button>
                <Button onClick={() => shareToSocialMedia('whatsapp')} variant="outline" className="w-full">
                  WhatsApp
                </Button>
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground space-y-1">
              <p>✓ Share your link to find more connections</p>
              <p>✓ Earn rewards when the chain completes</p>
              <p>✓ Track progress in your dashboard</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <Card className="p-8 max-w-2xl mx-auto shadow-network">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-network rounded-full flex items-center justify-center mx-auto mb-6">
          <User className="w-8 h-8 text-primary-foreground" />
        </div>
        
        <h2 className="text-2xl font-bold mb-4">Connection Request</h2>
        <p className="text-muted-foreground">
          Help {request.creator?.firstName} connect with their target and earn rewards!
        </p>
      </div>

      {/* Request Details */}
      <div className="space-y-6">
        <div className="bg-muted p-6 rounded-lg">
          <div className="flex items-start gap-4 mb-4">
            <Avatar className="w-12 h-12">
              <AvatarImage src={request.creator?.avatar} />
              <AvatarFallback>
                <User className="w-6 h-6" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold">{request.creator?.firstName} {request.creator?.lastName}</h3>
              <p className="text-sm text-muted-foreground">{request.creator?.bio}</p>
            </div>
          </div>
          
          <div className="bg-background p-4 rounded-lg border">
            <h4 className="font-medium mb-2">Looking to connect with:</h4>
            <p className="text-lg mb-3">{request.target}</p>
            {request.message && (
              <p className="text-muted-foreground mb-3">{request.message}</p>
            )}
          </div>
        </div>

        {/* Chain Info */}
        <div className="bg-muted p-6 rounded-lg">
          <h4 className="font-medium mb-4">Current Chain ({chain?.chainLength || 1} participants)</h4>
          <div className="space-y-3">
            {chain?.participants.map((participant, index) => (
              <div key={participant.userid} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{participant.firstName} {participant.lastName}</p>
                  <p className="text-sm text-muted-foreground capitalize">{participant.role}</p>
                </div>
                {participant.rewardAmount && (
                  <Badge variant="outline" className="bg-success/10 text-success">
                    ${participant.rewardAmount}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Reward Info */}
        <div className="bg-gradient-success/10 p-6 rounded-lg border border-success/20">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-success" />
            <h4 className="font-medium text-success">Reward Pool: ${request.reward}</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Split equally among all chain participants when the connection succeeds
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {user ? (
            <Button onClick={handleJoinChain} variant="hero" size="lg" className="w-full">
              Join Chain & Earn Rewards
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          ) : (
            <Button onClick={handleSignUp} variant="hero" size="lg" className="w-full">
              Sign Up to Join Chain
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          )}

          {user && (
            <Button
              onClick={() => setShowTargetClaimModal(true)}
              variant="outline"
              size="lg"
              className="w-full"
            >
              I Am the Target - Book a Call
            </Button>
          )}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>This request expires on {new Date(request.expiresAt).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Target Claim Modal */}
      <TargetClaimModal
        isOpen={showTargetClaimModal}
        onClose={() => setShowTargetClaimModal(false)}
        request={request}
        chain={chain}
        onClaim={handleTargetClaim}
      />
    </Card>
  );
}

