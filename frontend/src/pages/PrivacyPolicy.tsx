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

        <h1 className="font-riccione text-4xl mb-8 text-[#CBAA5A]">Privacy Policy</h1>
        
        <div className="space-y-6 font-gilroy text-[#ccc] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3 uppercase tracking-wider">1. Information We Collect</h2>
            <p>We collect information you provide directly to us, such as when you create an account, update your profile, or use our services. This includes your name, email address, profile picture, and professional details.</p>
            <p className="mt-2">If you choose to import contacts, we access your Google Contacts solely for the purpose of helping you invite friends to the platform. We do not store your contacts' details permanently unless you send an invite.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 uppercase tracking-wider">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Provide, maintain, and improve our services.</li>
              <li>Facilitate professional connections and introductions.</li>
              <li>Send you technical notices, updates, and support messages.</li>
              <li>Respond to your comments and questions.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 uppercase tracking-wider">3. Data Security</h2>
            <p>We implement reasonable security measures to protect your personal information. Your data is stored securely using industry-standard encryption.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 uppercase tracking-wider">4. Google User Data</h2>
            <p>Our use of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 uppercase tracking-wider">5. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at augustduamath@gmail.com.</p>
          </section>
          
          <div className="pt-8 border-t border-[#333] text-sm text-[#666]">
            Last updated: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

