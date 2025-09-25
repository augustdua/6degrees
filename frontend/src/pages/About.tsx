import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Network, DollarSign, Target, Zap } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo/Brand */}
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">6°</span>
                </div>
                <span className="font-semibold text-lg">6Degree</span>
              </Link>
            </div>

            {/* Back Button */}
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">About 6Degree</h1>
            <p className="text-xl text-muted-foreground mb-6">
              Network Your Way to Any Connection
            </p>
            <p className="text-sm text-muted-foreground">
              A product of <strong>Grapherly OÜ</strong>
            </p>
            <Badge variant="secondary" className="text-sm">
              Currently in Beta Testing
            </Badge>
          </div>

          {/* Mission Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed">
                At 6Degree, we believe that everyone is connected through a network of relationships. 
                Our platform transforms your existing network into a powerful tool for achieving your goals, 
                whether that's finding a job, making a sale, or connecting with someone who can help you succeed.
              </p>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">1. Create Requests</h3>
                  <p className="text-sm text-muted-foreground">
                    Define what you're looking for and set a reward for successful connections.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Network className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">2. Build Chains</h3>
                  <p className="text-sm text-muted-foreground">
                    Your network shares your request, creating chains of connections to reach your target.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">3. Reward Success</h3>
                  <p className="text-sm text-muted-foreground">
                    Everyone who helps make the connection gets rewarded for their contribution.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Key Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">For Request Creators</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Set specific targets and rewards</li>
                    <li>• Track chain progress in real-time</li>
                    <li>• Manage multiple requests simultaneously</li>
                    <li>• Built-in wallet for reward distribution</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">For Network Participants</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Earn rewards for successful connections</li>
                    <li>• Build your professional reputation</li>
                    <li>• Discover new opportunities</li>
                    <li>• Connect with like-minded professionals</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Info */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Grapherly OÜ - Estonian Private Limited Company
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Business Details</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Company:</strong> Grapherly OÜ</p>
                    <p><strong>Registration:</strong> 16.09.2025</p>
                    <p><strong>Capital:</strong> 1.00 €</p>
                    <p><strong>Address:</strong> Harju maakond, Tallinn, Lasnamäe linnaosa, Sepapaja tn 6, 15551</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Contact Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Email:</strong> august@grapherly.com</p>
                    <p><strong>Phone:</strong> +372 53687119</p>
                    <p><strong>Management:</strong> August Dua</p>
                    <p><strong>Activity:</strong> Computer programming activities</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Beta Notice */}
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
            <CardHeader>
              <CardTitle className="text-orange-800 dark:text-orange-200">
                Beta Testing Notice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-orange-700 dark:text-orange-300">
                <strong>Important:</strong> 6Degree is currently in beta testing. 
                All rewards and transactions are using virtual currency for testing purposes. 
                Real money transactions are not enabled at this time.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default About;
