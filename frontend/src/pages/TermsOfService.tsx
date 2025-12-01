import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-8 pl-0 hover:text-[#CBAA5A]"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <h1 className="font-riccione text-4xl mb-4 text-[#CBAA5A]">Terms of Service</h1>
        <p className="text-[#888] mb-8 font-gilroy">Effective Date: December 1, 2025</p>
        
        <div className="space-y-8 font-gilroy text-[#ccc] leading-relaxed">
          {/* About Us */}
          <section className="bg-[#111] rounded-xl p-6 border border-[#222]">
            <h2 className="text-lg font-bold text-white mb-3">About Us</h2>
            <p>6Degrees ("Service", "Platform", "we", "us", "our") is operated by:</p>
            <div className="mt-3 text-[#888]">
              <p className="font-bold text-white">Grapherly</p>
              <p>Greater Noida, India</p>
              <p>Email: august@grapherly.com</p>
              <p>Website: https://6degree.app</p>
            </div>
          </section>

          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">1. Acceptance of Terms</h2>
            <p className="mb-3">By accessing or using 6Degrees, you agree to be bound by these Terms of Service ("Terms") and our Privacy Policy. If you do not agree to these Terms, do not use our Service.</p>
            <p>These Terms constitute a legally binding agreement between you and Grapherly. You must be at least 18 years old to use this Service.</p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">2. Description of Service</h2>
            <p className="mb-3">6Degrees is a professional networking platform that enables users to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Create professional profiles</li>
              <li>Request and facilitate introductions to other professionals</li>
              <li>Offer introduction services to their network</li>
              <li>Build and manage professional connections</li>
              <li>Use a credit-based system for transactions</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">3. Account Registration</h2>
            
            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Account Creation</h3>
            <p className="mb-2">To use certain features, you must create an account. You agree to:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and update your information</li>
              <li>Keep your password secure and confidential</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Account Responsibility</h3>
            <p>You are responsible for all activities that occur under your account. We are not liable for any loss or damage arising from unauthorized use of your account.</p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">4. User Content</h2>
            
            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Ownership</h3>
            <p className="mb-4">You retain ownership of content you post on 6Degrees ("User Content"), including profile information, messages, and other materials.</p>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">License Grant</h3>
            <p className="mb-4">By posting User Content, you grant 6Degrees a non-exclusive, worldwide, royalty-free, transferable license to use, store, display, reproduce, and distribute your User Content in connection with operating and improving the Service.</p>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Content Responsibility</h3>
            <p className="mb-2">You are solely responsible for your User Content. You represent that:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You own or have the right to share the content</li>
              <li>Your content does not violate any third-party rights</li>
              <li>Your content is accurate and not misleading</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">5. Prohibited Conduct</h2>
            <p className="mb-4">You agree NOT to:</p>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Harmful Behavior</h3>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Harass, abuse, threaten, or intimidate other users</li>
              <li>Impersonate any person or entity</li>
              <li>Stalk or invade the privacy of others</li>
              <li>Post content that is defamatory, obscene, or offensive</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Platform Abuse</h3>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Use the Service for spam or unauthorized advertising</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Use automated systems (bots, scrapers) without permission</li>
              <li>Circumvent any security features</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Fraudulent Activity</h3>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Provide false or misleading information</li>
              <li>Engage in fraudulent transactions</li>
              <li>Manipulate the credit system</li>
              <li>Create fake profiles or connections</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Illegal Activity</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Violate any applicable laws or regulations</li>
              <li>Facilitate illegal transactions</li>
              <li>Infringe intellectual property rights</li>
              <li>Share illegal content</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">6. Credits and Transactions</h2>
            
            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Credit System</h3>
            <p className="mb-2">6Degrees uses a credit-based system for certain transactions. Credits:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Are purchased or earned through platform activities</li>
              <li>Are non-refundable unless required by law</li>
              <li>Have no cash value outside the platform</li>
              <li>May expire as specified in the platform</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Introduction Fees</h3>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Fees for introductions are set by users offering connections</li>
              <li>We facilitate transactions but are not a party to them</li>
              <li>Disputes between users should be resolved directly</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Refund Policy</h3>
            <p className="mb-2">Refunds may be issued at our discretion in cases of:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Technical errors preventing service delivery</li>
              <li>Fraudulent transactions</li>
              <li>Circumstances required by applicable law</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">7. Intellectual Property</h2>
            
            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Our Property</h3>
            <p className="mb-2">The Service, including its design, features, and content (excluding User Content), is owned by Grapherly and protected by intellectual property laws. You may not:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Copy, modify, or distribute our content</li>
              <li>Use our trademarks without permission</li>
              <li>Reverse engineer our software</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Feedback</h3>
            <p>If you provide suggestions or feedback about the Service, we may use it without obligation to you.</p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">8. Third-Party Services</h2>
            
            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Integrations</h3>
            <p className="mb-4">Our Service integrates with third-party services (Google, LinkedIn, etc.). Your use of these services is governed by their respective terms and policies. We are not responsible for third-party services.</p>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Links</h3>
            <p>The Service may contain links to third-party websites. We do not endorse or control these sites and are not responsible for their content or practices.</p>
          </section>

          {/* Section 9 */}
          <section className="bg-[#0a0a0a] rounded-xl p-6 border border-[#333]">
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">9. Disclaimer of Warranties</h2>
            <p className="mb-3 text-[#888]">THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4 text-[#888]">
              <li>MERCHANTABILITY</li>
              <li>FITNESS FOR A PARTICULAR PURPOSE</li>
              <li>NON-INFRINGEMENT</li>
              <li>ACCURACY OR RELIABILITY OF CONTENT</li>
            </ul>
            <p className="text-[#888]">We do not warrant that the Service will be uninterrupted or error-free, that defects will be corrected, that the Service is free of viruses or harmful components, or that results from using the Service will meet your expectations.</p>
          </section>

          {/* Section 10 */}
          <section className="bg-[#0a0a0a] rounded-xl p-6 border border-[#333]">
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">10. Limitation of Liability</h2>
            <p className="mb-3 text-[#888]">TO THE MAXIMUM EXTENT PERMITTED BY LAW:</p>
            
            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Exclusion of Damages</h3>
            <p className="mb-2 text-[#888]">GRAPHERLY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4 text-[#888]">
              <li>Loss of profits or revenue</li>
              <li>Loss of data</li>
              <li>Loss of business opportunities</li>
              <li>Reputational harm</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Liability Cap</h3>
            <p className="text-[#888]">OUR TOTAL LIABILITY SHALL NOT EXCEED THE GREATER OF: The amount you paid us in the 12 months preceding the claim, OR ₹5,000 (Five Thousand Rupees).</p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">11. Indemnification</h2>
            <p className="mb-2">You agree to indemnify and hold harmless Grapherly, its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including legal fees) arising from:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your use of the Service</li>
              <li>Your User Content</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
            </ul>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">12. Termination</h2>
            
            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">By You</h3>
            <p className="mb-4">You may terminate your account at any time by contacting us or using account deletion features.</p>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">By Us</h3>
            <p className="mb-2">We reserve the right to suspend or terminate your account at our sole discretion, without notice, for conduct that we believe:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Violates these Terms</li>
              <li>Is harmful to other users or the Service</li>
              <li>Creates liability for us</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Effect of Termination</h3>
            <p className="mb-2">Upon termination:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your right to use the Service ceases immediately</li>
              <li>We may delete your account and User Content</li>
              <li>Provisions that should survive termination will remain in effect</li>
            </ul>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">13. Dispute Resolution</h2>
            
            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Informal Resolution</h3>
            <p className="mb-4">Before filing any legal claim, you agree to try to resolve the dispute informally by contacting us at august@grapherly.com. We will attempt to resolve the dispute within 30 days.</p>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Governing Law</h3>
            <p className="mb-4">These Terms shall be governed by and construed in accordance with the laws of India.</p>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Jurisdiction</h3>
            <p>Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the courts in Greater Noida, Uttar Pradesh, India.</p>
          </section>

          {/* Section 14 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">14. General Provisions</h2>
            
            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Entire Agreement</h3>
            <p className="mb-4">These Terms, together with the Privacy Policy, constitute the entire agreement between you and Grapherly regarding the Service.</p>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Severability</h3>
            <p className="mb-4">If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in effect.</p>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Waiver</h3>
            <p className="mb-4">Our failure to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision.</p>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Assignment</h3>
            <p className="mb-4">You may not assign your rights under these Terms without our consent. We may assign our rights without restriction.</p>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Notices</h3>
            <p>We may send notices to you via email or through the Service. You may send notices to us at august@grapherly.com.</p>
          </section>

          {/* Section 15 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">15. Changes to These Terms</h2>
            <p className="mb-3">We may modify these Terms at any time. We will notify you of material changes by:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Posting the updated Terms on this page</li>
              <li>Updating the "Effective Date"</li>
              <li>Sending you an email notification (for significant changes)</li>
            </ul>
            <p>Your continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
          </section>

          {/* Section 16 - Contact */}
          <section className="bg-[#111] rounded-xl p-6 border border-[#222]">
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">16. Contact Us</h2>
            <p className="mb-3">If you have any questions about these Terms, please contact us:</p>
            <div className="text-[#888]">
              <p className="font-bold text-white">Grapherly</p>
              <p>Email: august@grapherly.com</p>
            </div>
          </section>
          
          <div className="pt-8 border-t border-[#333] text-sm text-[#666]">
            Last updated: December 1, 2025
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
