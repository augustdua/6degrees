import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  Target,
  Share2,
  DollarSign,
  Network,
  ArrowRight,
  CheckCircle,
  Coins,
  Wallet,
  TrendingUp
} from 'lucide-react';

interface HowItWorksModalProps {
  onClose: () => void;
}

const HowItWorksModal = ({ onClose }: HowItWorksModalProps) => {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">How Zaurq Works</DialogTitle>
          <DialogDescription className="text-center">
            In-game credit economy for professional networking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 0 - Buy Credits */}
          <Card className="border-l-4 border-l-white/30 bg-white/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black font-bold">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Coins className="h-5 w-5 text-yellow-600" />
                    Buy Credits
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    Purchase credits with real money. Credits are the in-game currency used to create connection requests.
                  </p>
                  <div className="bg-white p-3 rounded-lg border">
                    <p className="text-sm"><strong>Packages:</strong> 100 credits (₹99), 500 credits (₹449 + bonus), 1000 credits (₹849 + bonus)</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 1 */}
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Create a Connection Request
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    Spend credits to create a request. Set credit rewards for helpers and cash for the target person.
                  </p>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm"><strong>Example:</strong> "Connect me with the CTO of Microsoft" - 50 credits + ₹8,300 cash for target</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 2 */}
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white/70 font-bold">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Share2 className="h-5 w-5" />
                    Share Your Link
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    Share your connection request link with your network. Friends, colleagues, and connections can help!
                  </p>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm"><strong>Pro Tip:</strong> Post on LinkedIn, share in Slack, or send to your most connected friends</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 3 */}
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Referral Network
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    People in your network forward the request, creating a referral path. Each person who joins earns credits immediately!
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm bg-muted/50 p-3 rounded-lg">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        You
                      </span>
                      <ArrowRight className="h-4 w-4" />
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Friend (+2 credits)
                      </span>
                      <ArrowRight className="h-4 w-4" />
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Colleague (+2 credits)
                      </span>
                      <ArrowRight className="h-4 w-4" />
                      <span className="flex items-center gap-1">
                        <Target className="h-4 w-4 text-purple-600" />
                        Target
                      </span>
                    </div>
                    <div className="bg-white/10 p-2 rounded-lg border border-white/20">
                      <p className="text-xs text-white/70"><strong>Instant Rewards:</strong> Earn 2-3 credits when someone joins through your link!</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 4 */}
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#3B2A72] rounded-full flex items-center justify-center text-white font-bold">
                  5
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Final Reward Distribution
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    When the target is reached and request completes, rewards are distributed based on role:
                  </p>
                  <div className="space-y-2">
                    <div className="bg-white/10 p-3 rounded-lg border border-white/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Coins className="h-4 w-4 text-yellow-600" />
                        <p className="text-sm font-semibold text-yellow-900">Referrers → Credits</p>
                      </div>
                      <p className="text-xs text-yellow-800">All referrers split the credit pool equally</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <p className="text-sm font-semibold text-green-900">Target Person → Cash</p>
                      </div>
                      <p className="text-xs text-green-800">The target receives real money (INR) directly to their wallet</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Features */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-center">Key Features</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">In-game credit economy system</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Instant rewards when members join</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">LinkedIn profile integration</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Real-time network visualization</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Dual reward system (credits + cash)</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Secure automatic distribution</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center pt-4">
          <Button onClick={onClose} className="px-8">
            Got It!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HowItWorksModal;