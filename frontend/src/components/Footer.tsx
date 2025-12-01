import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const navigate = useNavigate();

  return (
    <footer className={`border-t border-[#222] bg-black ${className}`}>
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-[#CBAA5A] text-black p-1.5 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                  <text x="12" y="16" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="bold" textAnchor="middle" fill="currentColor">6°</text>
                </svg>
              </div>
              <span className="font-riccione text-xl text-white">6Degrees</span>
            </div>
            <p className="text-sm text-[#888] font-gilroy leading-relaxed">
              Network your way to any connection. The professional networking platform that rewards you for making valuable introductions.
            </p>
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <h3 className="font-gilroy text-xs tracking-[0.15em] uppercase text-[#666]">Legal</h3>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => navigate('/privacy')} 
                className="text-left text-sm text-[#888] hover:text-[#CBAA5A] transition-colors font-gilroy"
              >
                Privacy Policy
              </button>
              <button 
                onClick={() => navigate('/terms')} 
                className="text-left text-sm text-[#888] hover:text-[#CBAA5A] transition-colors font-gilroy"
              >
                Terms of Service
              </button>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="font-gilroy text-xs tracking-[0.15em] uppercase text-[#666]">Contact</h3>
            <div className="space-y-3">
              <a 
                href="mailto:august@grapherly.com" 
                className="flex items-center gap-2 text-sm text-[#888] hover:text-[#CBAA5A] transition-colors font-gilroy"
              >
                <Mail className="w-4 h-4" />
                august@grapherly.com
              </a>
              <a 
                href="tel:+37253687119" 
                className="flex items-center gap-2 text-sm text-[#888] hover:text-[#CBAA5A] transition-colors font-gilroy"
              >
                <Phone className="w-4 h-4" />
                +372 5368 7119
              </a>
              <div className="flex items-start gap-2 text-sm text-[#888] font-gilroy">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Sepapaja tn 6, Tallinn, 15551, Estonia</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-[#222]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs text-[#555] font-gilroy">
            <div>
              © {new Date().getFullYear()} Grapherly OÜ (17328242). All rights reserved.
            </div>
            <div className="text-[10px] leading-relaxed">
              Registered in Estonia • Harju maakond, Tallinn, Lasnamäe linnaosa
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

