-- FORUM SEED DATA: Indian Founders 2025
-- Run this AFTER migrations 102, 103, 104
-- 50 Projects, 1200 Posts, ~5000 Comments

DO $$
DECLARE
  comm_bip UUID;
  comm_fail UUID;
  comm_wins UUID;
  comm_network UUID;
  usr UUID[];
  proj UUID[];
  post_id UUID;
  i INT; j INT; k INT;
  rand_val INT;
  
  -- Only allowed emojis
  emojis TEXT[] := ARRAY['❤️','🔥','🚀','💯','🙌','🤝','💸','👀'];
  quicks TEXT[] := ARRAY['can_intro','paid_intro','watching','ship_it','dm_me'];
  
  -- BUILD IN PUBLIC UPDATES
  bip_updates TEXT[] := ARRAY[
    'Finally crossed ₹8L MRR. It took 14 months of grinding. Organic growth is kicking in.',
    'Aaj 58 new signups aaye without ads. Content marketing on LinkedIn is working better than FB ads.',
    'Shipped the new dashboard. Code quality is trash but it works. Refactor later.',
    'Integrated WhatsApp API. Open rates jumped to 92%. Indian users love WhatsApp updates.',
    'Spent 4 hours fixing a Razorpay webhook bug. Documentation was outdated.',
    'Server crash ho gaya tha raat ko. AWS bill is giving me anxiety. 6 hours downtime.',
    'Hired our first sales guy today in Gurgaon. Commission only model.',
    'Churn rate dropped from 12% to 4% after we added the Pause Subscription feature.',
    'Bhai, B2B sales in India is tough. 40 meetings, 1 conversion.',
    'Automated the invoicing flow using Zoho Books API. Saved 10 hours a week.',
    'Just pushed the Android build to Play Store. Review time is taking forever.',
    'Customer support load is crazy. Thinking of implementing an AI chatbot.',
    'Finally got verified on WhatsApp Business API. The green tick helps with trust.',
    'Migrated from Vercel to AWS EC2 to save costs. $400/mo -> $80/mo.',
    'Cold emailing US clients now. Response rate is low but deal size is 5x.',
    'Day 45 of coding straight. Burnout hit hard today. Taking a Sunday off.',
    'Refactored the entire backend from Node to Go. Latency dropped by 40ms.',
    'Got featured in a small newsletter. Traffic spiked by 300% for 2 hours.',
    'User retention analysis showed that users who onboard via Google Auth stay 2x longer.',
    'Fixed a critical auth bug where users were getting logged out randomly.',
    'Trying to crack SEO for payroll software india. Competitors have high DA.',
    'Added UPI recurring payments via Razorpay. Game changer for retention.',
    'A competitor just copied our exact landing page copy. Flattered and annoyed.',
    'Internal dashboard for operations team is live. No more Google Sheets chaos.',
    'Spent the whole day optimizing SQL queries. Postgres CPU usage down to 20%.',
    'Launching a referral program. Give 500, Get 500. Hope it doesnt get abused.',
    'Just fired a freelancer who ghosted us for 2 weeks. Hard lesson learned.',
    'Working on a mobile-first redesign. 85% of our traffic is mobile.',
    'Tier-2 city usage is growing fast. Need to add vernacular language support.',
    'Designing a new pricing page. Trying to upsell the annual plan aggressively.'
  ];
  
  -- NETWORK ASKS
  network_asks TEXT[] := ARRAY[
    'Does anyone have a contact at Peak XV (Surge)? We are ready for Seed.',
    'Looking for a payment gateway for high-risk category (Gaming). Razorpay blocked us.',
    'Need an intro to Cred engineering team. Building a similar credit scoring engine.',
    'Koi achha CA hai Gurgaon mein for startup compliance? Current wala loot raha hai.',
    'Looking for a co-founder (Tech). Must know Next.js + Supabase. Equity generous.',
    'Anyone used Upside? Is it better than AngelList for rolling funds?',
    'Need intro to founders in the D2C space. Coffee is on me in Indiranagar.',
    'RBI compliance consultant chahiye. Fintech regulation is killing us.',
    'Any leads on hiring good Flutter devs? Naukri is full of spam.',
    'Who is the best person to talk to at Zerodha Rainmatter?',
    'Need a lawyer who understands SaaS contracts for US clients.',
    'Anyone used Deel for hiring remote devs? Is it worth the cost?',
    'Looking for a growth hacker who understands Reddit marketing.',
    'Kisi ka contact hai HDFC startup banking division mein?',
    'Need advice on ESOP pool size for early employees. 10% or 15%?',
    'Looking for office space in HSR Layout. 10 seater. Budget tight.',
    'Anyone here applied to YC recently? Want to review applications?',
    'Need a reliable SMS gateway provider. Twilio is too expensive for India.',
    'Looking for intro to procurement head at Swiggy/Zomato.',
    'Co-founder conflict. Need a mediator or advice on how to handle exit.',
    'Best agency for performance marketing D2C? Burned hands with 2 agencies.',
    'Any founders in Mumbai want to meetup this Saturday?',
    'Looking for a UI/UX designer who can do dark mode aesthetics well.',
    'Does anyone know how to register for ONDC as a seller app?',
    'Need help with cloud credits. AWS activate reject ho gaya.'
  ];
  
  -- WIN STORIES
  win_stories TEXT[] := ARRAY[
    'Closed our Seed round! $1.2M at $10M val. 4 months of hell, 60 rejections.',
    'Hit 1 Cr ARR today! Fully bootstrapped. No VC money, no dilution.',
    'Got our first Enterprise client (Tata Group). PoC signed for 15L.',
    'Profitable for 3 months straight. Burn rate is 0. Feels good man.',
    'Launched on Product Hunt, #3 Product of the Day. 400 signups in 24 hours.',
    'Acquired a smaller competitor today. Consolidation time.',
    'Finally paid myself a market salary after 2 years. Mom is happy.',
    '10,000 active users on the app. Retention is holding steady at 45%.',
    'Just crossed 1M API requests per day. Scaling issues are a good problem.',
    'Featured in TechCrunch! Inbound leads are flooding in.',
    'Signed a partnership with a major bank. Distribution problem solved.',
    'Got into Y Combinator W25 batch! Flying to SF next month.',
    'Our app is trending #1 in Finance category on Play Store India.',
    'Hired our dream CTO. She is ex-Uber and ex-Amazon.',
    'Client ne 1 year upfront pay kar diya. Cashflow sorted for now.',
    'Crossed 50k Instagram followers for our D2C brand. Organic reach is crazy.',
    'Reduced server costs by 60% by optimizing images. Big win for margins.',
    'Our B2B churn rate hit 0% last quarter. PMF feels close.'
  ];
  
  -- FAILURE STORIES
  fail_stories TEXT[] := ARRAY[
    'Shutting down operations today. Ran out of runway. Market wasnt ready.',
    'Co-founder dispute destroyed the company. Spent more time fighting than building.',
    'Google Maps API bill came in at $4k overnight. Didnt cache properly.',
    'Lost our biggest client (40% of revenue) to a cheaper competitor.',
    'Regulatory ban hit us hard. Pivot or die situation.',
    'Hired too fast. Had to lay off 5 people today. Worst day ever.',
    'Product was great, distribution was zero. Built in a silo for 6 months.',
    'We spent 50 Lakhs on ads with negative ROI. Burned cash like idiots.',
    'VC pulled the term sheet at the last minute. Due diligence failed.',
    'Server got hacked. Database wiped. Backups were 1 week old. Nightmare.',
    'My health took a toll. Ignoring sleep for 2 years caught up with me.',
    'We built a feature nobody wanted. 3 months of dev time wasted.',
    'Apple App Store rejected our app for the 5th time.',
    'Our IP got stolen by a vendor. Legal battle is too expensive.',
    'Failed to raise Series A. Down round or shutdown? Tough choice.'
  ];
  
  -- LESSONS LEARNED
  lessons TEXT[] := ARRAY[
    'Lesson 1: Dont hire before PMF. Lesson 2: Trust your gut on co-founders. Lesson 3: Cash is king.',
    'Never outsource your core tech. We learned this the hard way.',
    'Distribution > Product. A mediocre product with great distribution wins.',
    'Charge more from day 1. We underpriced for 18 months.',
    'Hire slow, fire fast. We did the opposite and paid the price.'
  ];

  -- PROJECT NAMES
  proj_names TEXT[] := ARRAY[
    'VyaparBook', 'Dukaandar AI', 'QuickSalary', 'ChaiGPT', 'DesiCRM',
    'RentFlow', 'ExamPrep.ai', 'FitIndia D2C', 'LegalEase', 'TruckLogistics',
    'KiranaTech', 'WeddingPlanr', 'MediBook', 'AgriConnect', 'CreditLoop',
    'SkillUp Vernacular', 'RemoteHiring', 'BillSnap', 'SocietyGate', 'EV ChargeGrid',
    'PetCare India', 'GoldLoan Aggregator', 'SaaS Insider', 'CreatorStack', 'StockTips AI',
    'HomeChef Delivery', 'LocalServices', 'CryptoTax India', 'Interiors AR', 'AutoRickshaw Ads',
    'SolarRoof', 'WaterMeter IoT', 'WasteManage', 'GigWorker Insure', 'UsedCar Check',
    'Ayurveda D2C', 'Jewelry TryOn', 'SareeGlobal', 'LocalNews AI', 'SportsBooking',
    'GymManage', 'SalonBook', 'TiffinService', 'PG Finder', 'Coding for Kids',
    'GovtScheme Finder', 'TaxSaver', 'InfluencerGraph', 'PodcastEdits', 'ResumeReview AI'
  ];
  
  -- COMMENTS
  comments TEXT[] := ARRAY[
    'Bhai sahi hai!', 'Scene kya hai investment ka?', 'Congrats bhai, party kab?',
    'Intro DM kar diya hai, check kar lo.', 'Valid point. India mein yehi chalta hai.',
    'Tech stack kya use kar rahe ho?', 'Crazy numbers bro', 'Sorted hai.',
    'Bhai thoda guide kar do DM mein.', 'Legend', 'Keep shipping bhai.',
    'Nice, but CAC kya aa raha hai?', 'Ye feature toh humne bhi socha tha.',
    'Payment gateway kaunsa use kar rahe ho?', 'Solo founder ho ya team hai?',
    'Bhai thoda dhyan rakho, competitors copy karenge.', 'Linkedin pe post karo.',
    'Growth hack badiya hai.', 'Revenue verify kiya kya?', 'Funding uthane ka plan hai?',
    'All the best bro.'
  ];

