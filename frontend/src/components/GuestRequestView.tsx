import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, ArrowRight, Shield, DollarSign, Copy, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useRequests } from "@/hooks/useRequests";
import { ConnectionRequest, Chain } from "@/hooks/useRequests";

interface GuestRequestViewProps {
  request: ConnectionRequest;
  chain: Chain | null;
  linkId: string;
}

export default function GuestRequestView({ request, chain, linkId }: GuestRequestViewProps) {
  const [showSignupPrompt, setShowSignupPrompt] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [newShareableLink, setNewShareableLink] = useState<string | null>(null);
  const { user } = useAuth();
  const { joinChain } = useRequests();
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
      navigator.clipboard.writeText(newShareableLink);
      toast({
        title: "Link Copied!",
        description: "Share this link to continue building the connection chain.",
      });
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
      <Card className="p-8 max-w-2xl mx-auto shadow-success">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-success rounded-full flex items-center justify-center mx-auto mb-6">
            <Share2 className="w-8 h-8 text-success-foreground" />
          </div>

          <h2 className="text-2xl font-bold mb-4">You're Now Part of the Chain!</h2>
          <p className="text-muted-foreground mb-8">
            You've successfully joined the connection chain for: <span className="font-semibold text-foreground">{request.target}</span>
          </p>

          <div className="bg-muted p-4 rounded-lg mb-6 break-all text-sm font-mono">
            {newShareableLink}
          </div>

          <div className="flex gap-4 justify-center mb-6">
            <Button onClick={copyNewLink} variant="network">
              <Copy className="w-4 h-4 mr-2" />
              Copy Your Link
            </Button>
            <Button variant="outline" onClick={() => window.open(newShareableLink, '_blank')}>
              <Share2 className="w-4 h-4 mr-2" />
              Share Link
            </Button>
          </div>

          <div className="bg-gradient-success/10 p-4 rounded-lg border border-success/20">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-success" />
              <h4 className="font-medium text-success">Potential Reward: ${request.reward / ((chain?.chainLength || 1) + 1)}</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Your share if the connection succeeds
            </p>
          </div>

          <div className="text-center text-sm text-muted-foreground mt-6">
            <p>✓ Share your link to find more connections</p>
            <p>✓ Earn rewards when the chain completes</p>
            <p>✓ Track progress in your dashboard</p>
          </div>
        </div>
      </Card>
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
          
          <Button variant="outline" size="lg" className="w-full">
            I Am the Target - Claim Reward
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>This request expires on {new Date(request.expiresAt).toLocaleDateString()}</p>
        </div>
      </div>
    </Card>
  );
}

