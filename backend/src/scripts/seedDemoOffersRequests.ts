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
