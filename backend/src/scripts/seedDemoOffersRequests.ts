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
];

const demoRequests = [
  { target: 'CTO at Series A AI/ML Startup', message: 'Building AI product for Indian SMBs. Need advice on ML infrastructure and cost optimization for Indian market.', tags: ['AI', 'CTO', 'Machine Learning', 'Startups'], organization: 'Google', reward: 8000 },
  { target: 'Senior ML Engineer at Indian Tech Company', message: 'Looking to hire ML engineers. Want to understand best practices for building AI teams in India.', tags: ['AI', 'Machine Learning', 'Hiring & Managing', 'Technology'], organization: 'Meta', reward: 9000 },
  
  { target: 'VC Partner Focused on Indian Startups', message: 'Raising seed round for B2B SaaS. Looking for intros to investors backing Indian SaaS companies.', tags: ['Fundraising', 'Venture Capital', 'Seed', 'B2B', 'SaaS'], organization: 'Sequoia India', reward: 9500 },
  { target: 'Angel Investor in Consumer Tech', message: 'Building consumer app with 100K+ users. Need angels who understand Indian consumer market.', tags: ['Angel Investor', 'Consumer Apps', 'Fundraising', 'Startups'], organization: 'Accel India', reward: 9000 },
  { target: 'CFO at Indian Unicorn', message: 'Preparing for Series B. Need guidance on financial planning and unit economics from someone who scaled in India.', tags: ['CFO', 'Finance', 'Scaling', 'Fundraising'], organization: 'Flipkart', reward: 8500 },
  
  { target: 'Growth Lead at Top Indian Consumer App', message: 'Want to learn cost-effective growth strategies for Indian market. Looking for someone with 1M+ user growth experience.', tags: ['Marketing & Growth', 'User Acquisition', 'Growth'], organization: 'Swiggy', reward: 8000 },
  { target: 'Instagram/YouTube Influencer (500K+ Followers)', message: 'Launching D2C brand. Looking to collaborate with influencers for product launches in India.', tags: ['Influencer', 'Influencer Marketing', 'Social Media', 'Branding'], organization: 'Independent', reward: 9000 },
  { target: 'Performance Marketing Expert', message: 'Scaling Meta/Google ads for Indian market. Need expert who has optimized CAC for Indian D2C brands.', tags: ['Performance Marketing', 'Digital Marketing', 'Customer Acquisition'], organization: 'Paytm', reward: 8000 },
  
  { target: 'Product Manager at Flipkart/Amazon India', message: 'Building marketplace product. Need mentorship from PM who understands Indian e-commerce.', tags: ['Product Management', 'Product', 'E-Commerce', 'Marketplaces'], organization: 'Amazon India', reward: 8000 },
  { target: 'UX Designer with Consumer App Experience', message: 'Redesigning app for Tier 2/3 Indian cities. Need designer who understands vernacular users.', tags: ['User Experience (UX)', 'Design', 'Consumer Apps'], organization: 'Ola', reward: 7000 },
  
  { target: 'D2C Fashion Brand Founder', message: 'Launching clothing brand for Indian market. Want to learn from successful D2C fashion entrepreneur.', tags: ['Fashion', 'Founder', 'Direct-To-Consumer', 'Branding'], organization: 'Myntra', reward: 7500 },
  { target: 'Buyer at Major Indian Retailer', message: 'Have FMCG product. Need intro to buyer at Reliance/DMart/Big Bazaar for retail distribution.', tags: ['Retail', 'CPG', 'Merchandising', 'Distribution'], organization: 'Amazon India', reward: 9500 },
  
  { target: 'E-Commerce Logistics Expert', message: 'Scaling to 1000+ orders/day. Need advice on last-mile delivery and warehousing in Indian cities.', tags: ['E-Commerce', 'Operations', 'Supply Chain', 'Logistics'], organization: 'Flipkart', reward: 7000 },
  { target: 'Amazon/Flipkart Seller with 10Cr+ Revenue', message: 'Want to scale on online marketplaces. Looking for successful seller who can guide on marketplace optimization.', tags: ['E-Commerce', 'Marketplaces', 'Growth', 'Amazon'], organization: 'Amazon India', reward: 8000 },
  
  { target: 'Cloud Kitchen Entrepreneur', message: 'Planning to start cloud kitchen in Bangalore. Need advice on operations, Swiggy/Zomato partnerships.', tags: ['Food & Beverage', 'Entrepreneur', 'Operations'], organization: 'Swiggy', reward: 6000 },
  { target: 'Food Brand Founder (Retail Distribution)', message: 'Launching packaged food brand. Need guidance on getting into retail stores across India.', tags: ['Food & Beverage', 'CPG', 'Retail', 'Distribution'], organization: 'Zomato', reward: 8000 },
  
  { target: 'B2B SaaS Founder (Indian Market)', message: 'Building sales team for B2B SaaS in India. Need mentorship on enterprise sales cycles and pricing.', tags: ['SaaS', 'B2B', 'Sales & Business Development', 'Founder'], organization: 'Freshworks', reward: 8000 },
  { target: 'Enterprise Sales Leader', message: 'Selling to Indian enterprises. Want to learn about procurement processes and deal closures in India.', tags: ['Sales & Business Development', 'Enterprise', 'B2B'], organization: 'Zoho', reward: 7000 },
  
  { target: 'Digital Health Founder or Doctor', message: 'Building telemedicine platform for Tier 2/3 cities. Need regulatory guidance and go-to-market advice.', tags: ['HealthTech', 'Founder', 'Healthcare', 'Medical'], organization: 'Practo', reward: 9000 },
  { target: 'Pharma Distribution Expert', message: 'Building medicine delivery startup. Need expertise in pharma supply chain and licensing in India.', tags: ['HealthTech', 'Operations', 'Supply Chain', 'Healthcare'], organization: 'PharmEasy', reward: 8000 },
  
  { target: 'EdTech Founder (K-12 or Test Prep)', message: 'Launching online learning platform. Want advice from founder who has scaled ed-tech in India.', tags: ['Education', 'Founder', 'Startups', 'Product'], organization: 'BYJU\'S', reward: 9000 },
  { target: 'Content Creator for Educational Content', message: 'Building course platform. Need experienced educator/creator for content strategy.', tags: ['Education', 'Content Marketing', 'Creator', 'Product'], organization: 'Unacademy', reward: 6000 },
  
  { target: 'Web3 Developer or Blockchain Founder', message: 'Learning smart contract development. Want mentorship from Web3 builder familiar with Indian regulations.', tags: ['Crypto, NFTs, & Web3', 'Blockchain', 'Developer', 'Founder'], organization: 'WazirX', reward: 7500 },
  { target: 'Crypto Exchange or DeFi Expert', message: 'Building DeFi product for Indian market. Need guidance on compliance and user education.', tags: ['Crypto, NFTs, & Web3', 'DeFi', 'Finance', 'Compliance'], organization: 'Polygon', reward: 9500 },
  
  { target: 'Fintech Founder or Product Manager', message: 'Building payment solution for Indian SMBs. Need product and regulatory guidance.', tags: ['Finance', 'Product', 'Startups', 'Technology'], organization: 'Razorpay', reward: 9000 },
  { target: 'Digital Lending Expert', message: 'Exploring NBFC license for lending product. Need advice on compliance and credit underwriting in India.', tags: ['Finance', 'Lending', 'Compliance', 'Operations'], organization: 'Paytm', reward: 9500 },
];

async function seedDemoData() {
  console.log('🌱 Starting demo data seeding...');

  try {
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