BEGIN
  -- Get community IDs
  SELECT id INTO comm_bip FROM forum_communities WHERE slug = 'build-in-public';
  SELECT id INTO comm_fail FROM forum_communities WHERE slug = 'failures';
  SELECT id INTO comm_wins FROM forum_communities WHERE slug = 'wins';
  SELECT id INTO comm_network FROM forum_communities WHERE slug = 'network';
  
  -- Get user IDs from public.users
  SELECT ARRAY(SELECT id FROM users ORDER BY random() LIMIT 100) INTO usr;
  
  IF array_length(usr, 1) IS NULL OR array_length(usr, 1) < 10 THEN
    RAISE EXCEPTION 'Need at least 10 users in public.users table';
  END IF;

  -- CLEANUP old seed data
  DELETE FROM forum_reactions;
  DELETE FROM forum_comments;
  DELETE FROM forum_posts;
  DELETE FROM forum_projects;

  -- CREATE 50 PROJECTS
  FOR i IN 1..50 LOOP
    INSERT INTO forum_projects (user_id, name, url, description, started_at, is_active)
    VALUES (
      usr[1 + mod(i, array_length(usr, 1))],
      proj_names[i],
      'https://' || lower(replace(proj_names[i], ' ', '')) || '.in',
      'Solving problems for Bharat. Building in public.',
      now() - (interval '1 day' * (300 - i*5)),
      true
    );
  END LOOP;
  
  -- Get project IDs
  SELECT ARRAY(SELECT id FROM forum_projects ORDER BY created_at) INTO proj;

  -- CREATE 1200 POSTS
  FOR i IN 1..1200 LOOP
    rand_val := (random() * 100)::int;
    
    -- BUILD IN PUBLIC (45%)
    IF rand_val <= 45 THEN
      INSERT INTO forum_posts (
        community_id, user_id, project_id, post_type, content, 
        day_number, metric_value, metric_label, created_at
      ) VALUES (
        comm_bip,
        usr[1 + mod(i, array_length(usr, 1))],
        proj[1 + mod(i, array_length(proj, 1))],
        'bip_day',
        bip_updates[1 + mod(i, array_length(bip_updates, 1))],
        10 + (random() * 250)::int,
        (random() * 10000)::int * 100,
        CASE (random() * 3)::int WHEN 0 THEN 'MRR' WHEN 1 THEN 'Users' WHEN 2 THEN 'Clicks' ELSE 'Txns' END,
        now() - (interval '1 hour' * (4320 - i*3))
      ) RETURNING id INTO post_id;
    
    -- NETWORK (30%)
    ELSIF rand_val <= 75 THEN
      INSERT INTO forum_posts (
        community_id, user_id, post_type, content, created_at
      ) VALUES (
        comm_network,
        usr[1 + mod(i, array_length(usr, 1))],
        'regular',
        network_asks[1 + mod(i, array_length(network_asks, 1))],
        now() - (interval '1 hour' * (4320 - i*3))
      ) RETURNING id INTO post_id;
    
    -- SUCCESS (15%)
    ELSIF rand_val <= 90 THEN
      INSERT INTO forum_posts (
        community_id, user_id, post_type, content, 
        media_urls, created_at
      ) VALUES (
        comm_wins,
        usr[1 + mod(i, array_length(usr, 1))],
        'win',
        win_stories[1 + mod(i, array_length(win_stories, 1))],
        ARRAY['https://placehold.co/600x400/10B981/ffffff?text=Proof'],
        now() - (interval '1 hour' * (4320 - i*3))
      ) RETURNING id INTO post_id;
    
    -- FAILURES (10%)
    ELSE
      INSERT INTO forum_posts (
        community_id, user_id, post_type, content, 
        lessons_learned, created_at
      ) VALUES (
        comm_fail,
        usr[1 + mod(i, array_length(usr, 1))],
        'failure',
        fail_stories[1 + mod(i, array_length(fail_stories, 1))],
        lessons[1 + mod(i, array_length(lessons, 1))],
        now() - (interval '1 hour' * (4320 - i*3))
      ) RETURNING id INTO post_id;
    END IF;

    -- ADD REACTIONS (3-25 per post)
    FOR j IN 1..(3 + (random() * 22)::int) LOOP
      BEGIN
        INSERT INTO forum_reactions (user_id, target_type, target_id, emoji, created_at)
        VALUES (
          usr[1 + mod(j + i, array_length(usr, 1))],
          'post',
          post_id,
          emojis[1 + mod(j, array_length(emojis, 1))],
          now() - (interval '1 hour' * (random() * 100)::int)
        );
      EXCEPTION WHEN unique_violation THEN
        -- Skip duplicate reactions
        NULL;
      END;
    END LOOP;

    -- ADD COMMENTS (1-8 per post)
    FOR k IN 1..(1 + (random() * 7)::int) LOOP
      IF random() < 0.5 THEN
        -- Quick Reply
        INSERT INTO forum_comments (post_id, user_id, quick_reply_type, content, created_at)
        VALUES (
          post_id,
          usr[1 + mod(k + i, array_length(usr, 1))],
          quicks[1 + mod(k, array_length(quicks, 1))],
          CASE quicks[1 + mod(k, array_length(quicks, 1))]
            WHEN 'can_intro' THEN 'I can intro you 🤝'
            WHEN 'paid_intro' THEN 'Paid intro available 💸'
            WHEN 'watching' THEN 'Watching this 👀'
            WHEN 'ship_it' THEN 'Ship it 🚀'
            ELSE 'DM me 💬'
          END,
          now() - (interval '1 hour' * (random() * 50)::int)
        );
      ELSE
        -- Text Comment
        INSERT INTO forum_comments (post_id, user_id, content, created_at)
        VALUES (
          post_id,
          usr[1 + mod(k + i, array_length(usr, 1))],
          comments[1 + mod(k + i, array_length(comments, 1))],
          now() - (interval '1 hour' * (random() * 50)::int)
        );
      END IF;
    END LOOP;

  END LOOP;
  
  RAISE NOTICE 'Seed Complete: 50 Projects, 1200 Posts, Comments & Reactions added!';
END $$;

