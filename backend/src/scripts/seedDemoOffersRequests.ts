import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

// Organizations with their details - India-focused
const organizations = [
  { name: 'Flipkart', domain: 'flipkart.com', logo_url: 'https://logo.clearbit.com/flipkart.com' },
  { name: 'Zomato', domain: 'zomato.com', logo_url: 'https://logo.clearbit.com/zomato.com' },
  { name: 'Microsoft India', domain: 'microsoft.com', logo_url: 'https://logo.clearbit.com/microsoft.com' },
  { name: 'Sequoia India', domain: 'sequoiacap.com', logo_url: 'https://logo.clearbit.com/sequoiacap.com' },
  { name: 'Accel India', domain: 'accel.com', logo_url: 'https://logo.clearbit.com/accel.com' },
  { name: 'Lightspeed India', domain: 'lsvp.com', logo_url: 'https://logo.clearbit.com/lsvp.com' },
  { name: 'Myntra', domain: 'myntra.com', logo_url: 'https://logo.clearbit.com/myntra.com' },
  { name: 'Nykaa', domain: 'nykaa.com', logo_url: 'https://logo.clearbit.com/nykaa.com' },
  { name: 'Amazon India', domain: 'amazon.in', logo_url: 'https://logo.clearbit.com/amazon.in' },
  { name: 'Razorpay', domain: 'razorpay.com', logo_url: 'https://logo.clearbit.com/razorpay.com' },
  { name: 'Swiggy', domain: 'swiggy.com', logo_url: 'https://logo.clearbit.com/swiggy.com' },
  { name: 'Freshworks', domain: 'freshworks.com', logo_url: 'https://logo.clearbit.com/freshworks.com' },
  { name: 'Zoho', domain: 'zoho.com', logo_url: 'https://logo.clearbit.com/zoho.com' },
  { name: 'Chargebee', domain: 'chargebee.com', logo_url: 'https://logo.clearbit.com/chargebee.com' },
  { name: 'Practo', domain: 'practo.com', logo_url: 'https://logo.clearbit.com/practo.com' },
  { name: 'Cult.fit', domain: 'cure.fit', logo_url: 'https://logo.clearbit.com/cure.fit' },
  { name: 'PharmEasy', domain: 'pharmeasy.in', logo_url: 'https://logo.clearbit.com/pharmeasy.in' },
  { name: 'WazirX', domain: 'wazirx.com', logo_url: 'https://logo.clearbit.com/wazirx.com' },
  { name: 'Polygon', domain: 'polygon.technology', logo_url: 'https://logo.clearbit.com/polygon.technology' },
  { name: 'Unacademy', domain: 'unacademy.com', logo_url: 'https://logo.clearbit.com/unacademy.com' },
  { name: 'BYJU\'S', domain: 'byjus.com', logo_url: 'https://logo.clearbit.com/byjus.com' },
  { name: 'Paytm', domain: 'paytm.com', logo_url: 'https://logo.clearbit.com/paytm.com' },
  { name: 'Ola', domain: 'olacabs.com', logo_url: 'https://logo.clearbit.com/olacabs.com' },
  { name: 'Google', domain: 'google.com', logo_url: 'https://logo.clearbit.com/google.com' },
  { name: 'Meta', domain: 'meta.com', logo_url: 'https://logo.clearbit.com/meta.com' },
  // Additional orgs for requests
  { name: 'Infosys', domain: 'infosys.com', logo_url: 'https://logo.clearbit.com/infosys.com' },
  { name: 'Wipro', domain: 'wipro.com', logo_url: 'https://logo.clearbit.com/wipro.com' },
  { name: 'TCS', domain: 'tcs.com', logo_url: 'https://logo.clearbit.com/tcs.com' },
  { name: 'HDFC Bank', domain: 'hdfcbank.com', logo_url: 'https://logo.clearbit.com/hdfcbank.com' },
  { name: 'ICICI Bank', domain: 'icicibank.com', logo_url: 'https://logo.clearbit.com/icicibank.com' },
  { name: 'Reliance', domain: 'ril.com', logo_url: 'https://logo.clearbit.com/ril.com' },
  { name: 'Tata Motors', domain: 'tatamotors.com', logo_url: 'https://logo.clearbit.com/tatamotors.com' },
  { name: 'Mahindra', domain: 'mahindra.com', logo_url: 'https://logo.clearbit.com/mahindra.com' },
  { name: 'Airtel', domain: 'airtel.in', logo_url: 'https://logo.clearbit.com/airtel.in' },
  { name: 'Jio', domain: 'jio.com', logo_url: 'https://logo.clearbit.com/jio.com' },
];

