import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

// Demo data templates by category - India-focused
const demoOffers = [
  // AI & Tech - Indian Context
  { title: 'Connect with AI Lead at Flipkart', description: 'Former colleague now heading AI/ML initiatives at Flipkart. Perfect for startups building AI solutions for e-commerce.', tags: ['AI', 'Artificial Intelligence', 'Machine Learning', 'E-Commerce'], category: 'AI', price: 15000 },
  { title: 'Intro to Zomato Tech Lead', description: 'Senior engineer at Zomato working on recommendation systems. Great for food-tech and marketplace startups.', tags: ['AI', 'Machine Learning', 'Technology', 'Food & Beverage'], category: 'AI', price: 12000 },
  { title: 'Meet Microsoft India AI Researcher', description: 'Research scientist at Microsoft India. Can help with ML model architecture and deployment at scale.', tags: ['AI', 'Research', 'Technology', 'CTO'], category: 'AI', price: 18000 },
  
  // Fundraising & VC - Indian Context
  { title: 'Pitch to Sequoia India Partner', description: 'Direct intro to investor at Sequoia India. They focus on early-stage B2B SaaS and consumer tech.', tags: ['Fundraising', 'Venture Capital', 'Investor', 'Seed', 'Startups'], category: 'Fundraising', price: 25000 },
  { title: 'Connect with Accel India Associate', description: 'Friend works at Accel India evaluating early-stage deals. Perfect for pre-seed to Series A startups.', tags: ['Fundraising', 'Venture Capital', 'Pre-Seed', 'Seed'], category: 'Fundraising', price: 20000 },
  { title: 'Meet Angel Investor (Multiple Exits)', description: 'Serial entrepreneur turned angel investor. Invested in 30+ Indian startups with 3 exits.', tags: ['Fundraising', 'Angel Investor', 'Entrepreneur', 'Startups'], category: 'Fundraising', price: 15000 },
  { title: 'Intro to Lightspeed Venture Partner', description: 'Partner at Lightspeed India. Focus on consumer tech and SaaS. Looking for Series B+ companies.', tags: ['Fundraising', 'Venture Capital', 'Growth', 'Scaling'], category: 'Fundraising', price: 30000 },
  
  // Fashion & Retail - Indian Context
  { title: 'Connect with Myntra Category Head', description: 'Category manager at Myntra handling fashion brands. Can help with online retail strategy.', tags: ['Fashion', 'Retail', 'E-Commerce', 'Branding'], category: 'Fashion', price: 12000 },
  { title: 'Meet Fashion Designer (Lakme Fashion Week)', description: 'Established designer who has showcased at LFW. Great for emerging fashion brand founders.', tags: ['Fashion', 'Design', 'Branding', 'Entrepreneur'], category: 'Fashion', price: 15000 },
  { title: 'Intro to Nykaa Beauty Buyer', description: 'Product buyer at Nykaa. Can help get beauty/skincare products listed on the platform.', tags: ['Beauty', 'Skincare', 'Retail', 'E-Commerce'], category: 'Fashion', price: 18000 },
  
  // E-Commerce & DTC - Indian Context
  { title: 'Meet Shopify Expert (Built 50+ Indian Stores)', description: 'E-commerce consultant who has helped Indian D2C brands scale to 8-figures.', tags: ['E-Commerce', 'Ecommerce', 'Growth', 'Direct-To-Consumer', 'Dtc'], category: 'E-Commerce', price: 10000 },
  { title: 'Connect with Amazon India Seller Expert', description: 'Former Amazon employee, now consultant. Helped 100+ brands succeed on Amazon India.', tags: ['E-Commerce', 'Amazon', 'Marketplaces', 'Commerce'], category: 'E-Commerce', price: 8000 },
  { title: 'Intro to Razorpay Product Manager', description: 'PM at Razorpay handling payment integrations. Perfect for fintech and e-commerce startups.', tags: ['E-Commerce', 'SaaS', 'Technology', 'Product', 'Finance'], category: 'E-Commerce', price: 12000 },
  
  // Marketing & Growth - Indian Context
  { title: 'Connect with Growth Hacker (10M+ Users)', description: 'Scaled multiple Indian consumer apps to 10M+ users. Expert in viral marketing and referrals.', tags: ['Viral Marketing', 'Marketing & Growth', 'User Acquisition', 'Growth'], category: 'Marketing', price: 15000 },
  { title: 'Meet Ex-Swiggy Growth Lead', description: 'Former Swiggy growth team member. Now advising startups on customer acquisition strategies.', tags: ['User Acquisition', 'Customer Acquisition', 'Growth', 'Marketing'], category: 'Marketing', price: 18000 },
  { title: 'Intro to Instagram Influencer (2M Followers)', description: 'Top Indian Instagram creator with 2M+ followers. Can help with influencer marketing campaigns.', tags: ['Influencer Marketing', 'Social Media Marketing', 'Instagram', 'Content Marketing'], category: 'Marketing', price: 20000 },
  
  // SaaS & B2B - Indian Context
  { title: 'Connect with Freshworks Enterprise Sales Lead', description: 'Senior AE at Freshworks. Expert in selling B2B SaaS to Indian and global enterprises.', tags: ['SaaS', 'B2B', 'Sales & Business Development', 'Enterprise'], category: 'SaaS', price: 12000 },
  { title: 'Meet Zoho Product Manager', description: 'PM at Zoho who has launched multiple successful products. Great for B2B SaaS product strategy.', tags: ['SaaS', 'Product Management', 'Product', 'B2B'], category: 'SaaS', price: 15000 },
  { title: 'Intro to Chargebee Co-founder', description: 'Co-founder of successful Indian SaaS unicorn. Can advise on building and scaling SaaS business.', tags: ['SaaS', 'Founder', 'Entrepreneur', 'Scaling'], category: 'SaaS', price: 25000 },
  
  // Food & Beverage - Indian Context
  { title: 'Connect with Cloud Kitchen Founder (10 Locations)', description: 'Built and scaled cloud kitchen brand across 10 Indian cities. Perfect for food entrepreneurs.', tags: ['Food', 'Food & Beverage', 'Entrepreneur', 'Operations'], category: 'Food', price: 12000 },
  { title: 'Meet Swiggy Restaurant Partnership Manager', description: 'Manages restaurant partnerships at Swiggy. Can help with listing and growth on food delivery apps.', tags: ['Food & Beverage', 'Partnerships', 'Operations', 'Marketplaces'], category: 'Food', price: 10000 },
  { title: 'Intro to Cafe Chain Founder (15 Outlets)', description: 'Successfully built cafe chain across Bangalore and Mumbai. Can guide on F&B expansion.', tags: ['Food & Beverage', 'Entrepreneur', 'Scaling', 'Retail'], category: 'Food', price: 15000 },
  
  // HealthTech & Wellness - Indian Context
  { title: 'Connect with Practo Medical Advisor', description: 'Doctor and medical advisor at Practo. Perfect for health-tech startups needing clinical insights.', tags: ['HealthTech', 'Medical', 'Healthcare', 'Technology'], category: 'HealthTech', price: 15000 },
  { title: 'Meet Cult.fit Product Designer', description: 'Designed fitness experiences at Cult.fit. Great for wellness and fitness app founders.', tags: ['Fitness', 'Wellness', 'Design', 'Product', 'Consumer Apps'], category: 'Wellness', price: 12000 },
  { title: 'Intro to PharmEasy Operations Head', description: 'Manages supply chain and operations at PharmEasy. Can help with healthcare logistics.', tags: ['HealthTech', 'Operations', 'Supply Chain', 'Healthcare'], category: 'HealthTech', price: 18000 },
  
  // Crypto & Web3 - Indian Context
  { title: 'Meet WazirX Blockchain Engineer', description: 'Building crypto infrastructure at WazirX. Perfect for Web3 and blockchain startups in India.', tags: ['Crypto, NFTs, & Web3', 'Blockchain', 'CTO', 'Engineering'], category: 'Crypto', price: 20000 },
  { title: 'Connect with Polygon Developer Advocate', description: 'Core team member at Polygon. Can help with Web3 development and ecosystem partnerships.', tags: ['Crypto, NFTs, & Web3', 'Blockchain', 'Solana', 'Developer'], category: 'Crypto', price: 25000 },
  { title: 'Intro to NFT Artist (India\'s Top 10)', description: 'One of India\'s leading NFT artists. Can help with NFT strategy and community building.', tags: ['Crypto, NFTs, & Web3', 'NFT', 'Art', 'Community'], category: 'Crypto', price: 18000 },
  
  // EdTech - Indian Context
  { title: 'Connect with Unacademy Content Head', description: 'Manages content strategy at Unacademy. Perfect for ed-tech founders building courses.', tags: ['Education', 'Content Marketing', 'Product', 'Startups'], category: 'EdTech', price: 15000 },
  { title: 'Meet BYJU\'S Growth Manager', description: 'Former growth team lead at BYJU\'S. Expert in ed-tech user acquisition and retention.', tags: ['Education', 'Growth', 'User Acquisition', 'Marketing'], category: 'EdTech', price: 18000 },
];

