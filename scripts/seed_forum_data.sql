-- 100 POSTS + 100 UNIQUE POLLS (Delhi-NCR Founders 2025)
-- Every poll is 100% different. No copy-paste.

DO $$
DECLARE
  bip UUID; net UUID; wins UUID; fails UUID;
  u UUID[];
  ulen INT;
  i INT;
BEGIN
  -- Get all available users
  SELECT ARRAY(SELECT id FROM users ORDER BY random()) INTO u;
  ulen := array_length(u, 1);
  
  IF ulen IS NULL OR ulen < 5 THEN
    RAISE EXCEPTION 'Need at least 5 users in public.users table. Found: %', COALESCE(ulen, 0);
  END IF;
  SELECT id INTO bip   FROM forum_communities WHERE slug='build-in-public';
  SELECT id INTO net   FROM forum_communities WHERE slug='network';
  SELECT id INTO wins  FROM forum_communities WHERE slug='wins';
  SELECT id INTO fails FROM forum_communities WHERE slug='failures';

  DELETE FROM forum_poll_votes;
  DELETE FROM forum_polls;
  DELETE FROM forum_reactions;
  DELETE FROM forum_comments;
  DELETE FROM forum_posts WHERE created_at > now()-interval '200 days';

  ------------------------------------------------------------------
  -- POST 1–35 Build in Public
  ------------------------------------------------------------------
  INSERT INTO forum_posts(community_id,user_id,content,post_type,created_at) VALUES
  (bip,u[1+mod(0,ulen)],'Day 141 — ₹18.4L MRR. No marketing spend. Pure product-led growth','bip_day',now()-interval '3 days'),
  (bip,u[1+mod(1,ulen)],'Day 99 — Server crash at 2:47 AM. Lost 3 hours of sleep but fixed in 38 mins','bip_day',now()-interval '5 days'),
  (bip,u[1+mod(2,ulen)],'Day 78 — 1500 paying users. Churn dropped to 4.1% after adding pause feature','bip_day',now()-interval '7 days'),
  (bip,u[1+mod(3,ulen)],'Day 166 — ₹32 lakh monthly revenue. Still solo founder. Help','bip_day',now()-interval '9 days'),
  (bip,u[1+mod(4,ulen)],'Day 52 — Launched on PH, hit #1. 4200 signups in 24 hrs','bip_day',now()-interval '11 days'),
  (bip,u[1+mod(5,ulen)],'Day 112 — Moved from ₹999 → ₹4999 plan. Revenue same, 1.1x, customers 10x happier','bip_day',now()-interval '13 days'),
  (bip,u[1+mod(6,ulen)],'Day 89 — Co-founder left. Continuing solo now','bip_day',now()-interval '15 days'),
  (bip,u[1+mod(7,ulen)],'Day 133 — Profitable last 5 months. Finally taking home ₹15L/month','bip_day',now()-interval '17 days'),
  (bip,u[1+mod(8,ulen)],'Day 71 — Got WhatsApp green tick. Conversion +28%','bip_day',now()-interval '19 days'),
  (bip,u[1+mod(9,ulen)],'Day 149 — Migrated Node → Go. Latency 190ms → 31ms','bip_day',now()-interval '21 days'),
  (bip,u[1+mod(10,ulen)],'Day 104 — First enterprise deal — ₹84L/year','bip_day',now()-interval '23 days'),
  (bip,u[1+mod(11,ulen)],'Day 95 — Hired first sales guy on 100% commission','bip_day',now()-interval '25 days'),
  (bip,u[1+mod(12,ulen)],'Day 118 — Reduced AWS bill from $1200 → $180/mo','bip_day',now()-interval '27 days'),
  (bip,u[1+mod(13,ulen)],'Day 63 — Cold emailed 300 US founders, 42 replies, 6 paying','bip_day',now()-interval '29 days'),
  (bip,u[1+mod(14,ulen)],'Day 157 — Burnout hit hard. Taking 1 week off','bip_day',now()-interval '31 days'),
  (bip,u[1+mod(15,ulen)],'Day 82 — Added UPI recurring. Retention +19%','bip_day',now()-interval '33 days'),
  (bip,u[1+mod(16,ulen)],'Day 126 — Got featured on a 100k-sub newsletter. Traffic ×6','bip_day',now()-interval '35 days'),
  (bip,u[1+mod(17,ulen)],'Day 109 — Refactored auth. Login speed ×3','bip_day',now()-interval '37 days'),
  (bip,u[1+mod(18,ulen)],'Day 144 — Crossed 10k daily active users','bip_day',now()-interval '39 days'),
  (bip,u[1+mod(19,ulen)],'Day 67 — First 100 customers via LinkedIn only','bip_day',now()-interval '41 days'),
  (bip,u[1+mod(20,ulen)],'Day 131 — Launched Android app. 12k downloads week 1','bip_day',now()-interval '43 days'),
  (bip,u[1+mod(21,ulen)],'Day 98 — NPS jumped from 38 → 71','bip_day',now()-interval '45 days'),
  (bip,u[1+mod(22,ulen)],'Day 115 — Added vernacular support. Tier-2 signups ×4','bip_day',now()-interval '47 days'),
  (bip,u[1+mod(23,ulen)],'Day 88 — Pricing page A/B test running','bip_day',now()-interval '49 days'),
  (bip,u[1+mod(24,ulen)],'Day 137 — First angel investment ₹2 Cr','bip_day',now()-interval '51 days'),
  (bip,u[1+mod(25,ulen)],'Day 76 — Fixed 47 bugs today','bip_day',now()-interval '53 days'),
  (bip,u[1+mod(26,ulen)],'Day 122 — Referral program live. 31% of new users','bip_day',now()-interval '55 days'),
  (bip,u[1+mod(27,ulen)],'Day 105 — Started hiring in Pune','bip_day',now()-interval '57 days'),
  (bip,u[1+mod(28,ulen)],'Day 148 — Revenue crossed ₹2.1 Cr this year','bip_day',now()-interval '59 days'),
  (bip,u[1+mod(29,ulen)],'Day 93 — Competitor copied our landing page','bip_day',now()-interval '61 days'),
  (bip,u[1+mod(30,ulen)],'Day 129 — Launched dark mode','bip_day',now()-interval '63 days'),
  (bip,u[1+mod(31,ulen)],'Day 84 — Reduced customer support tickets 60% with AI bot','bip_day',now()-interval '65 days'),
  (bip,u[1+mod(32,ulen)],'Day 152 — First 50k total users','bip_day',now()-interval '67 days'),
  (bip,u[1+mod(33,ulen)],'Day 69 — First profitable month ever','bip_day',now()-interval '69 days'),
  (bip,u[1+mod(34,ulen)],'Day 140 — Still building. No noise, sirf kaam','bip_day',now()-interval '71 days');

  ------------------------------------------------------------------
  -- 35 UNIQUE POLLS for Build in Public (posts 1–35)
  ------------------------------------------------------------------
  INSERT INTO forum_polls(post_id,question,options) VALUES
  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 0),
   'Abhi ka sabse bada bottleneck?',
   '["Hiring","Cashflow","Tech debt","Customer acquisition"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 1),
   'Next hire kaun hona chahiye?',
   '["First sales","DevOps","Designer","Content writer"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 2),
   'Churn kam karne ka best way?',
   '["Pause feature","Better onboarding","Discounts","Personal calls"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 3),
   'Solo founder vs co-founder?',
   '["Solo forever","Need tech co-founder","Need biz co-founder","Team of freelancers"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 4),
   'Product Hunt launch — worth it?',
   '["Hell yes","Only if #1-3","Waste of time","Never tried"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 5),
   'Pricing badhane ka right time?',
   '["After 100 users","After 500 users","After PMF","Never"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 6),
   'Co-founder chodne ke baad kya karoge?',
   '["Continue solo","Find new one","Shut down","Sell"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 7),
   'Salary kab shuru ki?',
   '["Day 1","After 6 months","After 1 year","Still not"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 8),
   'Green tick kitna farak padta hai?',
   '["Bohot","Thoda","Zero","Don''t have"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 9),
   'Go migration worth it?',
   '["Yes 100%","Only for scale","No regret","Never again"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 10),
   'Enterprise deal close karne mein sabse zyada time kis pe gaya?',
   '["Legal & compliance","Pricing negotiation","Security review","Pilot setup"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 11),
   '100% commission wale sales log sustainable hote hain?',
   '["Yes long term","Short term only","Depends on product","Never worked with them"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 12),
   'Cloud bill optimize karne ka first step?',
   '["Turn off unused","Reserved instances","Cheaper provider","Self-host infra"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 13),
   'Cold email ka best lever?',
   '["Subject line","First sentence","Social proof","Offer clarity"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 14),
   'Burnout se nikalne ka plan?',
   '["Full week off","Short daily breaks","Therapy/coach","Change roadmap"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 15),
   'UPI recurring ke baad aapka default payment mode?',
   '["UPI","Credit card","Netbanking","Wallets"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 16),
   'Newsletter feature se aayi traffic ko kaise capture karoge?',
   '["Lead magnet","Free trial","Webinar","No plan honestly"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 17),
   'Auth refactor karte waqt sabse badi dikkat?',
   '["Legacy users","Mobile apps","3rd party logins","Testing"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 18),
   '10k DAU pe sabse important metric?',
   '["Retention","Latency","ARPU","Crash rate"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 19),
   'First 100 LinkedIn customers ka channel?',
   '["Cold DMs","Content","Referrals","Groups/communities"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 20),
   'Android launch se pehle biggest fear?',
   '["Play Store rejection","Bug avalanche","Bad reviews","Servers down"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 21),
   'NPS improve karne ka fastest hack?',
   '["Better support","More features","Remove bugs","Talk to churned users"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 22),
   'Vernacular support ka sabse bada upside?',
   '["Tier-2/3 reach","Higher trust","More referrals","Better retention"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 23),
   'Pricing page A/B test mein pehle kya badaloge?',
   '["Copy","Layout","CTA buttons","Testimonials"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 24),
   'First angel cheque ke baad pehla spend?',
   '["Team hiring","Marketing","Product rebuild","Founder salary"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 25),
   'Bug backlog handle karne ka style?',
   '["Bug bash day","Weekly triage","Only critical","Ignore till users shout"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 26),
   'Referral program ka best reward?',
   '["Cash","Credits","Free months","Merch/swags"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 27),
   'Hiring location strategy?',
   '["Only Delhi-NCR","Tier-2 cities","Remote India","Global remote"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 28),
   '₹2 Cr revenue pe founder focus?',
   '["Sales","Product","Hiring","Fundraise"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 29),
   'Competitor ne landing copy kiya to response?',
   '["Ignore","DM founder","Public tweet","Legal notice"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 30),
   'Dark mode ne users ko kitna excite kiya?',
   '["Massively","Thoda hype","Sirf Twitter pe","No one cared"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 31),
   'Support tickets kam karne ke liye best tool?',
   '["Help center","In-app guides","AI bot","Community forum"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 32),
   '50k total users pe kya celebrate karoge?',
   '["Team offsite","Fancy dinner","Just keep working","Social media flex"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 33),
   'First profitable month ka use case?',
   '["Reinvest sab","Save runway","Pay debt","Founder bonus"]'::jsonb),

  ((SELECT id FROM forum_posts ORDER BY created_at DESC LIMIT 1 OFFSET 34),
   '“No noise, sirf kaam” waali phase mein kya cut karoge?',
   '["Social media","Events","Side projects","Hiring speed"]'::jsonb);

  ------------------------------------------------------------------
  -- POST 36–70 Network Requests (35 posts)
  ------------------------------------------------------------------
  INSERT INTO forum_posts(community_id,user_id,content,post_type,created_at) VALUES
  (net,u[1+mod(35,ulen)],'Peak XV / Accel partner intro chahiye — ₹90k ARR, 44% MoM','request',now()-interval '2 days'),
  (net,u[1+mod(36,ulen)],'Zerodha growth team contact? Hiring first PM','request',now()-interval '4 days'),
  (net,u[1+mod(37,ulen)],'Co-founder chahiye — React Native + AI. Delhi only','request',now()-interval '6 days'),
  (net,u[1+mod(38,ulen)],'RBI fintech team se baat karni hai','request',now()-interval '8 days'),
  (net,u[1+mod(39,ulen)],'PhonePe enterprise sales intro','request',now()-interval '10 days'),
  (net,u[1+mod(40,ulen)],'Looking for D2C logistics head — Gurgaon based','request',now()-interval '12 days'),
  (net,u[1+mod(41,ulen)],'ESOP policy template for 10–15 member startup?','request',now()-interval '14 days'),
  (net,u[1+mod(42,ulen)],'Need CA who understands Delaware + India holding structure','request',now()-interval '16 days'),
  (net,u[1+mod(43,ulen)],'Strong B2B SaaS closer in Noida — any referrals?','request',now()-interval '18 days'),
  (net,u[1+mod(44,ulen)],'Vision fund / late stage investor deck examples?','request',now()-interval '20 days'),
  (net,u[1+mod(45,ulen)],'UI/UX designer experienced with dashboards — part time','request',now()-interval '22 days'),
  (net,u[1+mod(46,ulen)],'Looking for GTM advisor for HRtech, India + Middle East','request',now()-interval '24 days'),
  (net,u[1+mod(47,ulen)],'Payroll tool recommendations for 40-member remote team','request',now()-interval '26 days'),
  (net,u[1+mod(48,ulen)],'Any good coworking in Gurgaon with 24x7 access?','request',now()-interval '28 days'),
  (net,u[1+mod(49,ulen)],'Need intro in ONDC team for grocery pilot','request',now()-interval '30 days'),
  (net,u[1+mod(50,ulen)],'Delhi-NCR startup lawyer who is actually founder-friendly?','request',now()-interval '32 days'),
  (net,u[1+mod(51,ulen)],'Any content studio for founder podcasts in Delhi?','request',now()-interval '34 days'),
  (net,u[1+mod(52,ulen)],'ISO mentor who has exited SaaS at $10M+ ARR','request',now()-interval '36 days'),
  (net,u[1+mod(53,ulen)],'Looking for CTO-for-equity, data infra + AI heavy product','request',now()-interval '38 days'),
  (net,u[1+mod(54,ulen)],'Need 5–6 beta customers for B2B sales outreach tool','request',now()-interval '40 days'),
  (net,u[1+mod(55,ulen)],'Intro to CRED partnerships team for co-branded campaign','request',now()-interval '42 days'),
  (net,u[1+mod(56,ulen)],'Any hiring agency good at senior tech roles under ₹60L?','request',now()-interval '44 days'),
  (net,u[1+mod(57,ulen)],'Looking for fractional CMO for 6 months, growth stage','request',now()-interval '46 days'),
  (net,u[1+mod(58,ulen)],'Need Delhi-based video editor for YouTube-style ads','request',now()-interval '48 days'),
  (net,u[1+mod(59,ulen)],'Who knows SRM / Manav Rachna placement heads? Want to hire freshers','request',now()-interval '50 days'),
  (net,u[1+mod(60,ulen)],'Need intro to MSME banker in Delhi for working capital line','request',now()-interval '52 days'),
  (net,u[1+mod(61,ulen)],'Any good PR agency for tech in India <₹1L/mo?','request',now()-interval '54 days'),
  (net,u[1+mod(62,ulen)],'Someone with experience in govt tenders for SaaS?','request',now()-interval '56 days'),
  (net,u[1+mod(63,ulen)],'Looking for community manager for founders-only group in Gurugram','request',now()-interval '58 days'),
  (net,u[1+mod(64,ulen)],'Need early-stage healthtech founders for closed WhatsApp group','request',now()-interval '60 days'),
  (net,u[1+mod(65,ulen)],'ESOP buyback vendor recommendations?','request',now()-interval '62 days'),
  (net,u[1+mod(66,ulen)],'Anyone running outbound SDR team from Noida? Want to visit office','request',now()-interval '64 days'),
  (net,u[1+mod(67,ulen)],'Hiring ops lead for dark-kitchen brand in South Delhi','request',now()-interval '66 days'),
  (net,u[1+mod(68,ulen)],'Looking for founder dinner group in Delhi on 2nd Fridays','request',now()-interval '68 days'),
  (net,u[1+mod(69,ulen)],'Need Delhi-based angel who understands SaaS infra, ₹25–50L cheque','request',now()-interval '70 days');

  ------------------------------------------------------------------
  -- 35 UNIQUE POLLS for Network (posts 36–70)
  ------------------------------------------------------------------
  INSERT INTO forum_polls(post_id,question,options) VALUES
  ((SELECT id FROM forum_posts WHERE content LIKE '%Peak XV / Accel partner intro%' LIMIT 1),
   'VC partner intro ke liye kya offer karoge?',
   '["Just updates","Advisory shares","Small success fee","Nothing, just ask"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%Zerodha growth team contact%' LIMIT 1),
   'Referral milega?',
   '["Yes free","Paid possible","Not in my network","Following"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%React Native + AI. Delhi only%' LIMIT 1),
   'Technical co-founder dhundne ka best channel?',
   '["Twitter/X","LinkedIn","Local meetups","College juniors"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%RBI fintech team se baat%' LIMIT 1),
   'Regulator se baat karne se pehle kya ready hona chahiye?',
   '["Compliance deck","Lawyer on call","Live product","Nothing, just go"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%PhonePe enterprise sales intro%' LIMIT 1),
   'Big enterprise intro ke badle aap kya doge?',
   '["Rev share","Advisory ESOP","Flat fee","Shoutout only"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%D2C logistics head — Gurgaon%' LIMIT 1),
   'Senior logistics hire ka background?',
   '["Big 3 courier","D2C brand","Consulting","Any hustler"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%ESOP policy template%' LIMIT 1),
   'ESOP pool size for 10–15 member team?',
   '["5%","10%","15%",">15%"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%Delaware + India holding structure%' LIMIT 1),
   'Cross-border structure choose karne ka main reason?',
   '["US investors","Tax","Brand","Just FOMO"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%Strong B2B SaaS closer in Noida%' LIMIT 1),
   'B2B closer ko pay kaise karte ho?',
   '["Fixed+variable","High variable","Only commission","Base only"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%Vision fund / late stage investor deck%' LIMIT 1),
   'Late stage decks mein sabse zyada focus?',
   '["Unit economics","Category leader story","Team depth","Logo wall"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%UI/UX designer experienced with dashboards%' LIMIT 1),
   'Part time designer ko brief kaise doge?',
   '["Loom walkthrough","Figma wireframe","Notion doc","Just call"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%GTM advisor for HRtech%' LIMIT 1),
   'GTM advisor ko equity vs cash?',
   '["Only equity","Only cash","Mix of both","Pay per lead"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%Payroll tool recommendations%' LIMIT 1),
   'Payroll tool choose karte waqt top priority?',
   '["Compliance","Ease of use","Cost","Integrations"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%coworking in Gurgaon with 24x7%' LIMIT 1),
   'Coworking space pick karne ka criteria?',
   '["Location","24x7 access","Community","Pricing"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%intro in ONDC team%' LIMIT 1),
   'ONDC experiment ke liye brand ki stage?',
   '["Idea","Pilot live","PMF","Scaling"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%startup lawyer who is actually founder-friendly%' LIMIT 1),
   'Founder-friendly lawyer ka sign?',
   '["Talks simple","Flat pricing","Fast replies","All of these"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%content studio for founder podcasts%' LIMIT 1),
   'Founder podcast ka main goal?',
   '["Leadgen","Brand building","Networking","Therapy for self"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%exited SaaS at $10M+ ARR%' LIMIT 1),
   'Mentor ke saath ideal cadence?',
   '["Weekly","Bi-weekly","Monthly","Ad-hoc only"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%CTO-for-equity, data infra + AI heavy%' LIMIT 1),
   'CTO-for-equity deals mein equity range?',
   '["<3%","3–7%","7–12%",">12%"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%5–6 beta customers for B2B sales outreach tool%' LIMIT 1),
   'Beta customers ko onboard karne ka magnet?',
   '["Lifetime discount","Free months","Custom features","Advisory shares"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%CRED partnerships team%' LIMIT 1),
   'Brand collab outreach style?',
   '["Cold email","Warm intro","LinkedIn DMs","Events"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%hiring agency good at senior tech roles%' LIMIT 1),
   'Agencies ko fee model?',
   '["% of CTC","Flat fee","Retainer","Success-based only"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%fractional CMO for 6 months%' LIMIT 1),
   'Fractional CMO ka main KPI?',
   '["Leads","Revenue","Brand recall","Team setup"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%Delhi-based video editor for YouTube-style ads%' LIMIT 1),
   'Ad editor se expectation?',
   '["Speed","Story sense","Platform expertise","All combined"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%placement heads? Want to hire freshers%' LIMIT 1),
   'Freshers hire karte waqt sabse important?',
   '["Attitude","College brand","Projects","Referrals"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%MSME banker in Delhi for working capital%' LIMIT 1),
   'Working capital line lene ka moment?',
   '["Early","Post PMF","Only when stuck","Never taken"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%PR agency for tech in India%' LIMIT 1),
   'PR agency ko judge karne ka metric?',
   '["Founders they serve","Past coverage","Pricing","Founder chemistry"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%govt tenders for SaaS%' LIMIT 1),
   'Govt tender game mein risk appetite?',
   '["All in","Side bet","Too slow","Never tried"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%community manager for founders-only group%' LIMIT 1),
   'Founder community ko alive rakhne ka hack?',
   '["Weekly events","Quality filters","Good memes","Small cohorts"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%healthtech founders for closed WhatsApp group%' LIMIT 1),
   'Niche WhatsApp group size ideal?',
   '["<20","20–40","40–80",">80"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%ESOP buyback vendor%' LIMIT 1),
   'ESOP buyback ka signal?',
   '["Good culture","Enough cash","Exit prep","PR move"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%outbound SDR team from Noida%' LIMIT 1),
   'SDR team run karte waqt main dashboard metric?',
   '["Dials/day","Meetings set","Pipeline value","Opens/replies"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%ops lead for dark-kitchen brand%' LIMIT 1),
   'Dark kitchen ops ke liye must-have skill?',
   '["Vendor mgmt","Data comfort","Team mgmt","Crisis handling"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%founder dinner group in Delhi on 2nd Fridays%' LIMIT 1),
   'Founder dinners ka ideal format?',
   '["Free-flow","Topic based","Hot seat","Mix of all"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE '%angel who understands SaaS infra%' LIMIT 1),
   'Ideal Delhi angel profile?',
   '["Ex-founder","CXO","Career investor","Family office"]'::jsonb);

  ------------------------------------------------------------------
  -- POST 71–90 Wins (20 posts)
  ------------------------------------------------------------------
  INSERT INTO forum_posts(community_id,user_id,content,post_type,created_at) VALUES
  (wins,u[1+mod(70,ulen)],'Win — First ₹1L day in revenue. All organic from Instagram Reels','win',now()-interval '6 days'),
  (wins,u[1+mod(71,ulen)],'Win — Churn dropped from 9% → 3.4% in 2 months after revamp','win',now()-interval '8 days'),
  (wins,u[1+mod(72,ulen)],'Win — Hired killer founding engineer from IIT-D without any recruiter','win',now()-interval '10 days'),
  (wins,u[1+mod(73,ulen)],'Win — Invoice of ₹38L cleared in 6 days by PSU client. Shocked.','win',now()-interval '12 days'),
  (wins,u[1+mod(74,ulen)],'Win — Switched from cold email to founder-led LinkedIn content, demo calls doubled','win',now()-interval '14 days'),
  (wins,u[1+mod(75,ulen)],'Win — First time saying "No" to misfit investor even with term sheet on table','win',now()-interval '16 days'),
  (wins,u[1+mod(76,ulen)],'Win — Team offsite in Rishikesh on profits, no investor money used','win',now()-interval '18 days'),
  (wins,u[1+mod(77,ulen)],'Win — Customer success playbook cut tickets by 40% in 30 days','win',now()-interval '20 days'),
  (wins,u[1+mod(78,ulen)],'Win — Switched to annual plans, cash in bank 3x without new fundraise','win',now()-interval '22 days'),
  (wins,u[1+mod(79,ulen)],'Win — Got featured on front page of YourStory without paying for it','win',now()-interval '24 days'),
  (wins,u[1+mod(80,ulen)],'Win — 3 senior folks joined from FAANG on below-market salaries because of mission','win',now()-interval '26 days'),
  (wins,u[1+mod(81,ulen)],'Win — Office shifted from cafe corners to small but our own space in Noida Sec 62','win',now()-interval '28 days'),
  (wins,u[1+mod(82,ulen)],'Win — Referral engine kicked in, 54% of MRR now via word-of-mouth','win',now()-interval '30 days'),
  (wins,u[1+mod(83,ulen)],'Win — Finally paying both co-founders a modest salary after 18 months zero pay','win',now()-interval '32 days'),
  (wins,u[1+mod(84,ulen)],'Win — UGC creators giving 10x ROAS compared to big agency ads','win',now()-interval '34 days'),
  (wins,u[1+mod(85,ulen)],'Win — First US logo came inbound after a random Twitter thread','win',now()-interval '36 days'),
  (wins,u[1+mod(86,ulen)],'Win — Moved from chaos stand-ups to written async updates, productivity up','win',now()-interval '38 days'),
  (wins,u[1+mod(87,ulen)],'Win — Parent finally stopped asking "beta job kab karega?" after seeing numbers','win',now()-interval '40 days'),
  (wins,u[1+mod(88,ulen)],'Win — 0 to 100 paying customers in Delhi-NCR without a single free trial','win',now()-interval '42 days'),
  (wins,u[1+mod(89,ulen)],'Win — Broke even on every channel, no loss-leader anymore in the funnel','win',now()-interval '44 days');

  ------------------------------------------------------------------
  -- 20 UNIQUE POLLS for Wins (posts 71–90)
  ------------------------------------------------------------------
  INSERT INTO forum_polls(post_id,question,options) VALUES
  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — First ₹1L day in revenue.%' LIMIT 1),
   '₹1L/day ke baad next milestone?',
   '["₹5L/day","₹10L/day","Global launch","Team expansion"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — Churn dropped from 9% → 3.4%%' LIMIT 1),
   'Churn improve karne ka sabse underrated lever?',
   '["Onboarding","Support","Feature pruning","Community"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — Hired killer founding engineer from IIT-D%' LIMIT 1),
   'Founding engineer ko convince karne ka strong angle?',
   '["Vision","Ownership","Money","Work culture"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — Invoice of ₹38L cleared in 6 days by PSU client.%' LIMIT 1),
   'PSU client ke saath kaam karoge?',
   '["Yes happily","Only if prepaid","Avoid mostly","Never again"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — Switched from cold email to founder-led LinkedIn content%' LIMIT 1),
   'Founder-led distribution ka strongest channel?',
   '["LinkedIn","Twitter","YouTube","Podcast"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — First time saying “No” to misfit investor%' LIMIT 1),
   'Misfit investor ko kaise spot karte ho?',
   '["Misaligned values","Too pushy","Don''t get product","All of these"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — Team offsite in Rishikesh on profits%' LIMIT 1),
   'Team offsite ka budget founder view se?',
   '["Very lean","Decent","Lavish once/yr","Case by case"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — Customer success playbook cut tickets by 40%%% 30 days' LIMIT 1),
   'CS playbook mein pehla section?',
   '["Response SLAs","Tone guide","FAQ links","Escalation map"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — Switched to annual plans, cash in bank 3x%' LIMIT 1),
   'Annual plans push ka main risk?',
   '["Higher refunds","Cash illusion","Discount pressure","None"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — Got featured on front page of YourStory%' LIMIT 1),
   'Media feature ka asli ROI?',
   '["Hiring","Leads","Investor interest","Parents happy"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — 3 senior folks joined from FAANG%' LIMIT 1),
   'Senior hires ke saath sabse bada challenge?',
   '["Culture fit","Expectation mgmt","Equity talks","Speed mismatch"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — Office shifted from cafe corners%' LIMIT 1),
   'First office choose karte waqt priority?',
   '["Location","Rent","Vibe","Commute for team"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — Referral engine kicked in, 54% of MRR%' LIMIT 1),
   'Referral ko nudge kaise karte ho?',
   '["In-product prompts","CS calls","Email campaigns","Never pushed"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — Finally paying both co-founders a modest salary%' LIMIT 1),
   'Founder salary kab start honi chahiye?',
   '["From day 1","After PMF","After profits","After fundraise"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — UGC creators giving 10x ROAS%' LIMIT 1),
   'UGC creators ko kaise onboard karte ho?',
   '["Agencies","DM creators","Platforms","Friends of friends"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — First US logo came inbound after a random Twitter thread%' LIMIT 1),
   'US inbound ke liye sabse solid proof?',
   '["Case studies","Open roadmap","Public numbers","Founder threads"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — Moved from chaos stand-ups to written async updates%' LIMIT 1),
   'Async culture start karne ka first step?',
   '["Daily doc","No-meeting blocks","Recorded looms","Clear SLAs"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — Parent finally stopped asking “beta job kab karega?”%' LIMIT 1),
   'Parents ko startup samjhane ka tareeka?',
   '["Revenue screen","Articles","Customer stories","Ignore & execute"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — 0 to 100 paying customers in Delhi-NCR%' LIMIT 1),
   'First 100 customers ka ideal mix?',
   '["Friends","Referrals","Strangers online","Enterprise pilots"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — Broke even on every channel%' LIMIT 1),
   'Channel-level P&L kab se track karna chahiye?',
   '["Day 1","After PMF","Post Series A","Kabhi nahi kiya"]'::jsonb);

  ------------------------------------------------------------------
  -- POST 91–100 Failures (10 posts)
  ------------------------------------------------------------------
  INSERT INTO forum_posts(community_id,user_id,content,post_type,created_at) VALUES
  (fails,u[1+mod(90,ulen)],'Fail — Burnt ₹11L on fancy office before even hitting ₹50k MRR','failure',now()-interval '46 days'),
  (fails,u[1+mod(91,ulen)],'Fail — Hired VP Sales from unicorn, could not close even 1 deal in 5 months','failure',now()-interval '48 days'),
  (fails,u[1+mod(92,ulen)],'Fail — Switched product direction 3 times in 9 months, team almost quit','failure',now()-interval '50 days'),
  (fails,u[1+mod(93,ulen)],'Fail — Spent 3 months building feature nobody used, not even once','failure',now()-interval '52 days'),
  (fails,u[1+mod(94,ulen)],'Fail — Agency retainer ₹2L/month for brand film, 0 measurable ROI','failure',now()-interval '54 days'),
  (fails,u[1+mod(95,ulen)],'Fail — Signed horrible office lease, 11-month lock in and had to shift remote','failure',now()-interval '56 days'),
  (fails,u[1+mod(96,ulen)],'Fail — Raised small round on wrong valuation expectations, next round super hard','failure',now()-interval '58 days'),
  (fails,u[1+mod(97,ulen)],'Fail — Friend as co-founder, great friend still, terrible co-founder match','failure',now()-interval '60 days'),
  (fails,u[1+mod(98,ulen)],'Fail — Ignored CAC math, scaled ads too early and killed runway','failure',now()-interval '62 days'),
  (fails,u[1+mod(99,ulen)],'Fail — Built only for Delhi users, later realised infra not ready for rest of India','failure',now()-interval '64 days');

  ------------------------------------------------------------------
  -- 10 UNIQUE POLLS for Failures (posts 91–100)
  ------------------------------------------------------------------
  INSERT INTO forum_polls(post_id,question,options) VALUES
  ((SELECT id FROM forum_posts WHERE content LIKE 'Fail — Burnt ₹11L on fancy office%' LIMIT 1),
   'Office pe overspend avoid kaise Karte?',
   '["Desk per head math","Short leases","Coworking first","Remote till PMF"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Fail — Hired VP Sales from unicorn%' LIMIT 1),
   'Unicorn se senior hire karte waqt red flag?',
   '["Team size shock","Process heavy","Brand dependent","Salary expectation"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Fail — Switched product direction 3 times%' LIMIT 1),
   'Pivot frequency founder view se?',
   '["<1/year","1–2/year","Every quarter","As market says"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Fail — Spent 3 months building feature nobody used%' LIMIT 1),
   'Feature build se pehle sabse minimum validation?',
   '["10 paid users ready","Waitlist","Landing page test","Tweet thread only"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Fail — Agency retainer ₹2L/month for brand film%' LIMIT 1),
   'Agency retainer sign karne se pehle kya lock karoge?',
   '["Clear KPIs","Exit clauses","Trial project","All of these"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Fail — Signed horrible office lease%' LIMIT 1),
   'Lease sign karte waqt clause focus?',
   '["Lock-in","Maintenance","Notice period","All combined"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Fail — Raised small round on wrong valuation expectations%' LIMIT 1),
   'Overvaluation ka sabse bada nuksan?',
   '["Next round tough","Down round","Team morale","Cap table messy"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Fail — Friend as co-founder, great friend still%' LIMIT 1),
   'Friend co-founder decide karte waqt sabse solid test?',
   '["Work history","Conflict handling","Money talk","All of these"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Fail — Ignored CAC math, scaled ads too early%' LIMIT 1),
   'Ads scale karne se pehle ka basic math?',
   '["CAC<LTV","Payback<6m","Retention ok","All together"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Fail — Built only for Delhi users, later realised infra%' LIMIT 1),
   'City-specific product ko scale karne ka step 1?',
   '["Infra audit","Local partners","Pilot 2nd city","Rebuild core"]'::jsonb);

  ------------------------------------------------------------------
  -- ADD VOTES TO ALL 100 POLLS
  ------------------------------------------------------------------
  FOR i IN 1..100 LOOP
    INSERT INTO forum_poll_votes(poll_id,user_id,option_index)
    SELECT id,
           u[1 + mod((random()*100)::int, ulen)],
           (random()*3)::int
    FROM forum_polls
    ORDER BY id
    LIMIT 1 OFFSET (i-1)
    ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE '100 POSTS + 100 UNIQUE POLLS DONE BHAI! NO DUPLICATES. FORUM ZINDA HO GAYA';
END $$;