// Demo data templates - India-focused with org references
const demoOffers = [
  { title: 'Connect with AI Lead at Flipkart', description: 'Former colleague now heading AI/ML initiatives at Flipkart. Perfect for startups building AI solutions for e-commerce.', tags: ['AI', 'Artificial Intelligence', 'Machine Learning', 'E-Commerce'], organization: 'Flipkart', position: 'VP of AI/ML', price: 15000 },
  { title: 'Intro to Zomato Tech Lead', description: 'Senior engineer at Zomato working on recommendation systems. Great for food-tech and marketplace startups.', tags: ['AI', 'Machine Learning', 'Technology', 'Food & Beverage'], organization: 'Zomato', position: 'Tech Lead', price: 12000 },
  { title: 'Meet Microsoft India AI Researcher', description: 'Research scientist at Microsoft India. Can help with ML model architecture and deployment at scale.', tags: ['AI', 'Research', 'Technology', 'CTO'], organization: 'Microsoft India', position: 'AI Researcher', price: 18000 },
  
  { title: 'Pitch to Sequoia India Partner', description: 'Direct intro to investor at Sequoia India. They focus on early-stage B2B SaaS and consumer tech.', tags: ['Fundraising', 'Venture Capital', 'Investor', 'Seed', 'Startups'], organization: 'Sequoia India', position: 'Partner', price: 25000 },
  { title: 'Connect with Accel India Associate', description: 'Friend works at Accel India evaluating early-stage deals. Perfect for pre-seed to Series A startups.', tags: ['Fundraising', 'Venture Capital', 'Pre-Seed', 'Seed'], organization: 'Accel India', position: 'Investment Associate', price: 20000 },
  { title: 'Meet Angel Investor (Multiple Exits)', description: 'Serial entrepreneur turned angel investor. Invested in 30+ Indian startups with 3 exits.', tags: ['Fundraising', 'Angel Investor', 'Entrepreneur', 'Startups'], organization: 'Independent', position: 'Angel Investor', price: 15000 },
  { title: 'Intro to Lightspeed Venture Partner', description: 'Partner at Lightspeed India. Focus on consumer tech and SaaS. Looking for Series B+ companies.', tags: ['Fundraising', 'Venture Capital', 'Growth', 'Scaling'], organization: 'Lightspeed India', position: 'Venture Partner', price: 30000 },
  
  { title: 'Connect with Myntra Category Head', description: 'Category manager at Myntra handling fashion brands. Can help with online retail strategy.', tags: ['Fashion', 'Retail', 'E-Commerce', 'Branding'], organization: 'Myntra', position: 'Category Head', price: 12000 },
  { title: 'Intro to Nykaa Beauty Buyer', description: 'Product buyer at Nykaa. Can help get beauty/skincare products listed on the platform.', tags: ['Beauty', 'Skincare', 'Retail', 'E-Commerce'], organization: 'Nykaa', position: 'Product Buyer', price: 18000 },
  
  { title: 'Connect with Amazon India Seller Expert', description: 'Former Amazon employee, now consultant. Helped 100+ brands succeed on Amazon India.', tags: ['E-Commerce', 'Amazon', 'Marketplaces', 'Commerce'], organization: 'Amazon India', position: 'Marketplace Consultant', price: 8000 },
  { title: 'Intro to Razorpay Product Manager', description: 'PM at Razorpay handling payment integrations. Perfect for fintech and e-commerce startups.', tags: ['E-Commerce', 'SaaS', 'Technology', 'Product', 'Finance'], organization: 'Razorpay', position: 'Product Manager', price: 12000 },
  
  { title: 'Meet Ex-Swiggy Growth Lead', description: 'Former Swiggy growth team member. Now advising startups on customer acquisition strategies.', tags: ['User Acquisition', 'Customer Acquisition', 'Growth', 'Marketing'], organization: 'Swiggy', position: 'Growth Lead', price: 18000 },
  
  { title: 'Connect with Freshworks Enterprise Sales Lead', description: 'Senior AE at Freshworks. Expert in selling B2B SaaS to Indian and global enterprises.', tags: ['SaaS', 'B2B', 'Sales & Business Development', 'Enterprise'], organization: 'Freshworks', position: 'Enterprise Sales Lead', price: 12000 },
  { title: 'Meet Zoho Product Manager', description: 'PM at Zoho who has launched multiple successful products. Great for B2B SaaS product strategy.', tags: ['SaaS', 'Product Management', 'Product', 'B2B'], organization: 'Zoho', position: 'Product Manager', price: 15000 },
  { title: 'Intro to Chargebee Co-founder', description: 'Co-founder of successful Indian SaaS unicorn. Can advise on building and scaling SaaS business.', tags: ['SaaS', 'Founder', 'Entrepreneur', 'Scaling'], organization: 'Chargebee', position: 'Co-founder', price: 25000 },
  
  { title: 'Meet Swiggy Restaurant Partnership Manager', description: 'Manages restaurant partnerships at Swiggy. Can help with listing and growth on food delivery apps.', tags: ['Food & Beverage', 'Partnerships', 'Operations', 'Marketplaces'], organization: 'Swiggy', position: 'Partnership Manager', price: 10000 },
  
  { title: 'Connect with Practo Medical Advisor', description: 'Doctor and medical advisor at Practo. Perfect for health-tech startups needing clinical insights.', tags: ['HealthTech', 'Medical', 'Healthcare', 'Technology'], organization: 'Practo', position: 'Medical Advisor', price: 15000 },
  { title: 'Meet Cult.fit Product Designer', description: 'Designed fitness experiences at Cult.fit. Great for wellness and fitness app founders.', tags: ['Fitness', 'Wellness', 'Design', 'Product', 'Consumer Apps'], organization: 'Cult.fit', position: 'Product Designer', price: 12000 },
  { title: 'Intro to PharmEasy Operations Head', description: 'Manages supply chain and operations at PharmEasy. Can help with healthcare logistics.', tags: ['HealthTech', 'Operations', 'Supply Chain', 'Healthcare'], organization: 'PharmEasy', position: 'Operations Head', price: 18000 },
  
  { title: 'Meet WazirX Blockchain Engineer', description: 'Building crypto infrastructure at WazirX. Perfect for Web3 and blockchain startups in India.', tags: ['Crypto, NFTs, & Web3', 'Blockchain', 'CTO', 'Engineering'], organization: 'WazirX', position: 'Blockchain Engineer', price: 20000 },
  { title: 'Connect with Polygon Developer Advocate', description: 'Core team member at Polygon. Can help with Web3 development and ecosystem partnerships.', tags: ['Crypto, NFTs, & Web3', 'Blockchain', 'Solana', 'Developer'], organization: 'Polygon', position: 'Developer Advocate', price: 25000 },
  
  { title: 'Connect with Unacademy Content Head', description: 'Manages content strategy at Unacademy. Perfect for ed-tech founders building courses.', tags: ['Education', 'Content Marketing', 'Product', 'Startups'], organization: 'Unacademy', position: 'Content Head', price: 15000 },
  { title: 'Meet BYJU\'S Growth Manager', description: 'Former growth team lead at BYJU\'S. Expert in ed-tech user acquisition and retention.', tags: ['Education', 'Growth', 'User Acquisition', 'Marketing'], organization: 'BYJU\'S', position: 'Growth Manager', price: 18000 },
  
  // Marketing & Growth
  { title: 'Connect with Swiggy Performance Marketing Lead', description: 'Manages performance marketing at Swiggy. Expert in ROI-driven campaigns and customer acquisition.', tags: ['Performance Marketing', 'Marketing', 'Customer Acquisition', 'Growth'], organization: 'Swiggy', position: 'Performance Marketing Lead', price: 14000 },
  { title: 'Meet Paytm Social Media Head', description: 'Heads social media strategy at Paytm. 5+ years experience in viral campaigns for fintech.', tags: ['Social Media', 'Social Media Marketing', 'Marketing', 'Viral Marketing'], organization: 'Paytm', position: 'Social Media Head', price: 12000 },
  { title: 'Intro to Ola Brand Manager', description: 'Brand strategist at Ola. Has worked on multiple successful brand campaigns in Indian market.', tags: ['Branding', 'Marketing', 'Brand Strategy', 'Consumer'], organization: 'Ola', position: 'Brand Manager', price: 15000 },
  
  // Product & Design
  { title: 'Connect with Google Product Lead', description: 'Product lead at Google India working on consumer products. Can help with product-market fit.', tags: ['Product', 'Product Management', 'Product Market Fit', 'Google'], organization: 'Google', position: 'Product Lead', price: 20000 },
  { title: 'Meet Meta Product Designer', description: 'Senior designer at Meta India. Expert in designing consumer social experiences.', tags: ['Design', 'User Experience (UX)', 'Product', 'Social Apps'], organization: 'Meta', position: 'Product Designer', price: 18000 },
  { title: 'Intro to Flipkart UX Researcher', description: 'UX researcher at Flipkart. Has conducted 100+ user studies for e-commerce products.', tags: ['User Experience (UX)', 'Design', 'Research', 'E-Commerce'], organization: 'Flipkart', position: 'UX Researcher', price: 12000 },
  
  // Sales & Business Development
  { title: 'Connect with Razorpay Enterprise Sales Director', description: 'Leads enterprise sales at Razorpay. Closed deals with 50+ large enterprises.', tags: ['Sales & Business Development', 'Enterprise', 'B2B', 'SaaS'], organization: 'Razorpay', position: 'Sales Director', price: 16000 },
  { title: 'Meet Freshworks Channel Partner Manager', description: 'Manages channel partnerships at Freshworks. Can help with partner ecosystem strategy.', tags: ['Partnerships', 'Sales & Business Development', 'Channel', 'SaaS'], organization: 'Freshworks', position: 'Partner Manager', price: 13000 },
  { title: 'Intro to Amazon India Seller Success Lead', description: 'Helps sellers grow on Amazon India. Expert in marketplace dynamics and seller strategies.', tags: ['Marketplaces', 'Sales & Business Development', 'E-Commerce', 'Amazon'], organization: 'Amazon India', position: 'Seller Success Lead', price: 11000 },
  
  // Operations & Hiring
  { title: 'Connect with Zomato Operations Manager', description: 'Senior ops manager at Zomato. Expert in food delivery logistics and fleet management.', tags: ['Operations', 'Logistics', 'Supply Chain', 'Food & Beverage'], organization: 'Zomato', position: 'Operations Manager', price: 12000 },
  { title: 'Meet Flipkart Hiring Lead', description: 'Recruitment lead at Flipkart. Can help with hiring strategy and talent acquisition.', tags: ['Hiring & Managing', 'Recruitment', 'HR', 'Operations'], organization: 'Flipkart', position: 'Hiring Lead', price: 10000 },
  { title: 'Intro to Razorpay People Ops Head', description: 'Heads people operations at Razorpay. Expert in building strong company culture in startups.', tags: ['Company Culture', 'Hiring & Managing', 'HR', 'Startups'], organization: 'Razorpay', position: 'People Operations Head', price: 14000 },
  
  // Strategy & Leadership
  { title: 'Connect with Myntra Strategy Lead', description: 'Corporate strategy lead at Myntra. Worked on multiple M&A deals in e-commerce space.', tags: ['Strategy', 'Mergers & Acquisitions', 'M&A', 'E-Commerce'], organization: 'Myntra', position: 'Strategy Lead', price: 17000 },
  { title: 'Meet Nykaa CFO', description: 'CFO at Nykaa. Can provide financial planning guidance for consumer brands.', tags: ['CFO', 'Finance', 'Financial Planning', 'Consumer'], organization: 'Nykaa', position: 'CFO', price: 22000 },
  { title: 'Intro to Chargebee CMO', description: 'Chief Marketing Officer at Chargebee. Expert in SaaS marketing and go-to-market strategy.', tags: ['CMO', 'Marketing', 'Go-To-Market', 'SaaS'], organization: 'Chargebee', position: 'CMO', price: 20000 },
  { title: 'Connect with Cult.fit COO', description: 'Chief Operating Officer at Cult.fit. Can advise on scaling operations for consumer startups.', tags: ['COO', 'Operations', 'Scaling', 'Consumer'], organization: 'Cult.fit', position: 'COO', price: 25000 },
  
  // Specialized Roles
  { title: 'Meet Practo Healthcare Consultant', description: 'Medical consultant at Practo. Can help with regulatory compliance for health-tech products.', tags: ['HealthTech', 'Healthcare', 'Regulatory', 'Consulting'], organization: 'Practo', position: 'Healthcare Consultant', price: 15000 },
  { title: 'Connect with WazirX Compliance Head', description: 'Heads legal and compliance at WazirX. Expert in crypto regulations in India.', tags: ['Crypto, NFTs, & Web3', 'Compliance', 'Legal', 'Regulatory'], organization: 'WazirX', position: 'Compliance Head', price: 18000 },
  { title: 'Intro to Polygon Community Manager', description: 'Manages developer community at Polygon. Can help with Web3 community building.', tags: ['Crypto, NFTs, & Web3', 'Community', 'Developer Relations', 'Blockchain'], organization: 'Polygon', position: 'Community Manager', price: 14000 },
  
  // Content & Media
  { title: 'Connect with Zomato Content Strategist', description: 'Creates content strategy for Zomato. Expert in food and lifestyle content marketing.', tags: ['Content Marketing', 'Marketing', 'Food & Beverage', 'Social Media'], organization: 'Zomato', position: 'Content Strategist', price: 11000 },
  { title: 'Meet Unacademy Video Producer', description: 'Produces educational content at Unacademy. Can help with video content strategy.', tags: ['Content Marketing', 'Video', 'Education', 'Media'], organization: 'Unacademy', position: 'Video Producer', price: 10000 },
  { title: 'Intro to BYJU\'S PR Manager', description: 'Public relations manager at BYJU\'S. Has secured coverage in top Indian media outlets.', tags: ['Public Relations', 'PR', 'Media', 'Communications'], organization: 'BYJU\'S', position: 'PR Manager', price: 13000 },
  
  // Technology & Engineering
  { title: 'Connect with Swiggy Backend Architect', description: 'Principal engineer at Swiggy. Built scalable systems handling millions of orders.', tags: ['Software Engineer', 'Backend', 'Architecture', 'Scaling'], organization: 'Swiggy', position: 'Backend Architect', price: 17000 },
  { title: 'Meet PharmEasy Mobile Lead', description: 'Leads mobile engineering at PharmEasy. Expert in React Native and mobile architecture.', tags: ['Mobile', 'Software Engineer', 'React Native', 'HealthTech'], organization: 'PharmEasy', position: 'Mobile Engineering Lead', price: 15000 },
  { title: 'Intro to Paytm Security Engineer', description: 'Security engineer at Paytm. Expert in payment security and fraud prevention.', tags: ['Security', 'Engineering', 'Fintech', 'Payment'], organization: 'Paytm', position: 'Security Engineer', price: 16000 },
  
  // More AI & Machine Learning
  { title: 'Meet Ola AI Research Lead', description: 'Heading AI research at Ola. Expert in routing optimization and predictive analytics.', tags: ['AI', 'Machine Learning', 'Research', 'Technology'], organization: 'Ola', position: 'AI Research Lead', price: 19000 },
  { title: 'Connect with PhonePe ML Engineer', description: 'ML engineer at PhonePe. Built fraud detection and risk models at scale.', tags: ['AI', 'Machine Learning', 'Fintech', 'Engineering'], organization: 'PhonePe', position: 'ML Engineer', price: 16000 },
  { title: 'Intro to Lenskart Computer Vision Expert', description: 'Computer vision lead at Lenskart. Built virtual try-on and AR experiences.', tags: ['AI', 'Computer Vision', 'AR/VR', 'Technology'], organization: 'Lenskart', position: 'CV Lead', price: 17000 },
  { title: 'Meet Haptik NLP Researcher', description: 'NLP researcher at Haptik. Expert in conversational AI and multilingual chatbots.', tags: ['AI', 'NLP', 'Chatbots', 'Research'], organization: 'Haptik', position: 'NLP Researcher', price: 15000 },
  { title: 'Connect with Flipkart Data Scientist', description: 'Senior data scientist at Flipkart. Built recommendation engines for millions of users.', tags: ['AI', 'Data Science', 'Machine Learning', 'Analytics'], organization: 'Flipkart', position: 'Data Scientist', price: 16000 },
  { title: 'Intro to Meesho AI Product Manager', description: 'PM for AI products at Meesho. Shipped ML-powered personalization features.', tags: ['AI', 'Product Management', 'Machine Learning', 'Consumer'], organization: 'Meesho', position: 'AI Product Manager', price: 14000 },
  { title: 'Meet Cars24 AI Pricing Lead', description: 'Built AI pricing models at Cars24. Expert in dynamic pricing algorithms.', tags: ['AI', 'Pricing', 'Machine Learning', 'Automotive'], organization: 'Cars24', position: 'AI Pricing Lead', price: 15000 },
  
  // More Fundraising
  { title: 'Connect with Elevation Capital Partner', description: 'Investment partner at Elevation Capital. Focus on consumer and SaaS startups.', tags: ['Fundraising', 'Venture Capital', 'Investor', 'Consumer'], organization: 'Elevation Capital', position: 'Partner', price: 28000 },
  { title: 'Meet Kalaari Capital Associate', description: 'Early-stage investor at Kalaari Capital. Evaluate pre-seed to seed deals.', tags: ['Fundraising', 'Venture Capital', 'Pre-Seed', 'Angel'], organization: 'Kalaari Capital', position: 'Associate', price: 18000 },
  { title: 'Intro to Nexus Venture Partners VP', description: 'VP at Nexus focusing on B2B SaaS. Invested in 20+ Indian startups.', tags: ['Fundraising', 'Venture Capital', 'B2B', 'SaaS'], organization: 'Nexus Venture Partners', position: 'VP', price: 24000 },
  { title: 'Connect with SAIF Partners Principal', description: 'Principal at SAIF Partners. Focus on Series A-B consumer tech investments.', tags: ['Fundraising', 'Series A', 'Venture Capital', 'Consumer'], organization: 'SAIF Partners', position: 'Principal', price: 26000 },
  { title: 'Meet Stellaris Venture Partners Associate', description: 'Associate at Stellaris. Looking at deep-tech and B2B startups.', tags: ['Fundraising', 'Venture Capital', 'Deep Tech', 'B2B'], organization: 'Stellaris', position: 'Associate', price: 20000 },
  { title: 'Intro to India Quotient Partner', description: 'Partner at India Quotient. Early-stage investor in consumer and fintech.', tags: ['Fundraising', 'Pre-Seed', 'Seed', 'Consumer'], organization: 'India Quotient', position: 'Partner', price: 22000 },
  
  // More E-Commerce
  { title: 'Connect with Meesho Marketplace Manager', description: 'Manages marketplace sellers at Meesho. Can help with social commerce strategy.', tags: ['E-Commerce', 'Marketplaces', 'Social Commerce', 'Operations'], organization: 'Meesho', position: 'Marketplace Manager', price: 12000 },
  { title: 'Meet Ajio Fashion Buyer', description: 'Fashion buyer at Ajio. Expert in trend forecasting and brand partnerships.', tags: ['E-Commerce', 'Fashion', 'Retail', 'Merchandising'], organization: 'Ajio', position: 'Fashion Buyer', price: 13000 },
  { title: 'Intro to Shopify India Partner', description: 'Shopify expert. Helped 100+ Indian D2C brands set up and scale.', tags: ['E-Commerce', 'Shopify', 'D2C', 'Technology'], organization: 'Shopify', position: 'Partner Manager', price: 11000 },
  { title: 'Connect with BigBasket Category Lead', description: 'Category manager at BigBasket. Manages FMCG and grocery brands.', tags: ['E-Commerce', 'Retail', 'FMCG', 'Consumer'], organization: 'BigBasket', position: 'Category Lead', price: 14000 },
  { title: 'Meet FirstCry Brand Partner', description: 'Brand partnerships at FirstCry. Expert in baby and kids products e-commerce.', tags: ['E-Commerce', 'Retail', 'Kids', 'Partnerships'], organization: 'FirstCry', position: 'Brand Partner', price: 12000 },
  { title: 'Intro to Pepperfry Furniture Expert', description: 'Furniture category expert at Pepperfry. Understands large-item e-commerce logistics.', tags: ['E-Commerce', 'Furniture', 'Logistics', 'Retail'], organization: 'Pepperfry', position: 'Category Manager', price: 13000 },
  
  // More SaaS & B2B
  { title: 'Connect with Postman Developer Advocate', description: 'Developer advocate at Postman. Can help with API-first SaaS products.', tags: ['SaaS', 'API', 'Developer Tools', 'B2B'], organization: 'Postman', position: 'Developer Advocate', price: 16000 },
  { title: 'Meet Clevertap Customer Success VP', description: 'VP of CS at Clevertap. Expert in retention and expansion for B2B SaaS.', tags: ['SaaS', 'Customer Success', 'B2B', 'Retention'], organization: 'Clevertap', position: 'CS VP', price: 19000 },
  { title: 'Intro to Netcore Cloud Solutions Architect', description: 'Solutions architect at Netcore. Helps enterprise customers with marketing automation.', tags: ['SaaS', 'Enterprise', 'MarTech', 'B2B'], organization: 'Netcore', position: 'Solutions Architect', price: 15000 },
  { title: 'Connect with Wingify Product Lead', description: 'Product lead at Wingify (VWO). Expert in A/B testing and optimization products.', tags: ['SaaS', 'Product', 'Analytics', 'B2B'], organization: 'Wingify', position: 'Product Lead', price: 14000 },
  { title: 'Meet Verloop.io Sales Engineer', description: 'Sales engineer at Verloop. Expert in technical sales for AI/ML products.', tags: ['SaaS', 'Sales Engineer', 'AI', 'B2B'], organization: 'Verloop.io', position: 'Sales Engineer', price: 13000 },
  { title: 'Intro to Exotel Enterprise Account Manager', description: 'Enterprise AM at Exotel. Manages large telecom API customers.', tags: ['SaaS', 'Enterprise', 'Telecom', 'API'], organization: 'Exotel', position: 'Account Manager', price: 12000 },
  { title: 'Connect with MoEngage Growth Marketer', description: 'Growth marketer at MoEngage. Expert in product-led growth for SaaS.', tags: ['SaaS', 'Marketing', 'Product Led Growth', 'B2B'], organization: 'MoEngage', position: 'Growth Marketer', price: 14000 },
  
  // More Marketing
  { title: 'Meet Dunzo Brand Lead', description: 'Brand lead at Dunzo. Expert in hyperlocal marketing and brand positioning.', tags: ['Marketing', 'Branding', 'Consumer', 'Local'], organization: 'Dunzo', position: 'Brand Lead', price: 13000 },
  { title: 'Connect with PhonePe Growth Hacker', description: 'Growth team at PhonePe. Expert in viral loops and referral marketing.', tags: ['Marketing', 'Growth Hacking', 'Viral', 'Fintech'], organization: 'PhonePe', position: 'Growth Hacker', price: 15000 },
  { title: 'Intro to Licious Content Marketing Manager', description: 'Content marketing at Licious. Built audience for D2C food brand.', tags: ['Marketing', 'Content Marketing', 'D2C', 'Food'], organization: 'Licious', position: 'Content Marketing Manager', price: 12000 },
  { title: 'Meet Mamaearth Influencer Marketing Lead', description: 'Influencer marketing at Mamaearth. Built creator partnerships for beauty brand.', tags: ['Marketing', 'Influencer Marketing', 'Beauty', 'D2C'], organization: 'Mamaearth', position: 'Influencer Lead', price: 14000 },
  
  // More Product
  { title: 'Connect with CRED Product Designer', description: 'Product designer at CRED. Expert in premium product experiences and gamification.', tags: ['Product', 'Design', 'UX', 'Fintech'], organization: 'CRED', position: 'Product Designer', price: 16000 },
  { title: 'Meet Jupiter Product Manager', description: 'PM at Jupiter (neo-bank). Building consumer fintech products.', tags: ['Product', 'Product Management', 'Fintech', 'Consumer'], organization: 'Jupiter', position: 'Product Manager', price: 15000 },
  { title: 'Intro to Groww Product Lead', description: 'Product lead at Groww. Expert in investment and wealth-tech products.', tags: ['Product', 'Fintech', 'Investment', 'Consumer'], organization: 'Groww', position: 'Product Lead', price: 17000 },
  { title: 'Connect with Dream11 Game Designer', description: 'Game designer at Dream11. Expert in fantasy sports and gaming mechanics.', tags: ['Product', 'Gaming', 'Design', 'Consumer'], organization: 'Dream11', position: 'Game Designer', price: 14000 },
  { title: 'Meet MPL Product Strategist', description: 'Product strategist at MPL. Built gaming products for millions of users.', tags: ['Product', 'Gaming', 'Strategy', 'Consumer'], organization: 'MPL', position: 'Product Strategist', price: 15000 },
  
  // More Crypto & Web3
  { title: 'Connect with CoinDCX Trading Lead', description: 'Trading products lead at CoinDCX. Expert in crypto exchange products.', tags: ['Crypto, NFTs, & Web3', 'Trading', 'Product', 'Fintech'], organization: 'CoinDCX', position: 'Trading Lead', price: 18000 },
  { title: 'Meet CoinSwitch Operations Head', description: 'Operations head at CoinSwitch. Manages crypto trading operations.', tags: ['Crypto, NFTs, & Web3', 'Operations', 'Trading', 'Fintech'], organization: 'CoinSwitch', position: 'Operations Head', price: 17000 },
  { title: 'Intro to Matic Network Developer', description: 'Core developer at Polygon (Matic). Expert in Ethereum scaling solutions.', tags: ['Crypto, NFTs, & Web3', 'Blockchain', 'Ethereum', 'Engineering'], organization: 'Polygon', position: 'Core Developer', price: 22000 },
  { title: 'Connect with Zebpay Compliance Manager', description: 'Compliance manager at Zebpay. Navigates crypto regulations in India.', tags: ['Crypto, NFTs, & Web3', 'Compliance', 'Legal', 'Regulatory'], organization: 'Zebpay', position: 'Compliance Manager', price: 16000 },
  { title: 'Meet Mudrex Quant Trader', description: 'Quantitative trader at Mudrex. Expert in crypto trading algorithms.', tags: ['Crypto, NFTs, & Web3', 'Trading', 'Algorithms', 'Fintech'], organization: 'Mudrex', position: 'Quant Trader', price: 19000 },
  { title: 'Intro to Solana India Community Lead', description: 'Community lead for Solana in India. Expert in Web3 ecosystem building.', tags: ['Crypto, NFTs, & Web3', 'Solana', 'Community', 'Blockchain'], organization: 'Solana', position: 'Community Lead', price: 15000 },
  { title: 'Connect with Binance India BD Lead', description: 'Business development at Binance India. Expert in crypto partnerships.', tags: ['Crypto, NFTs, & Web3', 'Business Development', 'Partnerships', 'Trading'], organization: 'Binance', position: 'BD Lead', price: 20000 },
  { title: 'Meet Unstoppable Domains India Partner', description: 'India partner for Unstoppable Domains. Expert in Web3 domains and identity.', tags: ['Crypto, NFTs, & Web3', 'Web3', 'Identity', 'Product'], organization: 'Unstoppable Domains', position: 'India Partner', price: 14000 },
  
  // More Operations
  { title: 'Connect with Urban Company Ops Lead', description: 'Operations lead at Urban Company. Manages service provider network.', tags: ['Operations', 'Marketplaces', 'Services', 'Logistics'], organization: 'Urban Company', position: 'Operations Lead', price: 14000 },
  { title: 'Meet Delhivery Last Mile Manager', description: 'Last mile manager at Delhivery. Expert in delivery route optimization.', tags: ['Operations', 'Logistics', 'Delivery', 'Supply Chain'], organization: 'Delhivery', position: 'Last Mile Manager', price: 13000 },
  { title: 'Intro to Porter Fleet Optimization Lead', description: 'Fleet optimization at Porter. Expert in vehicle utilization algorithms.', tags: ['Operations', 'Logistics', 'Fleet', 'Optimization'], organization: 'Porter', position: 'Fleet Lead', price: 12000 },
  { title: 'Connect with Shadowfax Warehouse Manager', description: 'Warehouse operations at Shadowfax. Manages fulfillment centers.', tags: ['Operations', 'Warehouse', 'Logistics', 'Supply Chain'], organization: 'Shadowfax', position: 'Warehouse Manager', price: 11000 },
  { title: 'Meet Ecom Express COO', description: 'COO at Ecom Express. Expert in e-commerce logistics at scale.', tags: ['Operations', 'COO', 'Logistics', 'E-Commerce'], organization: 'Ecom Express', position: 'COO', price: 19000 },
  { title: 'Intro to Shiprocket Integration Lead', description: 'Integration lead at Shiprocket. Expert in logistics API integrations.', tags: ['Operations', 'Technology', 'API', 'Logistics'], organization: 'Shiprocket', position: 'Integration Lead', price: 12000 },
  
  // More HealthTech
  { title: 'Connect with 1mg Product Manager', description: 'Product manager at 1mg (Tata). Expert in online pharmacy products.', tags: ['HealthTech', 'Product', 'Pharmacy', 'Consumer'], organization: '1mg', position: 'Product Manager', price: 15000 },
  { title: 'Meet Portea Home Healthcare Lead', description: 'Home healthcare operations at Portea. Expert in at-home medical services.', tags: ['HealthTech', 'Healthcare', 'Operations', 'Services'], organization: 'Portea', position: 'Healthcare Lead', price: 14000 },
  { title: 'Intro to MFine Doctor Network Manager', description: 'Manages doctor network at MFine. Expert in telemedicine operations.', tags: ['HealthTech', 'Telemedicine', 'Operations', 'Healthcare'], organization: 'MFine', position: 'Network Manager', price: 13000 },
  { title: 'Connect with Truemeds Growth Manager', description: 'Growth at Truemeds. Expert in online pharmacy customer acquisition.', tags: ['HealthTech', 'Growth', 'Pharmacy', 'Marketing'], organization: 'Truemeds', position: 'Growth Manager', price: 12000 },
  { title: 'Meet DocsApp Medical Director', description: 'Medical director at DocsApp. Oversees clinical quality for digital health.', tags: ['HealthTech', 'Healthcare', 'Medical', 'Quality'], organization: 'DocsApp', position: 'Medical Director', price: 16000 },
  { title: 'Intro to HealthifyMe Nutrition Expert', description: 'Nutrition expert at HealthifyMe. Built nutrition and diet tracking products.', tags: ['HealthTech', 'Nutrition', 'Wellness', 'Product'], organization: 'HealthifyMe', position: 'Nutrition Expert', price: 13000 },
  { title: 'Connect with Omnicuris Medical Education Lead', description: 'Medical education at Omnicuris. Expert in digital learning for doctors.', tags: ['HealthTech', 'Education', 'Medical', 'Product'], organization: 'Omnicuris', position: 'Education Lead', price: 14000 },
  
  // More Fashion & Beauty
  { title: 'Connect with Sugar Cosmetics Product Head', description: 'Product head at Sugar Cosmetics. Expert in beauty product development.', tags: ['Fashion', 'Beauty', 'Product', 'D2C'], organization: 'Sugar Cosmetics', position: 'Product Head', price: 14000 },
  { title: 'Meet Bewakoof Brand Manager', description: 'Brand manager at Bewakoof. Built youth fashion brand online.', tags: ['Fashion', 'Branding', 'D2C', 'Consumer'], organization: 'Bewakoof', position: 'Brand Manager', price: 12000 },
  { title: 'Intro to Boat Lifestyle Marketing Lead', description: 'Marketing lead at Boat. Expert in youth lifestyle brand building.', tags: ['Fashion', 'Marketing', 'Branding', 'Consumer'], organization: 'Boat', position: 'Marketing Lead', price: 15000 },
  { title: 'Connect with FabIndia Retail Manager', description: 'Retail manager at FabIndia. Expert in ethnic fashion and omnichannel retail.', tags: ['Fashion', 'Retail', 'Omnichannel', 'Traditional'], organization: 'FabIndia', position: 'Retail Manager', price: 13000 },
  { title: 'Meet WowSkin Science Brand Strategist', description: 'Brand strategist at WowSkin. Built skincare brand through digital channels.', tags: ['Fashion', 'Skincare', 'Beauty', 'D2C'], organization: 'WowSkin Science', position: 'Brand Strategist', price: 14000 },
  { title: 'Intro to Purplle Category Manager', description: 'Category manager at Purplle. Manages beauty brands marketplace.', tags: ['Fashion', 'Beauty', 'Marketplaces', 'Retail'], organization: 'Purplle', position: 'Category Manager', price: 13000 },
  { title: 'Connect with Clovia Design Lead', description: 'Design lead at Clovia. Expert in lingerie and innerwear design.', tags: ['Fashion', 'Design', 'D2C', 'Product'], organization: 'Clovia', position: 'Design Lead', price: 12000 },
  { title: 'Meet Rare Rabbit Fashion Buyer', description: 'Fashion buyer at Rare Rabbit. Expert in menswear trends and merchandising.', tags: ['Fashion', 'Merchandising', 'Retail', 'Menswear'], organization: 'Rare Rabbit', position: 'Fashion Buyer', price: 14000 },
  
  // More Startups & Founders
  { title: 'Connect with Zomato Co-founder', description: 'Co-founder of Zomato. Can share insights on building and scaling food-tech unicorn.', tags: ['Startups', 'Founder', 'Food & Beverage', 'Scaling'], organization: 'Zomato', position: 'Co-founder', price: 30000 },
  { title: 'Meet Razorpay Founding Team Member', description: 'Early team member at Razorpay. Can advise on fintech product development.', tags: ['Startups', 'Founder', 'Fintech', 'Product'], organization: 'Razorpay', position: 'Founding Team', price: 28000 },
  { title: 'Intro to Byju\'s Early Employee', description: 'Joined Byju\'s at Series A. Can share growth journey from startup to unicorn.', tags: ['Startups', 'Growth', 'Education', 'Scaling'], organization: 'Byju\'s', position: 'Early Employee', price: 20000 },
  { title: 'Connect with Meesho Founder', description: 'Founder of Meesho. Expert in social commerce and building for Bharat.', tags: ['Startups', 'Founder', 'Social Commerce', 'Consumer'], organization: 'Meesho', position: 'Founder', price: 32000 },
  { title: 'Meet CRED Early Team Member', description: 'Joined CRED in first year. Can share insights on product-led growth.', tags: ['Startups', 'Product', 'Fintech', 'Growth'], organization: 'CRED', position: 'Early Team', price: 22000 },
  { title: 'Intro to Urban Company Co-founder', description: 'Co-founder of Urban Company. Expert in building service marketplaces.', tags: ['Startups', 'Founder', 'Marketplaces', 'Services'], organization: 'Urban Company', position: 'Co-founder', price: 30000 },
  { title: 'Connect with Dunzo Founding Member', description: 'Founding team at Dunzo. Built hyperlocal delivery from scratch.', tags: ['Startups', 'Founder', 'Logistics', 'Operations'], organization: 'Dunzo', position: 'Founding Member', price: 25000 },
  { title: 'Meet Ola Early PM', description: 'Product manager at Ola since early days. Built core ride-hailing features.', tags: ['Startups', 'Product Management', 'Consumer', 'Mobility'], organization: 'Ola', position: 'Early PM', price: 20000 },
  
  // More Scaling & Growth
  { title: 'Connect with PhonePe Scaling Expert', description: 'Scaled PhonePe from 10M to 400M users. Expert in hypergrowth.', tags: ['Scaling', 'Growth', 'Fintech', 'Consumer'], organization: 'PhonePe', position: 'Growth Lead', price: 22000 },
  { title: 'Meet Swiggy Operations Scale Expert', description: 'Scaled Swiggy operations to 500+ cities. Expert in geographic expansion.', tags: ['Scaling', 'Operations', 'Logistics', 'Growth'], organization: 'Swiggy', position: 'Expansion Lead', price: 20000 },
  { title: 'Intro to Flipkart Team Scaling Leader', description: 'Scaled engineering team at Flipkart from 50 to 500. Expert in hiring and org design.', tags: ['Scaling', 'Hiring & Managing', 'Engineering', 'Leadership'], organization: 'Flipkart', position: 'Engineering Director', price: 24000 },
  { title: 'Connect with Nykaa Multi-city Launch Expert', description: 'Launched Nykaa physical stores in 20+ cities. Expert in omnichannel scaling.', tags: ['Scaling', 'Retail', 'Omnichannel', 'Operations'], organization: 'Nykaa', position: 'Expansion Head', price: 18000 },
  { title: 'Meet Paytm Payments Scale Architect', description: 'Architected Paytm to handle 1000+ TPS. Expert in scaling payment systems.', tags: ['Scaling', 'Technology', 'Fintech', 'Architecture'], organization: 'Paytm', position: 'Principal Architect', price: 23000 },
  { title: 'Intro to Unacademy Content Scale Lead', description: 'Scaled Unacademy from 100 to 10,000+ educators. Expert in marketplace scaling.', tags: ['Scaling', 'Marketplaces', 'Education', 'Operations'], organization: 'Unacademy', position: 'Marketplace Lead', price: 19000 },
  
  // More Fintech
  { title: 'Connect with Slice Product Lead', description: 'Product lead at Slice (neo-banking). Expert in credit cards for millennials.', tags: ['Fintech', 'Product', 'Credit', 'Consumer'], organization: 'Slice', position: 'Product Lead', price: 17000 },
  { title: 'Meet Uni Cards Founder', description: 'Founder of Uni Cards. Expert in pay-later and credit products for India.', tags: ['Fintech', 'Founder', 'Credit', 'Consumer'], organization: 'Uni Cards', position: 'Founder', price: 25000 },
  { title: 'Intro to Khatabook Growth Manager', description: 'Growth at Khatabook. Expert in SMB fintech products for small merchants.', tags: ['Fintech', 'Growth', 'SMB', 'Product'], organization: 'Khatabook', position: 'Growth Manager', price: 14000 },
  { title: 'Connect with BharatPe Merchant Lead', description: 'Merchant partnerships at BharatPe. Expert in offline merchant acquisition.', tags: ['Fintech', 'Partnerships', 'Offline', 'Merchants'], organization: 'BharatPe', position: 'Merchant Lead', price: 16000 },
  { title: 'Meet PolicyBazaar Insurance Expert', description: 'Insurance product expert at PolicyBazaar. 10+ years in insurtech.', tags: ['Fintech', 'Insurance', 'Product', 'Consumer'], organization: 'PolicyBazaar', position: 'Insurance Expert', price: 18000 },
  { title: 'Intro to ET Money Investment Lead', description: 'Investment products at ET Money. Expert in mutual funds and wealth tech.', tags: ['Fintech', 'Investment', 'Wealth', 'Product'], organization: 'ET Money', position: 'Investment Lead', price: 15000 },
  { title: 'Connect with Zerodha Product Manager', description: 'PM at Zerodha. Built trading platforms for millions of retail investors.', tags: ['Fintech', 'Trading', 'Product Management', 'Investment'], organization: 'Zerodha', position: 'Product Manager', price: 19000 },
  { title: 'Meet Smallcase Investment Advisor', description: 'Investment advisor at Smallcase. Expert in thematic investing products.', tags: ['Fintech', 'Investment', 'Product', 'Wealth'], organization: 'Smallcase', position: 'Investment Advisor', price: 16000 },
  
  // More Food & Beverage
  { title: 'Connect with Zomato Restaurant Consultant', description: 'Restaurant consultant at Zomato. Helps restaurants optimize menu and pricing.', tags: ['Food & Beverage', 'Consulting', 'Restaurant', 'Operations'], organization: 'Zomato', position: 'Restaurant Consultant', price: 13000 },
  { title: 'Meet Swiggy Cloud Kitchen Expert', description: 'Cloud kitchen operations at Swiggy. Expert in setting up virtual brands.', tags: ['Food & Beverage', 'Cloud Kitchen', 'Operations', 'Restaurant'], organization: 'Swiggy', position: 'Cloud Kitchen Expert', price: 15000 },
  { title: 'Intro to Rebel Foods Kitchen Manager', description: 'Kitchen manager at Rebel Foods. Runs 10+ cloud kitchen brands.', tags: ['Food & Beverage', 'Cloud Kitchen', 'Operations', 'Management'], organization: 'Rebel Foods', position: 'Kitchen Manager', price: 14000 },
  { title: 'Connect with Chaayos Franchise Lead', description: 'Franchise lead at Chaayos. Expert in F&B franchise model.', tags: ['Food & Beverage', 'Franchise', 'Business', 'Retail'], organization: 'Chaayos', position: 'Franchise Lead', price: 13000 },
  { title: 'Meet ID Fresh Foods Product Developer', description: 'Product developer at ID Fresh. Expert in packaged food products.', tags: ['Food & Beverage', 'Product', 'FMCG', 'Manufacturing'], organization: 'ID Fresh Foods', position: 'Product Developer', price: 12000 },
  { title: 'Intro to Country Delight Supply Chain Head', description: 'Supply chain at Country Delight. Expert in fresh food logistics.', tags: ['Food & Beverage', 'Supply Chain', 'Logistics', 'Operations'], organization: 'Country Delight', position: 'Supply Chain Head', price: 14000 },
  
  // More Real Estate & PropTech
  { title: 'Connect with NoBroker Product Manager', description: 'Product manager at NoBroker. Built rental and property search products.', tags: ['Real Estate', 'Product', 'PropTech', 'Consumer'], organization: 'NoBroker', position: 'Product Manager', price: 15000 },
  { title: 'Meet Housing.com Sales Lead', description: 'Sales lead at Housing.com. Expert in real estate sales and lead generation.', tags: ['Real Estate', 'Sales', 'PropTech', 'Business'], organization: 'Housing.com', position: 'Sales Lead', price: 14000 },
  { title: 'Intro to Nestaway Operations Manager', description: 'Operations at Nestaway. Expert in managed home rentals at scale.', tags: ['Real Estate', 'Operations', 'PropTech', 'Services'], organization: 'Nestaway', position: 'Operations Manager', price: 13000 },
  { title: 'Connect with Square Yards Consultant', description: 'Real estate consultant at Square Yards. Expert in property advisory.', tags: ['Real Estate', 'Consulting', 'Advisory', 'Business'], organization: 'Square Yards', position: 'Consultant', price: 12000 },
  
  // More Travel & Mobility
  { title: 'Connect with MakeMyTrip Product Lead', description: 'Product lead at MakeMyTrip. Built flight and hotel booking products.', tags: ['Travel', 'Product', 'Product Management', 'Consumer'], organization: 'MakeMyTrip', position: 'Product Lead', price: 16000 },
  { title: 'Meet Cleartrip UX Designer', description: 'UX designer at Cleartrip. Designed travel booking experiences.', tags: ['Travel', 'Design', 'UX', 'Product'], organization: 'Cleartrip', position: 'UX Designer', price: 14000 },
  { title: 'Intro to Bounce Mobility Operations Head', description: 'Operations at Bounce. Expert in bike-sharing and micro-mobility.', tags: ['Travel', 'Operations', 'Mobility', 'Consumer'], organization: 'Bounce', position: 'Operations Head', price: 13000 },
  { title: 'Connect with Rapido Co-founder', description: 'Co-founder of Rapido. Expert in bike taxi business model.', tags: ['Travel', 'Founder', 'Mobility', 'Consumer'], organization: 'Rapido', position: 'Co-founder', price: 24000 },
  { title: 'Meet Uber India City Lead', description: 'City operations lead at Uber India. Managed launches in multiple cities.', tags: ['Travel', 'Operations', 'Mobility', 'Business'], organization: 'Uber', position: 'City Lead', price: 17000 },
  { title: 'Intro to Yatra Corporate Sales Manager', description: 'Corporate sales at Yatra. Expert in B2B travel solutions.', tags: ['Travel', 'Sales', 'B2B', 'Corporate'], organization: 'Yatra', position: 'Corporate Sales Manager', price: 13000 },
];

