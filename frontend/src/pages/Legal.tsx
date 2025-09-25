import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Shield, ChevronDown, ChevronUp } from 'lucide-react';

const Legal = () => {
  const [activeSection, setActiveSection] = useState<'terms' | 'privacy'>('terms');

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
                <span className="font-semibold text-lg">6Degrees</span>
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
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Legal Information</h1>
            <p className="text-xl text-muted-foreground">
              Terms of Service and Privacy Policy
            </p>
          </div>

          {/* Legal Navigation */}
          <div className="flex justify-center mb-8">
            <div className="flex bg-muted rounded-lg p-1">
              <Button
                variant={activeSection === 'terms' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveSection('terms')}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Terms of Service
              </Button>
              <Button
                variant={activeSection === 'privacy' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveSection('privacy')}
                className="flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Privacy Policy
              </Button>
            </div>
          </div>

          {/* Terms of Service */}
          {activeSection === 'terms' && (
            <Card>
              <CardHeader>
                <CardTitle>Terms of Service</CardTitle>
                <CardDescription>
                  Last updated: September 25, 2025
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">1. Acceptance of Terms</h3>
                  <p className="text-sm text-muted-foreground">
                    By accessing and using 6Degrees, you accept and agree to be bound by the terms and provision of this agreement.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">2. Service Description</h3>
                  <p className="text-sm text-muted-foreground">
                    6Degrees is a networking platform that connects users through their professional networks to achieve specific goals. 
                    Users can create requests, build connection chains, and reward successful connections.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">3. MVP Stage Notice</h3>
                  <p className="text-sm text-muted-foreground">
                    <strong>Important:</strong> 6Degrees is currently in MVP (Minimum Viable Product) stage. 
                    All rewards and transactions use virtual currency for testing purposes. 
                    Real money transactions are not enabled at this time.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">4. User Responsibilities</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Provide accurate and truthful information</li>
                    <li>• Respect other users and maintain professional conduct</li>
                    <li>• Not use the platform for illegal or harmful activities</li>
                    <li>• Protect your account credentials</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">5. Prohibited Activities</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Creating fake accounts or impersonating others</li>
                    <li>• Spamming or sending unsolicited messages</li>
                    <li>• Attempting to hack or compromise the platform</li>
                    <li>• Violating any applicable laws or regulations</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">6. Company Information</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Company:</strong> Grapherly OÜ</p>
                    <p><strong>Registration:</strong> 16.09.2025</p>
                    <p><strong>Address:</strong> Harju maakond, Tallinn, Lasnamäe linnaosa, Sepapaja tn 6, 15551</p>
                    <p><strong>Email:</strong> august@grapherly.com</p>
                    <p><strong>Phone:</strong> +372 53687119</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">7. Limitation of Liability</h3>
                  <p className="text-sm text-muted-foreground">
                    Grapherly OÜ shall not be liable for any indirect, incidental, special, consequential, or punitive damages, 
                    including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">8. Changes to Terms</h3>
                  <p className="text-sm text-muted-foreground">
                    We reserve the right to modify these terms at any time. Users will be notified of significant changes 
                    through the platform or via email.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Privacy Policy */}
          {activeSection === 'privacy' && (
            <Card>
              <CardHeader>
                <CardTitle>Privacy Policy</CardTitle>
                <CardDescription>
                  Last updated: September 25, 2025
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">1. Information We Collect</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Account information (name, email, profile details)</li>
                    <li>• Professional information (company, role, LinkedIn profile)</li>
                    <li>• Communication data (messages, requests, connections)</li>
                    <li>• Usage data (platform interactions, feature usage)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">2. How We Use Your Information</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Provide and improve our networking services</li>
                    <li>• Facilitate connections between users</li>
                    <li>• Process rewards and transactions</li>
                    <li>• Communicate with you about the platform</li>
                    <li>• Ensure platform security and prevent fraud</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">3. Information Sharing</h3>
                  <p className="text-sm text-muted-foreground">
                    We do not sell your personal information. We may share information only in the following circumstances:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 mt-2">
                    <li>• With other users as part of the networking functionality</li>
                    <li>• With service providers who assist in platform operations</li>
                    <li>• When required by law or to protect our rights</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">4. Data Security</h3>
                  <p className="text-sm text-muted-foreground">
                    We implement appropriate security measures to protect your personal information against 
                    unauthorized access, alteration, disclosure, or destruction.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">5. Your Rights</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Access and update your personal information</li>
                    <li>• Delete your account and associated data</li>
                    <li>• Opt out of certain communications</li>
                    <li>• Request data portability</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">6. Cookies and Tracking</h3>
                  <p className="text-sm text-muted-foreground">
                    We use cookies and similar technologies to enhance your experience, analyze usage patterns, 
                    and improve our services. You can control cookie preferences through your browser settings.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">7. Data Retention</h3>
                  <p className="text-sm text-muted-foreground">
                    We retain your personal information for as long as necessary to provide our services and 
                    comply with legal obligations. You may request deletion of your data at any time.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">8. Contact Information</h3>
                  <p className="text-sm text-muted-foreground">
                    For privacy-related questions or concerns, please contact us at:
                  </p>
                  <div className="text-sm text-muted-foreground mt-2">
                    <p><strong>Email:</strong> august@grapherly.com</p>
                    <p><strong>Company:</strong> Grapherly OÜ</p>
                    <p><strong>Address:</strong> Harju maakond, Tallinn, Lasnamäe linnaosa, Sepapaja tn 6, 15551</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Legal;
