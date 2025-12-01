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

        <h1 className="font-riccione text-4xl mb-8 text-[#CBAA5A]">Terms of Service</h1>
        
        <div className="space-y-6 font-gilroy text-[#ccc] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3 uppercase tracking-wider">1. Acceptance of Terms</h2>
            <p>By accessing or using 6Degrees, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 uppercase tracking-wider">2. Use of Service</h2>
            <p>You agree to use the service only for lawful purposes and in accordance with these Terms. You are responsible for maintaining the confidentiality of your account.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 uppercase tracking-wider">3. User Content</h2>
            <p>You retain ownership of content you post, but grant 6Degrees a license to use, store, and display that content in connection with the service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 uppercase tracking-wider">4. Prohibited Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Harass, abuse, or harm others.</li>
              <li>Impersonate any person or entity.</li>
              <li>Interfere with the operation of the service.</li>
              <li>Use the service for spam or unauthorized advertising.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 uppercase tracking-wider">5. Termination</h2>
            <p>We reserve the right to terminate or suspend your account at our sole discretion, without notice, for conduct that we believe violates these Terms.</p>
          </section>
          
          <div className="pt-8 border-t border-[#333] text-sm text-[#666]">
            Last updated: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;

