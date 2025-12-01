import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const PrivacyPolicy = () => {
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

        <h1 className="font-riccione text-4xl mb-4 text-[#CBAA5A]">Privacy Policy</h1>
        <p className="text-[#888] mb-8 font-gilroy">Effective Date: December 1, 2025</p>
        
        <div className="space-y-8 font-gilroy text-[#ccc] leading-relaxed">
          {/* About Us */}
          <section className="bg-[#111] rounded-xl p-6 border border-[#222]">
            <h2 className="text-lg font-bold text-white mb-3">About Us</h2>
            <p>6Degrees ("we", "us", "our") is operated by:</p>
            <div className="mt-3 text-[#888]">
              <p className="font-bold text-white">Grapherly</p>
              <p>Greater Noida, India</p>
              <p>Email: august@grapherly.com</p>
              <p>Website: https://6degree.app</p>
            </div>
          </section>

          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">1. Information We Collect</h2>
            
            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Information You Provide</h3>
            <p className="mb-3">We collect information you provide directly to us, including:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li><strong>Account Information:</strong> Name, email address, profile picture, and password</li>
              <li><strong>Profile Information:</strong> Professional details, bio, work history, education, and LinkedIn URL</li>
              <li><strong>Communication Data:</strong> Messages you send through our platform</li>
              <li><strong>Transaction Information:</strong> Details about introductions, bids, and credits</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Information from Third Parties</h3>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li><strong>Google Account:</strong> If you sign in with Google, we receive your name, email, and profile picture</li>
              <li><strong>Google Contacts:</strong> If you choose to import contacts, we access your Google Contacts solely to help you invite connections to the platform</li>
              <li><strong>LinkedIn:</strong> If you connect LinkedIn, we may access your professional profile information</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Automatically Collected Information</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Device information (browser type, operating system)</li>
              <li>Log data (IP address, access times, pages viewed)</li>
              <li>Usage information (features used, interactions)</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">2. How We Use Your Information</h2>
            <p className="mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide, maintain, and improve our services</li>
              <li>Create and manage your account</li>
              <li>Facilitate professional connections and introductions</li>
              <li>Process transactions and manage credits</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Analyze usage patterns to improve user experience</li>
              <li>Detect and prevent fraud or abuse</li>
            </ul>
          </section>

          {/* Section 3 - Google User Data */}
          <section className="bg-[#0a0a0a] rounded-xl p-6 border border-[#333]">
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">3. Google User Data</h2>
            
            <p className="mb-4">When you connect your Google account, we may access:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li><strong>Basic Profile Information:</strong> Name, email address, profile picture</li>
              <li><strong>Google Contacts:</strong> Only when you explicitly choose to import contacts</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">How We Use Google Data</h3>
            <p className="mb-2">We use Google Contacts data solely to help you find and invite connections to 6Degrees. Specifically:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>To display your contacts within the app for invitation purposes</li>
              <li>To send invitations on your behalf when you choose to invite someone</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">What We Do NOT Do</h3>
            <p className="mb-2">We do not:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Sell your Google data to third parties</li>
              <li>Use Google data for advertising purposes</li>
              <li>Share Google data with third parties except as necessary to provide our services</li>
              <li>Store contact data permanently beyond the immediate invitation process</li>
              <li>Use Google data for any purpose not explicitly disclosed in this policy</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Limited Use Disclosure</h3>
            <p>Our use of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-[#CBAA5A] hover:underline" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">4. Data Sharing and Disclosure</h2>
            <p className="mb-3">We may share your information in the following circumstances:</p>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">With Other Users</h3>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Your public profile information is visible to other users</li>
              <li>Information shared during introductions is visible to relevant parties</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">With Service Providers</h3>
            <p className="mb-2">We share data with third-party services that help us operate our platform:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li><strong>Supabase:</strong> Authentication and database services</li>
              <li><strong>Railway:</strong> Backend hosting</li>
              <li><strong>Vercel:</strong> Frontend hosting</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">For Legal Reasons</h3>
            <p className="mb-4">We may disclose information if required by law, legal process, or government request, or to protect rights, property, or safety.</p>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Business Transfers</h3>
            <p>In connection with a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.</p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">5. Data Security</h2>
            <p className="mb-3">We implement reasonable security measures to protect your personal information:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Data encryption in transit (HTTPS/TLS)</li>
              <li>Secure data storage with industry-standard encryption</li>
              <li>Regular security assessments</li>
              <li>Access controls and authentication</li>
            </ul>
            <p>However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.</p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">6. Data Retention and Deletion</h2>
            
            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Retention</h3>
            <p className="mb-4">We retain your personal information for as long as your account is active or as needed to provide services. We may retain certain information as required by law or for legitimate business purposes.</p>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Deletion</h3>
            <p className="mb-2">You can request deletion of your account and associated data at any time by:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Contacting us at august@grapherly.com</li>
              <li>Using account deletion features within the app (when available)</li>
            </ul>
            <p>Upon account deletion, we will remove your personal information within 30 days, except where retention is required by law or for fraud prevention.</p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">7. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your data</li>
              <li><strong>Portability:</strong> Request export of your data in a portable format</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent for optional data processing</li>
              <li><strong>Grievance Redressal:</strong> File a complaint regarding data handling</li>
            </ul>
            <p className="mb-4">To exercise these rights, contact us at august@grapherly.com.</p>

            <h3 className="text-lg font-semibold text-[#CBAA5A] mb-2">Under Information Technology Act, 2000</h3>
            <p>In accordance with the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, we implement reasonable security practices to protect your sensitive personal data.</p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">8. Children's Privacy</h2>
            <p>6Degrees is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If we learn we have collected information from a child under 18, we will delete it promptly.</p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">9. Data Storage</h2>
            <p>Your data is stored on secure servers. While our service providers may process data in locations outside India, we ensure appropriate safeguards are in place for such transfers in compliance with applicable Indian laws.</p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">10. Third-Party Links</h2>
            <p>Our service may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to read their privacy policies.</p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">11. Changes to This Policy</h2>
            <p className="mb-3">We may update this Privacy Policy from time to time. We will notify you of any material changes by:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Posting the new policy on this page</li>
              <li>Updating the "Effective Date" at the top</li>
              <li>Sending you an email notification (for significant changes)</li>
            </ul>
            <p>Your continued use of the service after changes constitutes acceptance of the updated policy.</p>
          </section>

          {/* Section 12 - Grievance Officer */}
          <section className="bg-[#111] rounded-xl p-6 border border-[#222]">
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">12. Grievance Officer</h2>
            <p className="mb-3">In accordance with the Information Technology Act, 2000 and rules made thereunder, the contact details of the Grievance Officer are:</p>
            <div className="text-[#888]">
              <p><strong className="text-white">Name:</strong> August Dua</p>
              <p><strong className="text-white">Email:</strong> august@grapherly.com</p>
            </div>
            <p className="mt-3">The Grievance Officer shall address your concerns within 30 days of receiving a complaint.</p>
          </section>

          {/* Section 13 - Contact */}
          <section className="bg-[#111] rounded-xl p-6 border border-[#222]">
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">13. Contact Us</h2>
            <p className="mb-3">If you have any questions about this Privacy Policy or our data practices, please contact us:</p>
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

export default PrivacyPolicy;