// COMPLETELY DIFFERENT data for requests - different companies and roles
const demoRequests = [
  // IT Services & Consulting
  { target: 'Engineering Director at Infosys', message: 'Building enterprise software. Need guidance on scaling engineering teams for global clients.', tags: ['Software Engineer', 'Engineering', 'Scaling', 'Enterprise'], organization: 'Infosys', reward: 8000 },
  { target: 'VP Technology at Wipro', message: 'Looking for mentorship on digital transformation projects. Need someone with large-scale implementation experience.', tags: ['Technology', 'Digital Transformation', 'CTO', 'Enterprise'], organization: 'Wipro', reward: 9000 },
  { target: 'Cloud Architect at TCS', message: 'Migrating legacy systems to cloud. Need expert who has done this at enterprise scale in India.', tags: ['Technology', 'Cloud', 'Enterprise', 'Operations'], organization: 'TCS', reward: 8500 },
  
  // Banking & Finance
  { target: 'Head of Digital Banking at HDFC', message: 'Launching fintech product. Need intro to banking executive who understands digital transformation.', tags: ['Finance', 'Banking', 'Digital Transformation', 'Product'], organization: 'HDFC Bank', reward: 9500 },
  { target: 'Innovation Lead at ICICI Bank', message: 'Building payment solution. Want guidance from someone driving innovation in traditional banking.', tags: ['Finance', 'Innovation', 'Fintech', 'Banking'], organization: 'ICICI Bank', reward: 9000 },
  
  // Manufacturing & Industrial
  { target: 'Supply Chain Manager at Reliance', message: 'Optimizing logistics for manufacturing. Need expertise in Indian supply chain management.', tags: ['Supply Chain', 'Operations', 'Manufacturing', 'Logistics'], organization: 'Reliance', reward: 7500 },
  { target: 'Chief Engineer at Tata Motors', message: 'Developing electric vehicle components. Looking for technical mentorship from automotive expert.', tags: ['Engineering', 'Automotive', 'Manufacturing', 'Innovation'], organization: 'Tata Motors', reward: 8500 },
  { target: 'Innovation Head at Mahindra', message: 'Exploring partnerships in mobility space. Need intro to someone leading new initiatives.', tags: ['Innovation', 'Partnerships', 'Automotive', 'Strategy'], organization: 'Mahindra', reward: 8000 },
  
  // Telecom & Connectivity
  { target: 'Network Planning Lead at Airtel', message: 'Building telecom infrastructure product. Need technical validation from industry expert.', tags: ['Telecom', 'Technology', 'Infrastructure', 'Engineering'], organization: 'Airtel', reward: 7500 },
  { target: 'Product Manager at Jio', message: 'Launching digital services platform. Want feedback from PM in telecom space.', tags: ['Product', 'Telecom', 'Digital', 'Product Management'], organization: 'Jio', reward: 8000 },
  
  // Enterprise Software & SaaS
  { target: 'Enterprise Sales Head at Oracle India', message: 'Selling to large enterprises. Need mentorship on enterprise sales cycles and contracts.', tags: ['Enterprise', 'Sales & Business Development', 'SaaS', 'B2B'], organization: 'Oracle', reward: 8500 },
  { target: 'Customer Success Director at Salesforce India', message: 'Building CS team for B2B product. Want to learn from someone managing enterprise customers.', tags: ['Customer Success', 'B2B', 'SaaS', 'Enterprise'], organization: 'Salesforce', reward: 8000 },
  
  // E-commerce & Retail
  { target: 'Warehouse Operations Manager at BigBasket', message: 'Scaling fulfillment operations. Need advice on warehouse management for Indian e-commerce.', tags: ['Operations', 'Supply Chain', 'E-Commerce', 'Logistics'], organization: 'BigBasket', reward: 7000 },
  { target: 'Category Manager at Snapdeal', message: 'Launching new product category. Want insights from experienced e-commerce category lead.', tags: ['E-Commerce', 'Product', 'Retail', 'Merchandising'], organization: 'Snapdeal', reward: 7500 },
  
  // Professional Services
  { target: 'Partner at Deloitte India', message: 'Need business strategy consultant. Looking for intro to partner with startup advisory experience.', tags: ['Consulting', 'Business Strategy', 'Strategy', 'Advisory'], organization: 'Deloitte', reward: 9500 },
  { target: 'M&A Director at EY', message: 'Exploring acquisition. Need guidance on deal structuring and due diligence in India.', tags: ['M&A', 'Mergers & Acquisitions', 'Finance', 'Strategy'], organization: 'EY', reward: 9500 },
  
  // Media & Entertainment
  { target: 'Content Head at Hotstar', message: 'Producing digital content series. Need intro to someone who understands Indian OTT market.', tags: ['Media', 'Content Marketing', 'Entertainment', 'Digital'], organization: 'Hotstar', reward: 8000 },
  { target: 'Marketing Director at Sony India', message: 'Launching consumer electronics brand. Want marketing expertise for Indian market.', tags: ['Marketing', 'Consumer', 'Branding', 'Retail'], organization: 'Sony', reward: 8500 },
  
  // Travel & Hospitality
  { target: 'Product Lead at MakeMyTrip', message: 'Building travel-tech solution. Need product feedback from someone in travel industry.', tags: ['Product', 'Travel', 'Technology', 'Consumer Apps'], organization: 'MakeMyTrip', reward: 7500 },
  { target: 'Operations Head at OYO', message: 'Scaling hospitality operations. Want to learn from someone managing pan-India operations.', tags: ['Operations', 'Hospitality', 'Scaling', 'Business'], organization: 'OYO', reward: 7000 },
  
  // Logistics & Delivery
  { target: 'Last Mile Head at Delhivery', message: 'Optimizing delivery routes. Need logistics expert with India-specific experience.', tags: ['Logistics', 'Operations', 'Supply Chain', 'Technology'], organization: 'Delhivery', reward: 7500 },
  { target: 'Fleet Manager at Porter', message: 'Managing vehicle fleet operations. Looking for operational excellence mentor.', tags: ['Operations', 'Logistics', 'Fleet Management', 'Optimization'], organization: 'Porter', reward: 7000 },
  
  // Real Estate & PropTech
  { target: 'Business Head at Housing.com', message: 'Building proptech solution. Need real estate industry insights and partnerships.', tags: ['Real Estate', 'Business Development', 'Partnerships', 'PropTech'], organization: 'Housing.com', reward: 8000 },
  { target: 'Analytics Lead at 99acres', message: 'Building real estate pricing model. Need data science expertise in proptech.', tags: ['Data Science', 'Analytics', 'Real Estate', 'Technology'], organization: '99acres', reward: 7500 },
  
  // Insurance & InsurTech
  { target: 'Chief Actuary at LIC', message: 'Developing insurance product. Need actuarial and risk assessment expertise.', tags: ['Insurance', 'Finance', 'Risk Management', 'Product'], organization: 'LIC', reward: 9000 },
  { target: 'Digital Head at ICICI Lombard', message: 'Digitizing insurance processes. Want guidance on insurtech transformation.', tags: ['Insurance', 'Digital Transformation', 'Technology', 'Product'], organization: 'ICICI Lombard', reward: 8500 },
  
  // More Fundraising Requests
  { target: 'Seed Investor at Blume Ventures', message: 'Early-stage SaaS startup raising seed round. Looking for intro to investors who understand Indian B2B.', tags: ['Fundraising', 'Seed', 'Venture Capital', 'SaaS'], organization: 'Blume Ventures', reward: 9500 },
  { target: 'Angel Investor Network', message: 'Consumer app with 50K users. Seeking angels who invest in pre-revenue consumer startups.', tags: ['Fundraising', 'Angel Investor', 'Consumer Apps', 'Pre-Seed'], organization: 'Mumbai Angels', reward: 8000 },
  { target: 'Venture Partner at Matrix Partners', message: 'Series A SaaS company. Need intro to US-based investors for international expansion.', tags: ['Fundraising', 'Series A', 'Venture Capital', 'International'], organization: 'Matrix Partners', reward: 10000 },
  { target: 'Growth Equity Investor', message: 'Profitable B2B company looking for growth capital. Seeking late-stage VC or PE firm.', tags: ['Fundraising', 'Growth Equity', 'Private Equity', 'B2B'], organization: 'WestBridge Capital', reward: 9000 },
  { target: 'Corporate VC at Times Internet', message: 'Media-tech startup. Looking for strategic investor who can provide distribution.', tags: ['Fundraising', 'Corporate VC', 'Strategic', 'Media'], organization: 'Times Internet', reward: 8500 },
  
  // More AI & Technology Requests
  { target: 'AI Research Scientist at IIT Delhi', message: 'Building computer vision product. Need academic collaboration for AI model development.', tags: ['AI', 'Research', 'Machine Learning', 'Computer Vision'], organization: 'IIT Delhi', reward: 7000 },
  { target: 'ML Engineer at PhonePe', message: 'Implementing fraud detection system. Need ML expert with fintech experience.', tags: ['AI', 'Machine Learning', 'Fintech', 'Fraud Detection'], organization: 'PhonePe', reward: 8500 },
  { target: 'NLP Lead at Haptik', message: 'Building conversational AI. Looking for NLP expert for chatbot optimization.', tags: ['AI', 'NLP', 'Chatbots', 'Technology'], organization: 'Haptik', reward: 8000 },
  { target: 'AI Product Manager at Ola', message: 'Launching AI-powered features. Need PM who has shipped ML products at scale.', tags: ['AI', 'Product Management', 'Technology', 'Consumer'], organization: 'Ola', reward: 8500 },
  { target: 'Data Scientist at Flipkart', message: 'Building recommendation engine. Want mentorship from experienced ML practitioner.', tags: ['AI', 'Data Science', 'Machine Learning', 'E-Commerce'], organization: 'Flipkart', reward: 7500 },
  
  // More Marketing & Growth Requests
  { target: 'Growth Lead at CRED', message: 'Need viral marketing expert. Looking for creative growth hacking strategies.', tags: ['Marketing', 'Growth', 'Viral Marketing', 'Consumer'], organization: 'CRED', reward: 8500 },
  { target: 'Performance Marketer at Dream11', message: 'Scaling paid acquisition. Need expert in Facebook/Google ads for Indian market.', tags: ['Marketing', 'Performance Marketing', 'Paid Ads', 'Growth'], organization: 'Dream11', reward: 8000 },
  { target: 'Brand Manager at Mamaearth', message: 'Building D2C brand. Want guidance on branding and positioning in beauty space.', tags: ['Marketing', 'Branding', 'D2C', 'Consumer'], organization: 'Mamaearth', reward: 7500 },
  { target: 'Content Head at Sharechat', message: 'Creating vernacular content strategy. Need social media expert for Indian languages.', tags: ['Marketing', 'Content Marketing', 'Social Media', 'Regional'], organization: 'Sharechat', reward: 7000 },
  { target: 'CMO at UpGrad', message: 'Need full-stack marketing leader. Looking for CMO-level advisor for ed-tech.', tags: ['Marketing', 'CMO', 'Education', 'Leadership'], organization: 'UpGrad', reward: 9000 },
  
  // More Product & Startup Requests
  { target: 'Product Head at Meesho', message: 'Building social commerce features. Need product strategy guidance.', tags: ['Product', 'Product Management', 'Social Commerce', 'Consumer'], organization: 'Meesho', reward: 8000 },
  { target: 'Startup Founder - Consumer App', message: 'Pre-PMF consumer app. Looking for founder who has achieved product-market fit.', tags: ['Product Market Fit', 'Founder', 'Startups', 'Consumer'], organization: 'Independent', reward: 7500 },
  { target: 'CTO at Dunzo', message: 'Scaling tech team. Need CTO mentorship on engineering organization.', tags: ['CTO', 'Technology', 'Scaling', 'Engineering'], organization: 'Dunzo', reward: 9000 },
  { target: 'CPO at Urban Company', message: 'Need product leadership advice. Building marketplace for services.', tags: ['CPO', 'Product', 'Marketplaces', 'Services'], organization: 'Urban Company', reward: 8500 },
  { target: 'Executive Coach - CEO Mentor', message: 'First-time founder. Looking for executive coach who has mentored startup CEOs.', tags: ['CEO', 'Founder', 'Coaching', 'Leadership'], organization: 'Independent', reward: 8000 },
  
  // More E-Commerce Requests
  { target: 'Marketplace Specialist at Amazon', message: 'Launching on Amazon India. Need expert to optimize product listings and ads.', tags: ['E-Commerce', 'Amazon', 'Marketplaces', 'Optimization'], organization: 'Amazon', reward: 7000 },
  { target: 'D2C Brand Consultant', message: 'Starting D2C beauty brand. Need end-to-end guidance on Shopify setup and marketing.', tags: ['E-Commerce', 'D2C', 'Shopify', 'Beauty'], organization: 'Independent', reward: 7500 },
  { target: 'Logistics Head at Shiprocket', message: 'Optimizing shipping costs. Need logistics expert for e-commerce fulfillment.', tags: ['E-Commerce', 'Logistics', 'Supply Chain', 'Operations'], organization: 'Shiprocket', reward: 7000 },
  { target: 'Omnichannel Expert', message: 'Expanding offline. Need strategy for connecting online store with physical retail.', tags: ['E-Commerce', 'Omnichannel', 'Retail', 'Strategy'], organization: 'Independent', reward: 8000 },
  
  // More SaaS & B2B Requests
  { target: 'B2B SaaS Founder at Postman', message: 'Scaling API-first SaaS. Looking for founder mentorship on developer tools.', tags: ['SaaS', 'B2B', 'Developer Tools', 'Founder'], organization: 'Postman', reward: 9000 },
  { target: 'Enterprise Sales Expert', message: 'Selling to Fortune 500. Need enterprise sales playbook and contract negotiation tips.', tags: ['SaaS', 'Enterprise Sales', 'B2B', 'Sales'], organization: 'Independent', reward: 8000 },
  { target: 'CS Leader at Clevertap', message: 'Building customer success org. Want guidance on retention and expansion for SaaS.', tags: ['SaaS', 'Customer Success', 'B2B', 'Operations'], organization: 'Clevertap', reward: 7500 },
  { target: 'Pricing Strategist', message: 'Need SaaS pricing expert. Struggling with packaging and pricing tiers.', tags: ['SaaS', 'Pricing', 'Strategy', 'Product'], organization: 'Independent', reward: 7000 },
  
  // More Operations & Hiring
  { target: 'Head of People at Swiggy', message: 'Scaling from 50 to 200 people. Need HR leader to set up processes.', tags: ['Hiring & Managing', 'HR', 'Scaling', 'Operations'], organization: 'Swiggy', reward: 8000 },
  { target: 'Tech Recruiter Specialist', message: 'Struggling to hire senior engineers. Need recruiter for tech talent acquisition.', tags: ['Hiring & Managing', 'Recruitment', 'Tech', 'HR'], organization: 'Independent', reward: 6500 },
  { target: 'Culture Consultant', message: 'Building remote-first company. Need guidance on company culture and values.', tags: ['Company Culture', 'Remote Work', 'HR', 'Leadership'], organization: 'Independent', reward: 7000 },
  { target: 'Operations Head at Licious', message: 'Managing complex supply chain. Need ops expert for perishable goods.', tags: ['Operations', 'Supply Chain', 'Food & Beverage', 'Logistics'], organization: 'Licious', reward: 7500 },
  
  // More Strategy & Finance
  { target: 'Strategic Finance at Byju\'s', message: 'Preparing for IPO. Need CFO-level guidance on financial planning.', tags: ['Finance', 'CFO', 'IPO', 'Strategy'], organization: 'Byju\'s', reward: 9500 },
  { target: 'Business Strategy Consultant at BCG', message: 'Need growth strategy for consumer business. Looking for consultant with Indian market expertise.', tags: ['Strategy', 'Business Strategy', 'Growth', 'Consulting'], organization: 'BCG', reward: 9000 },
  { target: 'M&A Advisor at Goldman Sachs', message: 'Exploring acquisition targets. Need advisor for deal sourcing and valuation.', tags: ['Mergers & Acquisitions', 'M&A', 'Finance', 'Investment Banking'], organization: 'Goldman Sachs', reward: 10000 },
  { target: 'Board Member - Consumer Tech', message: 'Adding independent director. Looking for board member with governance experience.', tags: ['Board Member', 'Governance', 'Strategy', 'Leadership'], organization: 'Independent', reward: 9500 },
  
  // More Crypto & Web3
  { target: 'DeFi Protocol Founder', message: 'Building DeFi on Polygon. Need Web3 founder to review tokenomics.', tags: ['Crypto, NFTs, & Web3', 'DeFi', 'Tokenomics', 'Blockchain'], organization: 'Independent', reward: 8500 },
  { target: 'NFT Marketplace Lead at WazirX', message: 'Launching NFT platform. Want guidance on NFT marketplace dynamics.', tags: ['Crypto, NFTs, & Web3', 'NFT', 'Marketplaces', 'Product'], organization: 'WazirX', reward: 8000 },
  { target: 'Web3 Community Builder', message: 'Growing Web3 community in India. Need community management expertise.', tags: ['Crypto, NFTs, & Web3', 'Community', 'Web3', 'Growth'], organization: 'Independent', reward: 7000 },
];

