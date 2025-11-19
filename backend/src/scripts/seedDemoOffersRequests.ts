import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

// Demo data templates by category
const demoOffers = [
  // AI & Tech
  { title: 'Connect with Head of AI at OpenAI', description: 'Get introduced to my former colleague who now leads AI research. Perfect for AI startups looking for guidance.', tags: ['AI', 'Artificial Intelligence', 'Machine Learning', 'Startups', 'CTO'], category: 'AI', price: 500 },
  { title: 'Intro to Google DeepMind Researcher', description: 'My friend works on cutting-edge ML models. Great for technical discussions and collaboration.', tags: ['AI', 'Machine Learning', 'Research', 'Technology'], category: 'AI', price: 600 },
  { title: 'Meet Meta AI Product Manager', description: 'Former Meta PM who shipped major AI features. Can help with product-market fit.', tags: ['AI', 'Product Management', 'Product', 'Product Market Fit'], category: 'AI', price: 450 },
  
  // Fundraising & VC
  { title: 'Pitch to Sequoia Capital Partner', description: 'Direct intro to my mentor at Sequoia. They invest in early-stage B2B SaaS.', tags: ['Fundraising', 'Venture Capital', 'Investor', 'Seed', 'B2B'], category: 'Fundraising', price: 1000 },
  { title: 'Connect with a16z Angel Investor', description: 'Former Andreessen Horowitz partner now angel investing in crypto and web3.', tags: ['Fundraising', 'Angel Investor', 'Crypto, NFTs, & Web3', 'Blockchain'], category: 'Fundraising', price: 800 },
  { title: 'Meet Y Combinator Alum (3x Founder)', description: 'Serial entrepreneur who went through YC. Great for pre-seed advice.', tags: ['Fundraising', 'Pre-Seed', 'Entrepreneur', 'Startups', 'Founder'], category: 'Fundraising', price: 400 },
  { title: 'Intro to Tiger Global Investment Team', description: 'Friend works in growth equity. Perfect for Series B+ companies.', tags: ['Fundraising', 'Venture Capital', 'Growth', 'Scaling'], category: 'Fundraising', price: 1200 },
  
  // Fashion & Beauty
  { title: 'Connect with Vogue Editor', description: 'Senior editor at Vogue who covers emerging designers. Great for PR and exposure.', tags: ['Fashion', 'Media', 'PR', 'Public Relations', 'Editor'], category: 'Fashion', price: 700 },
  { title: 'Meet Ex-LVMH Brand Director', description: 'Former luxury brand leader. Can advise on premium positioning and retail.', tags: ['Fashion', 'Retail', 'Branding', 'Direct-To-Consumer'], category: 'Fashion', price: 800 },
  { title: 'Intro to Celebrity Stylist (A-List Clients)', description: 'Works with major celebrities. Perfect for brand visibility.', tags: ['Fashion', 'Stylist', 'Influencer Marketing', 'Personal Branding'], category: 'Fashion', price: 900 },
  { title: 'Connect with Sephora Buyer', description: 'Product buyer at Sephora. Can help get beauty products into retail.', tags: ['Beauty', 'Skincare', 'Retail', 'E-Commerce'], category: 'Fashion', price: 650 },
  
  // E-Commerce & DTC
  { title: 'Meet Shopify Plus Growth Expert', description: 'Former Shopify employee who scaled multiple 8-figure stores.', tags: ['E-Commerce', 'Ecommerce', 'Growth', 'Direct-To-Consumer', 'Dtc'], category: 'E-Commerce', price: 500 },
  { title: 'Connect with Amazon FBA Consultant', description: 'Expert in Amazon marketplace. Helped 100+ brands launch successfully.', tags: ['E-Commerce', 'Amazon', 'Marketplaces', 'Commerce'], category: 'E-Commerce', price: 400 },
  { title: 'Intro to Stripe Product Lead', description: 'Friend manages payments infrastructure at Stripe. Great for technical integrations.', tags: ['E-Commerce', 'Stripe', 'SaaS', 'Technology', 'Product'], category: 'E-Commerce', price: 600 },
  
  // Marketing & Growth
  { title: 'Connect with Viral Marketing Expert', description: 'Created campaigns with 100M+ impressions. Perfect for consumer brands.', tags: ['Viral Marketing', 'Marketing & Growth', 'Performance Marketing', 'Social Media'], category: 'Marketing', price: 550 },
  { title: 'Meet Ex-Facebook Growth Team Lead', description: 'Built growth systems at Facebook. Now advises startups on user acquisition.', tags: ['User Acquisition', 'Customer Acquisition', 'Growth', 'Marketing'], category: 'Marketing', price: 750 },
  { title: 'Intro to TikTok Influencer Manager', description: 'Manages top creators with 50M+ followers. Can help with influencer campaigns.', tags: ['Influencer Marketing', 'Social Media Marketing', 'TikTok', 'Content Marketing'], category: 'Marketing', price: 500 },
  
  // SaaS & B2B
  { title: 'Connect with Salesforce Enterprise AE', description: 'Top enterprise sales rep. Can teach B2B sales strategies.', tags: ['SaaS', 'B2B', 'Sales & Business Development', 'Enterprise'], category: 'SaaS', price: 500 },
  { title: 'Meet HubSpot Product Marketing Lead', description: 'PMM who launched major features. Perfect for GTM strategy.', tags: ['SaaS', 'Product Marketing', 'Go-To-Market', 'GTM', 'B2B'], category: 'SaaS', price: 600 },
  { title: 'Intro to Atlassian VP of Engineering', description: 'Engineering leader managing 200+ developers. Great for technical architecture.', tags: ['SaaS', 'CTO', 'Software Engineer', 'Technology', 'Engineering'], category: 'SaaS', price: 850 },
  
  // Food & Beverage
  { title: 'Connect with Michelin Star Chef', description: 'Award-winning chef who launched food brand. Perfect for CPG startups.', tags: ['Food', 'Food & Beverage', 'CPG', 'Consumer Product Goods (CPG)', 'Entrepreneur'], category: 'Food', price: 700 },
  { title: 'Meet DoorDash Restaurant Partnership Lead', description: 'Manages top restaurant partnerships. Can help scale delivery.', tags: ['Food & Beverage', 'Partnerships', 'Operations', 'Marketplaces'], category: 'Food', price: 500 },
  
  // HealthTech & Wellness
  { title: 'Intro to Teladoc Chief Medical Officer', description: 'CMO with deep healthcare expertise. Perfect for health startups.', tags: ['HealthTech', 'Medical', 'Healthcare', 'Technology'], category: 'HealthTech', price: 900 },
  { title: 'Connect with Peloton Product Designer', description: 'Designed fitness experiences for millions. Great for wellness apps.', tags: ['Fitness', 'Wellness', 'Design', 'Product', 'Consumer Apps'], category: 'Wellness', price: 550 },
  
  // Crypto & Web3
  { title: 'Meet Coinbase Engineering Director', description: 'Building crypto infrastructure at scale. Great for blockchain startups.', tags: ['Crypto, NFTs, & Web3', 'Bitcoin', 'Blockchain', 'CTO', 'Engineering'], category: 'Crypto', price: 800 },
  { title: 'Connect with NFT Artist (7-Figure Sales)', description: 'Top NFT creator. Can help with digital art strategy and community.', tags: ['Crypto, NFTs, & Web3', 'NFT', 'Art', 'Community', 'Creator'], category: 'Crypto', price: 700 },
  { title: 'Intro to Solana Foundation Developer', description: 'Core contributor to Solana ecosystem. Perfect for Web3 builders.', tags: ['Crypto, NFTs, & Web3', 'Solana', 'Blockchain', 'Developer'], category: 'Crypto', price: 650 },
  
  // Climate & Sustainability  
  { title: 'Connect with Tesla Energy Product Lead', description: 'Leading sustainable energy initiatives. Great for climate tech.', tags: ['Clean Energy', 'Sustainability', 'Climate Tech', 'Product', 'Tesla'], category: 'Climate', price: 750 },
  { title: 'Meet Carbon Offset Platform Founder', description: 'Built successful climate startup. Can advise on green tech.', tags: ['Climate Tech', 'Sustainability', 'Founder', 'Startups'], category: 'Climate', price: 600 },
];