const demoRequests = [
  // AI & Tech - Indian Context
  { target: 'CTO at Series A AI/ML Startup', message: 'Building AI product for Indian SMBs. Need advice on ML infrastructure and cost optimization for Indian market.', tags: ['AI', 'CTO', 'Machine Learning', 'Startups'], category: 'AI', reward: 8000 },
  { target: 'Senior ML Engineer at Indian Tech Company', message: 'Looking to hire ML engineers. Want to understand best practices for building AI teams in India.', tags: ['AI', 'Machine Learning', 'Hiring & Managing', 'Technology'], category: 'AI', reward: 10000 },
  
  // Fundraising - Indian Context
  { target: 'VC Partner Focused on Indian Startups', message: 'Raising seed round for B2B SaaS. Looking for intros to investors backing Indian SaaS companies.', tags: ['Fundraising', 'Venture Capital', 'Seed', 'B2B', 'SaaS'], category: 'Fundraising', reward: 9500 },
  { target: 'Angel Investor in Consumer Tech', message: 'Building consumer app with 100K+ users. Need angels who understand Indian consumer market.', tags: ['Angel Investor', 'Consumer Apps', 'Fundraising', 'Startups'], category: 'Fundraising', reward: 9000 },
  { target: 'CFO at Indian Unicorn', message: 'Preparing for Series B. Need guidance on financial planning and unit economics from someone who scaled in India.', tags: ['CFO', 'Finance', 'Scaling', 'Fundraising'], category: 'Fundraising', reward: 8500 },
  
  // Marketing & Growth - Indian Context
  { target: 'Growth Lead at Top Indian Consumer App', message: 'Want to learn cost-effective growth strategies for Indian market. Looking for someone with 1M+ user growth experience.', tags: ['Marketing & Growth', 'User Acquisition', 'Growth'], category: 'Marketing', reward: 8000 },
  { target: 'Instagram/YouTube Influencer (500K+ Followers)', message: 'Launching D2C brand. Looking to collaborate with influencers for product launches in India.', tags: ['Influencer', 'Influencer Marketing', 'Social Media', 'Branding'], category: 'Marketing', reward: 10000 },
  { target: 'Performance Marketing Expert', message: 'Scaling Meta/Google ads for Indian market. Need expert who has optimized CAC for Indian D2C brands.', tags: ['Performance Marketing', 'Digital Marketing', 'Customer Acquisition'], category: 'Marketing', reward: 8000 },
  
  // Product - Indian Context
  { target: 'Product Manager at Flipkart/Amazon India', description: 'Building marketplace product. Need mentorship from PM who understands Indian e-commerce.', tags: ['Product Management', 'Product', 'E-Commerce', 'Marketplaces'], category: 'Product', reward: 8000 },
  { target: 'UX Designer with Consumer App Experience', message: 'Redesigning app for Tier 2/3 Indian cities. Need designer who understands vernacular users.', tags: ['User Experience (UX)', 'Design', 'Consumer Apps'], category: 'Product', reward: 7000 },
  
  // Fashion & Retail - Indian Context
  { target: 'D2C Fashion Brand Founder', message: 'Launching clothing brand for Indian market. Want to learn from successful D2C fashion entrepreneur.', tags: ['Fashion', 'Founder', 'Direct-To-Consumer', 'Branding'], category: 'Fashion', reward: 7500 },
  { target: 'Buyer at Major Indian Retailer', message: 'Have FMCG product. Need intro to buyer at Reliance/DMart/Big Bazaar for retail distribution.', tags: ['Retail', 'CPG', 'Merchandising', 'Distribution'], category: 'Fashion', reward: 9500 },
  
  // E-Commerce - Indian Context
  { target: 'E-Commerce Logistics Expert', message: 'Scaling to 1000+ orders/day. Need advice on last-mile delivery and warehousing in Indian cities.', tags: ['E-Commerce', 'Operations', 'Supply Chain', 'Logistics'], category: 'E-Commerce', reward: 7000 },
  { target: 'Amazon/Flipkart Seller with 10Cr+ Revenue', message: 'Want to scale on online marketplaces. Looking for successful seller who can guide on marketplace optimization.', tags: ['E-Commerce', 'Marketplaces', 'Growth', 'Amazon'], category: 'E-Commerce', reward: 8000 },
  
  // Food & Beverage - Indian Context
  { target: 'Cloud Kitchen Entrepreneur', message: 'Planning to start cloud kitchen in Bangalore. Need advice on operations, Swiggy/Zomato partnerships.', tags: ['Food & Beverage', 'Entrepreneur', 'Operations'], category: 'Food', reward: 6000 },
  { target: 'Food Brand Founder (Retail Distribution)', message: 'Launching packaged food brand. Need guidance on getting into retail stores across India.', tags: ['Food & Beverage', 'CPG', 'Retail', 'Distribution'], category: 'Food', reward: 8000 },
  
  // SaaS & B2B - Indian Context
  { target: 'B2B SaaS Founder (Indian Market)', message: 'Building sales team for B2B SaaS in India. Need mentorship on enterprise sales cycles and pricing.', tags: ['SaaS', 'B2B', 'Sales & Business Development', 'Founder'], category: 'SaaS', reward: 8000 },
  { target: 'Enterprise Sales Leader', message: 'Selling to Indian enterprises. Want to learn about procurement processes and deal closures in India.', tags: ['Sales & Business Development', 'Enterprise', 'B2B'], category: 'SaaS', reward: 7000 },
  
  // HealthTech - Indian Context
  { target: 'Digital Health Founder or Doctor', message: 'Building telemedicine platform for Tier 2/3 cities. Need regulatory guidance and go-to-market advice.', tags: ['HealthTech', 'Founder', 'Healthcare', 'Medical'], category: 'HealthTech', reward: 9000 },
  { target: 'Pharma Distribution Expert', message: 'Building medicine delivery startup. Need expertise in pharma supply chain and licensing in India.', tags: ['HealthTech', 'Operations', 'Supply Chain', 'Healthcare'], category: 'HealthTech', reward: 8000 },
  
  // EdTech - Indian Context
  { target: 'EdTech Founder (K-12 or Test Prep)', message: 'Launching online learning platform. Want advice from founder who has scaled ed-tech in India.', tags: ['Education', 'Founder', 'Startups', 'Product'], category: 'EdTech', reward: 9000 },
  { target: 'Content Creator for Educational Content', message: 'Building course platform. Need experienced educator/creator for content strategy.', tags: ['Education', 'Content Marketing', 'Creator', 'Product'], category: 'EdTech', reward: 6000 },
  
  // Crypto & Web3 - Indian Context
  { target: 'Web3 Developer or Blockchain Founder', message: 'Learning smart contract development. Want mentorship from Web3 builder familiar with Indian regulations.', tags: ['Crypto, NFTs, & Web3', 'Blockchain', 'Developer', 'Founder'], category: 'Crypto', reward: 7500 },
  { target: 'Crypto Exchange or DeFi Expert', message: 'Building DeFi product for Indian market. Need guidance on compliance and user education.', tags: ['Crypto, NFTs, & Web3', 'DeFi', 'Finance', 'Compliance'], category: 'Crypto', reward: 9500 },
  
  // Fintech - Indian Context
  { target: 'Fintech Founder or Product Manager', message: 'Building payment solution for Indian SMBs. Need product and regulatory guidance.', tags: ['Finance', 'Product', 'Startups', 'Technology'], category: 'Fintech', reward: 9000 },
  { target: 'Digital Lending Expert', message: 'Exploring NBFC license for lending product. Need advice on compliance and credit underwriting in India.', tags: ['Finance', 'Lending', 'Compliance', 'Operations'], category: 'Fintech', reward: 9500 },
];