async function seedDemoData() {
  console.log('🌱 Starting demo data seeding...');

  try {
    // Step 0: Delete existing demo data
    console.log('\n🧹 Cleaning up existing demo data...');
    
    const { error: deleteOffersError } = await supabase
      .from('offers')
      .delete()
      .eq('is_demo', true);
    
    if (deleteOffersError) {
      console.log('Note: Error deleting demo offers (might be none):', deleteOffersError.message);
    } else {
      console.log('✅ Deleted existing demo offers');
    }
    
    const { error: deleteRequestsError } = await supabase
      .from('connection_requests')
      .delete()
      .eq('is_demo', true);
    
    if (deleteRequestsError) {
      console.log('Note: Error deleting demo requests (might be none):', deleteRequestsError.message);
    } else {
      console.log('✅ Deleted existing demo requests');
    }

    // Step 1: Create or fetch organizations
    console.log('\n📍 Setting up organizations...');
    const orgMap: Record<string, string> = {};
    
    for (const org of organizations) {
      // Check if organization already exists
      const { data: existing } = await supabase
        .from('organizations')
        .select('id')
        .eq('domain', org.domain)
        .single();

      if (existing) {
        orgMap[org.name] = existing.id;
        console.log(`✓ Organization "${org.name}" already exists`);
      } else {
        // Create organization
        const { data: created, error } = await supabase
          .from('organizations')
          .insert({
            name: org.name,
            domain: org.domain,
            logo_url: org.logo_url
          })
          .select('id')
          .single();

        if (created && !error) {
          orgMap[org.name] = created.id;
          console.log(`✅ Created organization "${org.name}"`);
        } else {
          console.log(`⚠️  Failed to create organization "${org.name}":`, error?.message);
        }
      }
    }

    // Step 2: Get all users to assign as creators
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .limit(10);

    if (usersError || !users || users.length === 0) {
      console.error('❌ Error fetching users or no users found:', usersError);
      console.log('⚠️  Please ensure you have at least one user in the database');
      return;
    }

    console.log(`\n✅ Found ${users.length} users to use as creators`);

    // Step 3: Seed demo offers
    console.log('\n📦 Seeding demo offers...');
    let offersCreated = 0;

    for (const offer of demoOffers) {
      const creator = users[Math.floor(Math.random() * users.length)];
      const connection = users[Math.floor(Math.random() * users.length)];
      const orgId = orgMap[offer.organization] || null;

      const { error: offerError } = await supabase
        .from('offers')
        .insert({
          offer_creator_id: creator.id,
          connection_user_id: connection.id,
          title: offer.title,
          description: offer.description,
          asking_price_inr: offer.price,
          asking_price_eur: Math.max(10, Math.round((offer.price / 90) * 100) / 100),
          currency: 'INR',
          status: 'active',
          approved_by_target: true,
          target_organization: offer.organization,
          target_position: offer.position,
          target_logo_url: organizations.find(o => o.name === offer.organization)?.logo_url,
          tags: JSON.stringify(offer.tags),
          is_demo: true
        });

      if (offerError) {
        console.error(`❌ Error creating offer "${offer.title}":`, offerError.message);
      } else {
        offersCreated++;
      }
    }

    console.log(`✅ Created ${offersCreated}/${demoOffers.length} demo offers`);

    // Step 4: Seed demo requests
    console.log('\n🎯 Seeding demo requests...');
    let requestsCreated = 0;

    for (const request of demoRequests) {
      const creator = users[Math.floor(Math.random() * users.length)];
      const shareableLink = uuidv4();
      const orgId = orgMap[request.organization] || null;

      const { error: requestError } = await supabase
        .from('connection_requests')
        .insert({
          creator_id: creator.id,
          target: request.target,
          message: request.message,
          reward: request.reward,
          credit_cost: Math.min(1000, Math.round(request.reward * 0.15)),
          status: 'active',
          shareable_link: shareableLink,
          target_organization_id: orgId,
          tags: JSON.stringify(request.tags),
          is_demo: true
        });

      if (requestError) {
        console.error(`❌ Error creating request "${request.target}":`, requestError.message);
      } else {
        requestsCreated++;
      }
    }

    console.log(`✅ Created ${requestsCreated}/${demoRequests.length} demo requests`);

    console.log('\n🎉 Demo data seeding complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Organizations: ${Object.keys(orgMap).length}`);
    console.log(`   - Offers: ${offersCreated}/${demoOffers.length}`);
    console.log(`   - Requests: ${requestsCreated}/${demoRequests.length}`);
    console.log(`   - Total: ${offersCreated + requestsCreated} items created`);

  } catch (error) {
    console.error('❌ Unexpected error during seeding:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the seeding
seedDemoData();