const demoRequests = [
  // AI & Tech
  { target: 'Chief Technology Officer at a Series B AI Startup', message: 'Looking to connect with a technical leader who has scaled AI products. Need advice on ML infrastructure.', tags: ['AI', 'CTO', 'Machine Learning', 'Startups', 'Scaling'], category: 'AI', reward: 300 },
  { target: 'AI Researcher at Google or Meta', message: 'Seeking introduction to someone working on LLMs or computer vision. Want to explore research collaboration.', tags: ['AI', 'Artificial Intelligence', 'Research', 'Machine Learning'], category: 'AI', reward: 400 },
  
  // Fundraising
  { target: 'Venture Capital Partner (Pre-Seed to Seed)', message: 'Raising our first institutional round for B2B SaaS. Looking for intros to investors focused on early-stage enterprise.', tags: ['Fundraising', 'Venture Capital', 'Pre-Seed', 'Seed', 'B2B', 'SaaS'], category: 'Fundraising', reward: 500 },
  { target: 'Angel Investor in Consumer Apps', message: 'Building social app with strong traction. Need angels who understand consumer mobile.', tags: ['Angel Investor', 'Consumer Apps', 'Social Apps', 'Fundraising'], category: 'Fundraising', reward: 350 },
  { target: 'CFO at Late-Stage Startup (Series C+)', message: 'Need advice on financial planning for our Series B. Looking for someone who has been through this.', tags: ['CFO', 'Finance', 'Scaling', 'Fundraising'], category: 'Fundraising', reward: 400 },
  
  // Marketing & Growth
  { target: 'Growth Marketing Leader at Fast-Growing Startup', message: 'Want to learn acquisition strategies from someone who has scaled to millions of users.', tags: ['Marketing & Growth', 'User Acquisition', 'Growth', 'Marketing'], category: 'Marketing', reward: 300 },
  { target: 'Viral Content Creator or Influencer', message: 'Looking to collaborate with creator who has built audience of 500K+. Interested in content partnerships.', tags: ['Influencer', 'Influencer Marketing', 'Viral Marketing', 'Social Media'], category: 'Marketing', reward: 400 },
  { target: 'Head of Performance Marketing at E-Commerce Brand', message: 'Need expert in paid acquisition for DTC. Want to optimize our CAC.', tags: ['Performance Marketing', 'E-Commerce', 'Customer Acquisition', 'Direct-To-Consumer'], category: 'Marketing', reward: 350 },
  
  // Product
  { target: 'Product Manager at Top Tech Company (FAANG)', message: 'Seeking mentorship from experienced PM. Building first product and need guidance on roadmap.', tags: ['Product Management', 'Product', 'Product Roadmapping', 'Mentor'], category: 'Product', reward: 300 },
  { target: 'UX Designer with Enterprise SaaS Experience', message: 'Redesigning our B2B platform. Need design expertise for complex workflows.', tags: ['User Experience (UX)', 'Design', 'SaaS', 'B2B'], category: 'Product', reward: 350 },
  
  // Fashion & Retail
  { target: 'Fashion Brand Founder or Designer', message: 'Launching clothing line. Want to learn from someone who has built successful fashion brand.', tags: ['Fashion', 'Founder', 'Branding', 'Retail'], category: 'Fashion', reward: 300 },
  { target: 'Buyer at Major Retailer (Target, Walmart, etc.)', message: 'Have CPG product ready for retail. Need intro to buyer who can get us on shelves.', tags: ['Retail', 'CPG', 'Target', 'Walmart', 'Merchandising'], category: 'Fashion', reward: 500 },
  
  // E-Commerce
  { target: 'E-Commerce Operations Expert', message: 'Scaling fulfillment to 10K orders/month. Need advice on logistics and supply chain.', tags: ['E-Commerce', 'Operations', 'Supply Chain', 'Scaling'], category: 'E-Commerce', reward: 300 },
  { target: 'Shopify App Developer', message: 'Want to build custom integrations for our store. Looking for technical expert in Shopify ecosystem.', tags: ['E-Commerce', 'Shopify', 'Software Engineer', 'Developer'], category: 'E-Commerce', reward: 350 },
  
  // Food & Beverage
  { target: 'Restaurant Owner or Chef', message: 'Opening cloud kitchen. Want advice from someone who has operated successful food business.', tags: ['Food & Beverage', 'Restaurant', 'Entrepreneur', 'Operations'], category: 'Food', reward: 250 },
  { target: 'Food & Beverage Brand Founder', message: 'Launching beverage brand. Need guidance on distribution and retail strategy.', tags: ['Food & Beverage', 'CPG', 'Founder', 'Retail', 'Direct-To-Consumer'], category: 'Food', reward: 350 },
  
  // Sales & Business Development
  { target: 'Enterprise Sales Leader', message: 'Building sales team for B2B SaaS. Need mentorship on hiring and structuring sales org.', tags: ['Sales & Business Development', 'SaaS', 'B2B', 'Hiring & Managing'], category: 'Sales', reward: 350 },
  { target: 'Business Development Manager at Tech Company', message: 'Looking to form strategic partnerships. Want to learn from experienced BD professional.', tags: ['Business Development', 'Partnerships', 'Strategy', 'Business Strategy'], category: 'Sales', reward: 300 },
  
  // HealthTech & Wellness
  { target: 'Digital Health Founder or Executive', message: 'Building telemedicine platform. Need regulatory and product advice from healthcare expert.', tags: ['HealthTech', 'Founder', 'Healthcare', 'Medical'], category: 'HealthTech', reward: 400 },
  { target: 'Fitness or Wellness Coach', message: 'Developing wellness app. Want to partner with certified trainer for content.', tags: ['Fitness', 'Wellness', 'Trainer', 'Coach'], category: 'Wellness', reward: 250 },
  
  // Crypto & Web3
  { target: 'Blockchain Developer or Web3 Founder', message: 'Learning smart contract development. Want mentorship from experienced Web3 builder.', tags: ['Crypto, NFTs, & Web3', 'Blockchain', 'Founder', 'Developer'], category: 'Crypto', reward: 350 },
  { target: 'Crypto Exchange Executive', message: 'Building DeFi protocol. Need intro to exchange for listing discussions.', tags: ['Crypto, NFTs, & Web3', 'DeFi', 'Business Development', 'Partnerships'], category: 'Crypto', reward: 500 },
  
  // Media & Entertainment
  { target: 'Podcast Host or Producer', message: 'Launching podcast network. Want advice on monetization and growth from successful creator.', tags: ['Podcast', 'Media', 'Content Marketing', 'Monetizing A Podcast'], category: 'Media', reward: 300 },
  { target: 'Film or Content Producer', message: 'Producing documentary series. Need production expertise and funding connections.', tags: ['Filmmaking', 'Producer', 'Media', 'Entertainment'], category: 'Media', reward: 400 },
  
  // Climate Tech
  { target: 'Climate Tech Founder or Investor', message: 'Building carbon capture solution. Need intros to climate-focused VCs.', tags: ['Climate Tech', 'Clean Energy', 'Sustainability', 'Fundraising'], category: 'Climate', reward: 450 },
  { target: 'Sustainability Consultant', message: 'Want to make business more sustainable. Looking for expert to audit operations.', tags: ['Sustainability', 'Consulting', 'Operations', 'Business Strategy'], category: 'Climate', reward: 300 },
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
          asking_price_eur: Math.round((offer.price / 90) * 100) / 100,
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
          credit_cost: Math.round(request.reward * 0.3), // 30% of reward as credit cost
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