async function seedDemoData() {
  console.log('🌱 Starting demo data seeding...');

  try {
    // Get all users to assign as creators
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .limit(10);

    if (usersError || !users || users.length === 0) {
      console.error('❌ Error fetching users or no users found:', usersError);
      console.log('⚠️  Please ensure you have at least one user in the database');
      return;
    }

    console.log(`✅ Found ${users.length} users to use as creators`);

    // Seed demo offers
    console.log('\n📦 Seeding demo offers...');
    let offersCreated = 0;

    for (const offer of demoOffers) {
      // Random user as creator
      const creator = users[Math.floor(Math.random() * users.length)];
      // Another random user as connection
      const connection = users[Math.floor(Math.random() * users.length)];

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
          approved_by_target: true, // Auto-approve demo offers
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

    // Seed demo requests
    console.log('\n🎯 Seeding demo requests...');
    let requestsCreated = 0;

    for (const request of demoRequests) {
      const creator = users[Math.floor(Math.random() * users.length)];
      const shareableLink = uuidv4();

      const { error: requestError } = await supabase
        .from('connection_requests')
        .insert({
          creator_id: creator.id,
          target: request.target,
          message: request.message,
          reward: request.reward,
          credit_cost: Math.min(1000, Math.round(request.reward * 0.15)), // 15% of reward as credit cost, max 1000
          status: 'active',
          shareable_link: shareableLink,
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
