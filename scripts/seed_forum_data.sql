-- 100 POSTS + 100 UNIQUE POLLS (Delhi-NCR Founders 2025)
-- Every poll is 100% different. No copy-paste.
-- Now includes body (detailed content) for each post

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
  INSERT INTO forum_posts(community_id,user_id,content,body,post_type,created_at) VALUES
  (bip,u[1+mod(0,ulen)],
   'Day 141 — ₹18.4L MRR. No marketing spend. Pure product-led growth',
   'Razorpay dashboard dekh ke kal raat literal goosebumps aa gaye – ₹18.4L MRR, ₹0 Meta ya Google ads, sirf product-led pull. Par andar se thoda darr bhi lag raha hai ki yeh graph kab flat ho jaye agar roadmap galat turn le liya. Aapke hisaab se iss stage pe sabse bada bottleneck kya hota hai – system, team, ya distribution?',
   'bip_day',now()-interval '3 days'),
  (bip,u[1+mod(1,ulen)],
   'Day 99 — Server crash at 2:47 AM. Lost 3 hours of sleep but fixed in 38 mins',
   '2:47 AM pe AWS CloudWatch ka alert aaya, Grafana pura red and Slack pe sirf chaos – poore stack ne ekdum se haath khade kar diye. 38 minutes mein rollback + hotfix kar ke uptime wapas aaya, lekin 3 ghante ki neend gayi aur kal ka din bhi thoda fry ho gaya. Ab lag raha hai banda kam, infra heavy ho gaya, to next hire kaun hona chahiye according to you?',
   'bip_day',now()-interval '5 days'),
  (bip,u[1+mod(2,ulen)],
   'Day 78 — 1500 paying users. Churn dropped to 4.1% after adding pause feature',
   '1500 paying users ke baad finally lag raha hai ki Notion pe likha PMF ka dream thoda real ho raha hai, especially after churn dropping to 4.1%. Sirf ek chhota sa pause subscription feature ship kiya tha Razorpay recurring ke upar, aur users ne bola ki break chahiye, breakup nahi. Aap log ke experience mein churn ko kaatne ka sabse powerful lever kya raha – feature tweaks, onboarding, ya personal touch?',
   'bip_day',now()-interval '7 days'),
  (bip,u[1+mod(3,ulen)],
   'Day 166 — ₹32 lakh monthly revenue. Still solo founder. Help',
   '₹32 lakh monthly revenue sounding glam hai, lekin Google Calendar, Notion, Slack aur support inbox sab ek hi insaan sambhal raha hai and brain fried feel ho raha hai. Har weekend sochta hoon team build karni hai, par control chhodne ka fear bhi heavy hai yaar. Honest view chahiye – iss level pe aap solo rehke grind karoge ya co-founder lane ka time aa gaya?',
   'bip_day',now()-interval '9 days'),
  (bip,u[1+mod(4,ulen)],
   'Day 52 — Launched on PH, hit #1. 4200 signups in 24 hrs',
   'Product Hunt pe subah 8 baje launch mara, sham tak #1 and 4200 signups in 24 hours dekh ke analytics mein pura dopamine flood ho gaya. Lekin 7 din baad Mixpanel cohort graph dekha to reality check mila – hype high tha, lekin long-term activation itna solid nahi. Aap log ke liye PH launch real growth driver tha ya zyada vanity and FOMO ka play nikla?',
   'bip_day',now()-interval '11 days'),
  (bip,u[1+mod(5,ulen)],
   'Day 112 — Moved from ₹999 → ₹4999 plan. Revenue same, 1.1x, customers 10x happier',
   'Pehle ₹999 plan pe sabko onboard kar rahe the aur support inbox jal raha tha, har user ultra price sensitive and cranky. Pricing ko jump karke ₹4,999 kar diya, MRR roughly same + thoda up, lekin customers 10x calmer and NPS upar. Aap log ne pricing kab bold way mein badli thi and kya signal tha ki ab cheap wala game band karna chahiye?',
   'bip_day',now()-interval '13 days'),
  (bip,u[1+mod(6,ulen)],
   'Day 89 — Co-founder left. Continuing solo now',
   'Co-founder ke saath 2 saal daily standup, late-night Zooms and random Chai pe vision debates – aur phir ek din clean break. Cap table se naam hata diya, lekin Google Drive aur dimaag se history nikalna utna easy nahi tha, honestly heavy feel hua. Aisi situation mein aap hote to seedha solo chalte, naya co-founder dhundte, ya pura reset marte?',
   'bip_day',now()-interval '15 days'),
  (bip,u[1+mod(7,ulen)],
   'Day 133 — Profitable last 5 months. Finally taking home ₹15L/month',
   'Pichle 5 mahine se profit aa raha hai and finally apne bank account mein ₹15L/month aa raha hai instead of sirf Stripe/Razorpay screenshot dikhana. 18 months tak ghar walon ko bol raha tha "runway hai, tension mat karo" jabki khud Ola/Uber ka bhi soch ke ride book karta tha. Aap logne apne aap ko real salary dena kab start kiya and kya threshold rakha tha?',
   'bip_day',now()-interval '17 days'),
  (bip,u[1+mod(8,ulen)],
   'Day 71 — Got WhatsApp green tick. Conversion +28%',
   'WhatsApp green tick milte hi customer chats ka tone change ho gaya, log suddenly "are you official partner?" type trust questions kam puchne lage and conversions ~28% up dekhne ko mile. Pehle same messages broadcast karte the but response cold tha, ab lagta hai legitimacy badge ne sales team ka kaam aadha kar diya. Aapke hisaab se yeh green tick genuinely business driver hai ya sirf ego boost badge?',
   'bip_day',now()-interval '19 days'),
  (bip,u[1+mod(9,ulen)],
   'Day 149 — Migrated Node → Go. Latency 190ms → 31ms',
   'Node stack pe latency 180–200ms aa rahi thi and har demo mein koi na koi founder pooch hi leta tha "yeh thoda slow hai kya?". 3 hafte ka Go migration + thoda Cloudflare tuning ke baad average latency 31ms aa rahi hai and product demo finally snappy lag raha hai. Aap log ke liye aisa heavy tech migration kab worth banta hai – sirf scale pe ya pehle bhi?',
   'bip_day',now()-interval '21 days'),
  (bip,u[1+mod(10,ulen)],
   'Day 104 — First enterprise deal — ₹84L/year',
   '6 mahine se chase chal raha tha and finally pehla enterprise contract sign hua – ₹84L per year, 4 level ke approvals and 17 Zoom calls ke baad. Security review, ISO docs, VAPT, sab kuch Notion mein track karke somehow close kar paye. Aapke experience mein enterprise deals mein maximum time aur energy kis cheez ne kha li hoti hai?',
   'bip_day',now()-interval '23 days'),
  (bip,u[1+mod(11,ulen)],
   'Day 95 — Hired first sales guy on 100% commission',
   'First sales hire ke liye budget zero tha, isliye ek hungry banda liya jo 100% commission pe ready tha, koi fixed nahi. 45 days mein 27 demos aur 6 closes de ke banda prove ho gaya, lekin stability aur attrition ka risk mind mein ghoom raha hai. Long term view se aap log aise commission-only sales wale model ko kitna sustainable maante ho?',
   'bip_day',now()-interval '25 days'),
  (bip,u[1+mod(12,ulen)],
   'Day 118 — Reduced AWS bill from $1200 → $180/mo',
   'AWS bill $1200/month se directly dard de raha tha, especially jab MRR utna bada nahi tha and har mahine founder ka BP badh raha tha. Reserved instances, S3 lifecycle rules, thoda sa RDS tuning aur kuch services ko cheaper provider pe move karke bill $180/month pe aa gaya. Aap log jab cloud cost optimize karna start karte ho to pehla attack point kya hota hai?',
   'bip_day',now()-interval '27 days'),
  (bip,u[1+mod(13,ulen)],
   'Day 63 — Cold emailed 300 US founders, 42 replies, 6 paying',
   '300 US founders ko cold email blast gaya, 42 ne reply maara and 6 paying ban gaye – SDR team nahi thi, sirf founder + Apollo + instantly.ai ka jugaad tha. Subject line pe A/B kara, Loom demo links bheje and LinkedIn profile ko thoda founder-brand style mein polish kiya. Aapko lagta hai cold email mein sabse core lever kya hota – subject, social proof ya offer clarity?',
   'bip_day',now()-interval '29 days'),
  (bip,u[1+mod(14,ulen)],
   'Day 157 — Burnout hit hard. Taking 1 week off',
   'Last 2 months mein kaafi push diya, and phir ek din literally body ne shutdown signal bhej diya – burnout legit lag raha hai, laptop dekh ke bhi irritation aa raha tha. Stripe and Notion ke numbers theek chal rahe hain, par brain fog heavy ho gaya, isliye finally 1 week ka proper break block kiya calendar mein. Aap log burnout se nikalne ke liye kya real plan follow karte ho, not just Instagram quotes?',
   'bip_day',now()-interval '31 days'),
  (bip,u[1+mod(15,ulen)],
   'Day 82 — Added UPI recurring. Retention +19%',
   'UPI recurring add karne ke baad logon ne card details bharne ka drama hi khatam kar diya, especially tier-2 users suddenly zyada comfortable lag rahe hain. Razorpay subscriptions mein UPI mandate ka adoption dekh ke retention graph 19% up chala gaya month-on-month. Aapke product mein default payment mode ab kya ban chuka hai – UPI, cards ya kuch aur?',
   'bip_day',now()-interval '33 days'),
  (bip,u[1+mod(16,ulen)],
   'Day 126 — Got featured on a 100k-sub newsletter. Traffic ×6',
   'Ek 100k-sub newsletter ne casually hamara tool mention kar diya and next 48 hours mein traffic 6x ho gaya, server logs dekh ke literally dar bhi laga aur thrill bhi. Par sach bolu to landing page pe proper lead magnet ready nahi tha, to kaafi value leak ho gayi. Agar aapko aisa newsletter spike milta to sabse pehle kis funnel piece ko tighten karte?',
   'bip_day',now()-interval '35 days'),
  (bip,u[1+mod(17,ulen)],
   'Day 109 — Refactored auth. Login speed ×3',
   'Auth system pe 2 saal se banda nahi dala tha, har naya feature wahi fragile login flow ke aas paas hack ho raha tha and bugs random nikal rahe the. Last sprint poora RefactorAuth naam se gaya and ab login 3x faster hai plus support tickets kam ho gaye. Aapke experience mein auth refactor karte time sabse bada pain point kya hota hai – legacy users, mobile apps ya third-party logins?',
   'bip_day',now()-interval '37 days'),
  (bip,u[1+mod(18,ulen)],
   'Day 144 — Crossed 10k daily active users',
   '10k daily active users dekhna mast lagta hai, lekin ab har small bug ya downtime ka multiplier effect bhi 10x ho gaya and stress real hogaya. Mixpanel, PostHog, Sentry sab pe dashboards alag cheezon ke liye scream kar rahe hain. Aap is stage pe ek core metric choose karna pade to kis pe obsess karoge – retention, latency, ARPU ya crash rate?',
   'bip_day',now()-interval '39 days'),
  (bip,u[1+mod(19,ulen)],
   'Day 67 — First 100 customers via LinkedIn only',
   'First 100 customers sirf LinkedIn se aaye – daily ek post, kuch DMs, kuch comments aur calendar auto-fill hone laga. Koi agencies nahi, koi ads nahi, sirf founder ka personal brand + honest build-in-public updates ne kaam kiya. Aap logne LinkedIn se first paying users lane ke liye kya approach use kiya tha?',
   'bip_day',now()-interval '41 days'),
  (bip,u[1+mod(20,ulen)],
   'Day 131 — Launched Android app. 12k downloads week 1',
   'Android app live hote hi first week mein 12k downloads aa gaye, lekin Play Store reviews padhna ek emotional rollercoaster tha – 5 star bhi, 1 star bhi. Firebase Crashlytics pe spikes aa rahe the and product team Notion board pe fire-fighting mode mein chali gayi. Aapke according mobile launch se pehle sabse bada dar kis cheez ka hota hai – rejection, bugs, reviews ya servers down?',
   'bip_day',now()-interval '43 days'),
  (bip,u[1+mod(21,ulen)],
   'Day 98 — NPS jumped from 38 → 71',
   'NPS pehle 38 ke aas paas atka hua tha, log bolte the product thik hai but love nahi aa raha. Pichle 2 months mein onboarding, support tone and small friction points pe kaam karke NPS 71 tak chala gaya and ab log tweet karke praise bhi kar rahe hain. Aapke experience mein NPS jump karwane ka fastest hack kya tha?',
   'bip_day',now()-interval '45 days'),
  (bip,u[1+mod(22,ulen)],
   'Day 115 — Added vernacular support. Tier-2 signups ×4',
   'Vernacular support add karte hi Hindi + a few regional languages mein Tier-2 signups literally 4x ho gaye, log chat mein likhne lage "ab samajh aa raha hai". Pehle English-only UI dekh ke trust gap dikhta tha, ab lagta hai brand thoda local lag raha hai. Aap logone multiple languages add karne ke baad sabse bada upside kis front pe dekha – reach, trust, referrals ya retention?',
   'bip_day',now()-interval '47 days'),
  (bip,u[1+mod(23,ulen)],
   'Day 88 — Pricing page A/B test running',
   'Pricing page pe ek hi boring version 1 saal se chal raha tha and hum sab sirf guess kar rahe the ki kya better kaam karega. Ab finally A/B test chalu kiya hai – copy, layout, testimonials sab ke variations Figma se live ja rahe hain and Stripe events dekh ke daily post-mortem ho raha hai. Agar aapko sirf ek cheez change karni ho pricing page pe shuruat mein, to kya chunege?',
   'bip_day',now()-interval '49 days'),
  (bip,u[1+mod(24,ulen)],
   'Day 137 — First angel investment ₹2 Cr',
   'First angel cheque ₹2 Cr ka aaya to Notion fundraise doc close ki, lekin next hi din Excel open karke sochna pada ki ab iska sabse sensible use kya hai. Marketing, hiring, product rebuild, founder salary – sab tempting dikh raha hai but runway bhi secure rakhna hai. Aapke first angel cheque ka pehla major spend kis bucket mein gaya tha?',
   'bip_day',now()-interval '51 days'),
  (bip,u[1+mod(25,ulen)],
   'Day 76 — Fixed 47 bugs today',
   'Ek hi din mein 47 bugs close kiye – Jira board finally green dikh raha hai but dimaag halke se toasted lag raha hai. Team ne isko bug bash day bol diya and pura Zoom call memes + chaos ke saath chala, par users ke liye experience finally smooth ho raha hai. Aap apne bug backlog ko kaise handle karte ho – ek din ka massacre, weekly triage ya sirf jab users chillate hain tab?',
   'bip_day',now()-interval '53 days'),
  (bip,u[1+mod(26,ulen)],
   'Day 122 — Referral program live. 31% of new users',
   'Referral program soft launch kiya tha and within 3 weeks 31% new users sirf existing customers ke through aa rahe hain, CAC graph dekh ke thoda sukoon mila. In-product prompts + small credits ne logon ko naturally dost ko tag karne pe push kiya. Aapke liye referral program ka sabse effective reward type kya raha – cash, credits, free months ya sirf swag?',
   'bip_day',now()-interval '55 days'),
  (bip,u[1+mod(27,ulen)],
   'Day 105 — Started hiring in Pune',
   'Hiring hamesha Bangalore ya Mumbai soch ke start hoti thi, but cost, churn and commute dekh ke ab Pune pe serious bet lagaya hai. Talent pool decent, salary expectations thode saner and culture bhi chilled lag raha hai compared to metro chaos. Aapki hiring strategy mein location ka kya role hai – sirf Delhi-NCR, tier-2 focus, ya full remote?',
   'bip_day',now()-interval '57 days'),
  (bip,u[1+mod(28,ulen)],
   'Day 148 — Revenue crossed ₹2.1 Cr this year',
   'Is saal revenue ₹2.1 Cr cross kar gaya, jo 1 saal pehle whiteboard pe sirf random dream lagta tha. Lekin ab lag raha hai ki yeh number bhi baseline hi hai, actual game to ab scale, team aur systems ka hai. Aap log jab 2 Cr mark cross kiya tha, tab founder focus sabse zyada kis cheez pe shift hua tha?',
   'bip_day',now()-interval '59 days'),
  (bip,u[1+mod(29,ulen)],
   'Day 93 — Competitor copied our landing page',
   'Kal subah utha to kisi ne DM bheja screenshot ke saath – competitor ne poora landing page almost copy paste kar diya, sirf logo change. Pehle gussa aaya, phir socha that maybe we are doing something right if they are cloning this hard. Aap hote to isko ignore karte, public call-out marte, ya seedha legal notice bhejte?',
   'bip_day',now()-interval '61 days'),
  (bip,u[1+mod(30,ulen)],
   'Day 129 — Launched dark mode',
   'Dark mode ke liye log months se Twitter pe comment kar rahe the, finally ship kiya and first 24 hours mein 40% active users ne toggle try kar liya. Product technically same hai, par perception mein "premium" feel aa gaya and screenshots share hone lage social pe. Aapke app mein dark mode type feature ne real impact dala tha ya sirf hype hi nikla?',
   'bip_day',now()-interval '63 days'),
  (bip,u[1+mod(31,ulen)],
   'Day 84 — Reduced customer support tickets 60% with AI bot',
   'Support tickets pehle roz ka headache the, har second user same sawal puch raha tha and team burnout ke edge pe thi. Ek AI bot + better help center + in-app guides ship kiye aur 60% tickets cut ho gaye within 3 weeks, Freshdesk dashboard finally thoda green dikh raha hai. Aap log ke liye tickets kam karne ka sabse effective lever kya raha – docs, bots, ya community?',
   'bip_day',now()-interval '65 days'),
  (bip,u[1+mod(32,ulen)],
   'Day 152 — First 50k total users',
   'Total user count 50k cross kar gaya and maza bhi aa raha hai plus pressure bhi ki ab koi bhi change ka blast radius bada hota hai. Celebrations ka mood hai but saath hi lag raha hai ki ab systems, analytics aur support sab level up karna padega. Aap log aise milestone pe kya karte ho – offsite, dinner, social media flex ya bas kaam chalu rakho?',
   'bip_day',now()-interval '67 days'),
  (bip,u[1+mod(33,ulen)],
   'Day 69 — First profitable month ever',
   'First profitable month dekh ke literally sheet print karke wall pe laga diya, after saalon ka burn and runway anxiety finally thoda peace mila. Lekin ab tough choice hai – profit ko double down growth mein daalo ya thoda cushion bana ke risk kam karo. Jab aap profitable hue the first time, us extra cash ka sabse pehla use kya tha?',
   'bip_day',now()-interval '69 days'),
  (bip,u[1+mod(34,ulen)],
   'Day 140 — Still building. No noise, sirf kaam',
   '140 days ho gaye, koi glam LinkedIn post nahi, koi podcast nahi, sirf deep work and shipping mode – "no noise, sirf kaam" literal mantra bana diya. Social media FOMO aata hai kabhi kabhi, but product velocity aur user love dono up hain. Jab aap aise monk mode mein jaate ho, sabse pehle kya cut karte ho – socials, events, side projects ya hiring speed?',
   'bip_day',now()-interval '71 days');

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
   '"No noise, sirf kaam" waali phase mein kya cut karoge?',
   '["Social media","Events","Side projects","Hiring speed"]'::jsonb);

  ------------------------------------------------------------------
  -- POST 36–70 Network Requests (35 posts)
  ------------------------------------------------------------------
  INSERT INTO forum_posts(community_id,user_id,content,body,post_type,created_at) VALUES
  (net,u[1+mod(35,ulen)],
   'Peak XV / Accel partner intro chahiye — ₹90k ARR, 44% MoM',
   'Currently hum ₹90k ARR pe hain, 44% MoM grow kar rahe hain without paid spend, aur product stack pura AWS + Postgres + Next.js pe hai. Peak XV ya Accel wale partner ke saath ek serious conversation chahiye jahan numbers, retention aur GTM honestly table pe daal sake. Agar aap hote to aise intro ke badle kya value add promise karoge taaki dono side win-win lage?',
   'request',now()-interval '2 days'),
  (net,u[1+mod(36,ulen)],
   'Zerodha growth team contact? Hiring first PM',
   'Zerodha ka growth engine kaafi time se benchmark bana hua hai, unke experiments, nudge design and trust-led branding insane lagta hai. Hum apne fintech-ish product ka first PM hire kar rahe hain and un jaise playbook samajhna chaahte hain directly from their growth / product folks. Agar kisi ke network mein Zerodha growth ya product team ka banda hai, referral kaise structure karoge – intro, coffee chat ya paid consult?',
   'request',now()-interval '4 days'),
  (net,u[1+mod(37,ulen)],
   'Co-founder chahiye — React Native + AI. Delhi only',
   'React Native + AI heavy stack pe ek consumer app bana rahe hain jo daily use wali habit build kare, ab tak solo hi code likh raha hoon and speed limit hit ho gaya. Remote wale experiments kiye but time zone, commitment aur vibe match nahi hua, isiliye ab Delhi based co-founder hi chahiye jo ground pe mil sake. Aap log technical co-founder dhundne ke liye kaunsa channel sabse zyada trust karte ho – X, LinkedIn, meetups ya college network?',
   'request',now()-interval '6 days'),
  (net,u[1+mod(38,ulen)],
   'RBI fintech team se baat karni hai',
   'Product pura compliant direction mein jaa raha hai but RBI ke POV se clarity chahiye before scale, warna kal ko koi random circular aa gaya to pura stack hil jayega. Abhi tak sirf lawyers aur Twitter threads se samajh rahe hain, par directly fintech team se baat karke line of sight clear karna hai. Aise time pe aap kya ready rakhoge – compliance deck, live product demo, ya sirf honest intent aur questions?',
   'request',now()-interval '8 days'),
  (net,u[1+mod(39,ulen)],
   'PhonePe enterprise sales intro',
   'Hum ek B2B fintech integration build kar rahe hain jahan UPI, rewards aur checkout experience ko PhonePe jaisi apps ke through unlock karna logical next step lagta hai. Inbound to aayega nahi, so someone who knows enterprise sales ya partnerships side se intro ho jaye to validation + pilot dono fast ho sakte hain. Agar aap ke paas aisa intro hota to uske badle kya expectation rakhte – rev share, ESOP ya sirf goodwill?',
   'request',now()-interval '10 days'),
  (net,u[1+mod(40,ulen)],
   'Looking for D2C logistics head — Gurgaon based',
   'D2C brand side pe humne 12k+ orders ship kiye hain last quarter but logistics stack ab bhi thoda jugaad mode pe hai – Excel + WhatsApp + partial TMS. Ab full-time Gurgaon based logistics head chahiye jo 3PLs, dark stores, SLAs sab handle kare and founder ko daily ops se thoda free kare. Aapke hisaab se aisa senior logistics banda kis background se best aata hai – big courier, D2C ya consulting type?',
   'request',now()-interval '12 days'),
  (net,u[1+mod(41,ulen)],
   'ESOP policy template for 10–15 member startup?',
   'Team ab 12 log ki ho gayi hai aur ESOP structure abhi bhi Notion doc + Google Sheet combo pe chal raha hai, jo honestly scary lagne laga. Clear, founder-friendly ESOP policy chahiye jo 10–15 member startup ke liye fair bhi ho aur future fundraise pe messy na lage. Aapke setup mein pool size aur policy design karte waqt sabse important factor kya tha?',
   'request',now()-interval '14 days'),
  (net,u[1+mod(42,ulen)],
   'Need CA who understands Delaware + India holding structure',
   'Parent company Delaware C-corp hai, India mein full ops ho rahe hain and ab tak 2 alag CAs contradictory advice de chuke hain structure pe. Tax, compliance, future US investors aur India exits sab ko dhyan mein rakh ke kisi aise CA ki need hai jo dono jurisdictions practically samjhta ho, sirf theory nahi. Aap log ne cross-border structure choose karte time primary driver kya rakha tha – investors, tax, brand ya FOMO?',
   'request',now()-interval '16 days'),
  (net,u[1+mod(43,ulen)],
   'Strong B2B SaaS closer in Noida — any referrals?',
   'Outbound motion theek chal raha hai but close karne ke time pe founder ko hi jump in karna padta hai, jo scale nahi hoga. Noida based strong B2B SaaS closer chahiye jo ₹20–80L ACV wale deals sambhal sake aur HubSpot + Gong type stack ke saath comfortable ho. Aap log apne closers ko pay kaise structure karte ho taaki hunger bhi rahe aur stability bhi?',
   'request',now()-interval '18 days'),
  (net,u[1+mod(44,ulen)],
   'Vision fund / late stage investor deck examples?',
   'Ham log abhi mid-stage pe phase change plan kar rahe hain and Vision Fund / late stage type investors ka thinking samajhna hai, sirf Seed/Series A deck nahi chalega. Real decks dekhna hai jahan unit economics, category leadership aur scale story clearly articulate ho. Aapke experience mein late stage decks mein sabse hard hitting cheez kya rahi – numbers, story, team depth ya logo wall?',
   'request',now()-interval '20 days'),
  (net,u[1+mod(45,ulen)],
   'UI/UX designer experienced with dashboards — part time',
   'Dashboard heavy SaaS bana rahe hain jahan UX ab tak founder-designed hai (read: thoda jugadu). Ab part-time UI/UX designer chahiye jo complex metrics ko simple bana sake and Figma + design systems ka solid experience ho. Aap log aise designer ko brief dete waqt kya primary format use karte ho – Loom, Figma wireframe, Notion doc ya live call?',
   'request',now()-interval '22 days'),
  (net,u[1+mod(46,ulen)],
   'Looking for GTM advisor for HRtech, India + Middle East',
   'India + Middle East HRtech ka GTM alag nature ka hai, yahan HR buyers, payroll vendors aur compliances sab mix hote hain. Humne inbound, cold outbound dono try kiya but ab lagta hai ki experienced GTM advisor chahiye jisko real deals close karne ka ground experience ho. Aap log aise advisor ke saath kaunsa structure prefer karte ho – equity, cash, mix ya pay per lead?',
   'request',now()-interval '24 days'),
  (net,u[1+mod(47,ulen)],
   'Payroll tool recommendations for 40-member remote team',
   'Remote team 40 log ki hai across India and abhi payroll + compliance jugadu tools pe chal raha hai jo har month chaos create kar dete hain. Ek aisa payroll tool chahiye jo ESIC, PF, TDS, state wise compliance sab handle kare and HR ko Notion + Excel se mukti mile. Jab aapne payroll stack choose kiya tha to top priority kya thi – compliance, UX, cost ya integrations?',
   'request',now()-interval '26 days'),
  (net,u[1+mod(48,ulen)],
   'Any good coworking in Gurgaon with 24x7 access?',
   'Founders ke liye 24x7 access wala workspace chahiye jahan raat 2 baje bhi build kar sakte ho aur din mein clients ko bula bhi sakte ho without embarrassment. Gurgaon mein kuch spaces dekhe but ya to vibe corporate hai ya phir internet unreliable. Coworking choose karte waqt aap log ka primary filter kya hota – location, 24x7, community ya pricing?',
   'request',now()-interval '28 days'),
  (net,u[1+mod(49,ulen)],
   'Need intro in ONDC team for grocery pilot',
   'ONDC grocery pilot ke liye hum ek niche tech layer build kar rahe hain jisse small kirana brands ko structured presence mil sake. Team small hai but product live hai, ab ONDC ke core team se ek conversation chahiye to see if pilot fit banta hai. Aap log ke hisaab se ONDC jaisi cheez experiment karne ke liye brand kis stage pe ideal hota – idea, pilot, PMF ya scaling?',
   'request',now()-interval '30 days'),
  (net,u[1+mod(50,ulen)],
   'Delhi-NCR startup lawyer who is actually founder-friendly?',
   'Delhi-NCR mein humne 3–4 lawyers test kiye, kisi ka meter client call start hote hi chalu ho jata hai, kisi ka startup understanding weak hai. Ab aise lawyer ki need hai jo seed/Series A docs, ESOP, SHA sab founder-friendly tareeke se samjha sake, na ki sirf 20 page PDF bhej de. Aapke experience mein founder-friendly lawyer ka sabse clear sign kya hota hai?',
   'request',now()-interval '32 days'),
  (net,u[1+mod(51,ulen)],
   'Any content studio for founder podcasts in Delhi?',
   'Founders ke liye podcast style content banana hai jahan hum raw journey, metrics aur breakdowns discuss karein, not just motivational gyaan. Delhi mein aisa content studio chahiye jahan audio treated ho, decent cameras ho aur editor bhi ho jo SaaS / startup context samjhe. Aapke liye founder podcast ka main goal kya raha hai – leadgen, brand, networking ya khud ki therapy?',
   'request',now()-interval '34 days'),
  (net,u[1+mod(52,ulen)],
   'ISO mentor who has exited SaaS at $10M+ ARR',
   'ARR abhi low-7 figures ke around hai and agency wale advice de rahe hain but koi aisa mentor chahiye jiska khud ka SaaS exit $10M+ ARR pe hua ho. Vision, org design, second line leaders, sab topics pe kisi real operator se baat karna chahte hain not just investors. Aap mentor se ideal cadence kya rakhte ho taaki signal mile but dependence bhi na ho?',
   'request',now()-interval '36 days'),
  (net,u[1+mod(53,ulen)],
   'Looking for CTO-for-equity, data infra + AI heavy product',
   'Product data infra + AI heavy hai, abhi tak contractor + founder combo se bana hai but long term ke liye serious CTO level owner chahiye. Salary pe afford nahi kar sakte, isliye equity-for-time wala model soch rahe hain jahan banda infra, security, roadmap sabka owner bane. Aapke hisaab se aise CTO-for-equity deals mein sensible equity range kya hoti hai?',
   'request',now()-interval '38 days'),
  (net,u[1+mod(54,ulen)],
   'Need 5–6 beta customers for B2B sales outreach tool',
   'Ham ek B2B sales outreach tool bana rahe hain jo LinkedIn + email data ko mix karke targeted sequences banata hai, abhi internal team pe hi run ho raha hai. Ab 5–6 serious beta customers chahiye jo feedback de sakte hain, features push karwa sakte hain and hum unke liye kuch custom build bhi karenge. Beta customers ko onboard karne ke liye aapka go-to magnet kya raha – lifetime discount, free months, custom features ya advisory shares?',
   'request',now()-interval '40 days'),
  (net,u[1+mod(55,ulen)],
   'Intro to CRED partnerships team for co-branded campaign',
   'CRED jaise brand ke saath co-branded campaign karne se trust, downloads aur CAC sab side pe impact aa sakta hai, isliye partnerships team tak reachable intro chahiye. Product unke audience ke liye relevant hai but cold email se response low aa raha hai. Brand collab ke liye aapka best performing outreach style kya tha – cold email, warm intro, LinkedIn ya events?',
   'request',now()-interval '42 days'),
  (net,u[1+mod(56,ulen)],
   'Any hiring agency good at senior tech roles under ₹60L?',
   'Senior tech roles ke liye khud hiring karte karte thak gaye, har role ke liye 100 CV dekhne ka bandwidth nahi hai. Aisi agency chahiye jo ₹40–60L ke range mein solid principal engineer / architect type log la sake without inflated promises. Agencies ko fee model decide karte waqt aap log kya prefer karte – % of CTC, flat fee, retainer ya pure success based?',
   'request',now()-interval '44 days'),
  (net,u[1+mod(57,ulen)],
   'Looking for fractional CMO for 6 months, growth stage',
   'Growth stage pe marketing ka scene scattered hai – kuch channels profitable, kuch vanity, aur founder hi CMO bhi bana hua hai. 6 month ke liye ek strong fractional CMO chahiye jo experiment design, team structure aur channel P&L sab clean kar sake. Aapke liye fractional CMO ka primary KPI kya hota – leads, revenue, brand recall ya team setup?',
   'request',now()-interval '46 days'),
  (net,u[1+mod(58,ulen)],
   'Need Delhi-based video editor for YouTube-style ads',
   'Ham YouTube style performance ads chala rahe hain jahan founder face + UGC mix chal raha hai, but Delhi based editor chahiye jo fast turnaround de sakta ho. Abhi remote editors ke saath deadlines slip ho rahe hain aur context samjhane mein time ja raha hai. Ad editor ko hire karte waqt aap sabse zyada kis skill pe weightage rakhte ho – speed, story sense, platform expertise ya all-in-one?',
   'request',now()-interval '48 days'),
  (net,u[1+mod(59,ulen)],
   'Who knows SRM / Manav Rachna placement heads? Want to hire freshers',
   'Freshers pipeline ke liye SRM / Manav Rachna jaise colleges perfect lag rahe hain – hungry bachche, decent skills and NCR proximity. Placement heads se direct connect chahiye taaki founder-led hiring drive kar sake instead of random naukri postings. Freshers hire karte waqt aap ke liye sabse important signal kya hota – attitude, college brand, projects ya referrals?',
   'request',now()-interval '50 days'),
  (net,u[1+mod(60,ulen)],
   'Need intro to MSME banker in Delhi for working capital line',
   'Working capital line kholne ka soch rahe hain kyunki receivables 45–60 days ke ho gaye hain and payroll + AWS bill month start mein aa jata hai. Delhi mein aisa MSME banker chahiye jo startup numbers samjhe, sirf collateral aur ITR nahi dekhe. Aap log ne working capital facility kab li – early days, PMF ke baad ya sirf jab cash crunch aya?',
   'request',now()-interval '52 days'),
  (net,u[1+mod(61,ulen)],
   'Any good PR agency for tech in India <₹1L/mo?',
   'Tech PR ke liye India mein kaafi agencies DM kar rahi hain but majority ya to overpromise karti hain ya sirf generic coverage dikhati hain. <₹1L/month budget mein koi aisa chahiye jo founder story, product and numbers ko sahi tarike se position kar sake. Jab aapne PR agency choose ki, sabse important metric kya raha – unke clients, past coverage, pricing ya founder chemistry?',
   'request',now()-interval '54 days'),
  (net,u[1+mod(62,ulen)],
   'Someone with experience in govt tenders for SaaS?',
   'Govt tenders ke through SaaS bechna tempting lagta hai kyunki ticket size bada hota hai, but process, payments aur documentation ka load bhi heavy hota hai. Kisi aise insaan ki need hai jisko eprocurement portals, RFP responses aur empanelment ka real ground experience ho. Aapke liye govt tender game all-in bet hai, side experiment ya complete no-go?',
   'request',now()-interval '56 days'),
  (net,u[1+mod(63,ulen)],
   'Looking for community manager for founders-only group in Gurugram',
   'Gurugram mein founders-only community build kar rahe hain jahan dinners, AMAs aur deep-dive sessions ho sakein, not just networking selfies. Ab aisa community manager chahiye jo high-signal log la sake, filter maintain kare aur events ko boring na hone de. Founder communities ko alive rakhne ka aapka proven hack kya raha – weekly events, quality filters, memes ya small cohorts?',
   'request',now()-interval '58 days'),
  (net,u[1+mod(64,ulen)],
   'Need early-stage healthtech founders for closed WhatsApp group',
   'Early-stage healthtech founders ke liye ek closed WhatsApp group banana hai jahan log GTM, hospital sales aur compliance ke bare mein honestly baat kar sakein. Spam free, no-pitch zone maintain karne ke liye size aur curation dono important honge. Aapke experience mein niche WhatsApp community ka ideal size kya hai jahan signal high rahe?',
   'request',now()-interval '60 days'),
  (net,u[1+mod(65,ulen)],
   'ESOP buyback vendor recommendations?',
   'ESOP buyback ka thought aa raha hai kyunki cash position theek hai and team ko long-term signal dena hai ki yeh paper money nahi hai. Market mein kuch vendors mile jo cap table + payouts automate karte hain but reviews mixed hain. Aapke view mein ESOP buyback ka sabse strong signal kya jata hai team aur market ko?',
   'request',now()-interval '62 days'),
  (net,u[1+mod(66,ulen)],
   'Anyone running outbound SDR team from Noida? Want to visit office',
   'Noida mein ek SDR floor dekhna hai jo daily 100–150 dials, LinkedIn sequences aur HubSpot hygiene maintain karta ho to learn ops. Apne outbound engine ko scale karne se pehle kisi existing high-output machine ko dekhna helpful rahega. Aap jab SDR team run karte ho to main dashboard metric kya dekhte ho daily basis pe?',
   'request',now()-interval '64 days'),
  (net,u[1+mod(67,ulen)],
   'Hiring ops lead for dark-kitchen brand in South Delhi',
   'Dark-kitchen brand run kar rahe hain jahan Swiggy/Zomato pe 4.3+ rating maintain hai but ops founder ke shoulders pe zyada aa rahe hain. South Delhi base chahiye jahan se vendor management, kitchen staff and delivery coordination sab handle ho sake. Aapke experience mein dark kitchen ops ke liye must-have skill kya hai – vendors, data, team ya crisis handling?',
   'request',now()-interval '66 days'),
  (net,u[1+mod(68,ulen)],
   'Looking for founder dinner group in Delhi on 2nd Fridays',
   'Har mahine 1 baar founder dinner karna chahte hain Delhi mein jahan 8–12 log genuinely deep conversation kar sakein about numbers, team and life – not just pitch fest. 2nd Friday fix karne ka plan hai taaki log calendar block kar sakein. Aapke view mein founder dinner ka ideal format kya hota – free-flow, topic based, hot-seat ya mix?',
   'request',now()-interval '68 days'),
  (net,u[1+mod(69,ulen)],
   'Need Delhi-based angel who understands SaaS infra, ₹25–50L cheque',
   'SaaS infra heavy product hai jahan ACV ₹5–20L se start hota hai, to aise Delhi-based angel chahiye jo infra, devtools aur B2B motion ko samjhta ho. ₹25–50L ka cheque size ideal rahega with someone who can open 3–4 serious doors as well. Aapke liye ideal angel profile kaunsa raha – ex-founder, CXO, pure investor ya family office type?',
   'request',now()-interval '70 days');

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
  INSERT INTO forum_posts(community_id,user_id,content,body,post_type,created_at) VALUES
  (wins,u[1+mod(70,ulen)],
   'Win — First ₹1L day in revenue. All organic from Instagram Reels',
   'Instagram Reels se organically 1L ka first revenue day aaya aur Shopify dashboard dekh ke literally ghar pe cake cut hua. Koi agency nahi, sirf founder + ek editor + Canva + Meta Ads manager mein zero spend. Aapke hisaab se iss milestone ke baad next obsession kya hona chahiye – daily ceiling push, systems ya team?',
   'win',now()-interval '6 days'),
  (wins,u[1+mod(71,ulen)],
   'Win — Churn dropped from 9% → 3.4% in 2 months after revamp',
   'Do months pehle churn 9% tha and har month cohort chart dekh ke stomach tight ho jata tha. Customer interviews, better onboarding flows aur kuch features kill karne ke baad churn 3.4% tak aa gaya and MRR graph finally compounding jaisa lag raha hai. Aapke journey mein churn improve karne ka sabse underrated lever kya nikla?',
   'win',now()-interval '8 days'),
  (wins,u[1+mod(72,ulen)],
   'Win — Hired killer founding engineer from IIT-D without any recruiter',
   'IIT-D se ek founding engineer onboard hua bina recruiter ke, sirf LinkedIn DMs, weekend coffee aur Notion docs se convince kiya. Banda current CTC ki jagah ownership aur architecture control ke liye join hua, jo dil se win lag raha hai. Aap logne apne killer founding engineer ko kaise convince kiya tha – vision, equity ya culture se?',
   'win',now()-interval '10 days'),
  (wins,u[1+mod(73,ulen)],
   'Win — Invoice of ₹38L cleared in 6 days by PSU client. Shocked.',
   'PSU client ka ₹38L ka invoice 6 din mein clear ho gaya, jo honestly humne khud bhi expect nahi kiya tha after hearing horror stories. Internal finance team ne bhi bola yeh toh record hai unke hisaab se. Aap hote to PSU ke saath kaam karne ko yes bolte ya inko avoid hi rakhte?',
   'win',now()-interval '12 days'),
  (wins,u[1+mod(74,ulen)],
   'Win — Switched from cold email to founder-led LinkedIn content, demo calls doubled',
   'Cold email se thak ke founder-led LinkedIn content pe shift hua and within 4 weeks demo calls literally double ho gaye. Roz ek solid, honest post with numbers + screenshot + learnings ne logon ko DM karne pe majboor kar diya. Aapke liye founder-led distribution ka sabse powerful channel kaunsa raha?',
   'win',now()-interval '14 days'),
  (wins,u[1+mod(75,ulen)],
   'Win — First time saying "No" to misfit investor even with term sheet on table',
   'Pehla baar life mein aise investor ko "No" bola jiske paas term sheet ready thi but vibes and expectations off the charts misaligned the. Us din raat ko neend thodi kam aayi, lekin agle din Notion roadmap dekh ke sukoon mila ki direction clear hai. Aap misfit investor ko kaise spot karte ho before it is too late?',
   'win',now()-interval '16 days'),
  (wins,u[1+mod(76,ulen)],
   'Win — Team offsite in Rishikesh on profits, no investor money used',
   'Rishikesh offsite pure profits se fund hua, kisi VC ke paise se nahi, and team ne Ganga ke kinare standup kiya instead of Zoom. Slack pe photos ka spam dekh ke culture ka real compounding feel hua. Aapke view se team offsite ka budget founder mindset se kitna aggressive ya lean hona chahiye?',
   'win',now()-interval '18 days'),
  (wins,u[1+mod(77,ulen)],
   'Win — Customer success playbook cut tickets by 40% in 30 days',
   'Customer success playbook Notion mein likhna boring lag raha tha, but jab 30 din baad tickets 40% cut ho gaye to sabko realization aaya ki process bhi product jaisa hi hota hai. Response SLAs, tone guide, macros – sab ne milke support ko firefighting se system mein convert kar diya. Aapke CS playbook ka pehla section kis cheez pe focus karta hai?',
   'win',now()-interval '20 days'),
  (wins,u[1+mod(78,ulen)],
   'Win — Switched to annual plans, cash in bank 3x without new fundraise',
   'Monthly cash flow constant stress tha, phir ek quarter mein humne aggressive annual plans push kiye and cash in bank 3x ho gaya without koi naya fundraise. Psychological comfort alag level ka hai when runway looks thick on the dashboard. Aapko annual plans push karne ka main risk kya lagta hai?',
   'win',now()-interval '22 days'),
  (wins,u[1+mod(79,ulen)],
   'Win — Got featured on front page of YourStory without paying for it',
   'YourStory ke front page pe feature aaya without kisi PR agency ko paisa diye and suddenly relatives WhatsApp pe link bhejne lage. Lead spike itna nahi tha but hiring aur investor interest pe clearly effect dikha. Aapke experience mein media feature ka asli ROI kahaan feel hota hai?',
   'win',now()-interval '24 days'),
  (wins,u[1+mod(80,ulen)],
   'Win — 3 senior folks joined from FAANG on below-market salaries because of mission',
   '3 senior folks FAANG se join hue below-market salary pe sirf mission aur ownership ke chakkar mein, jo ek tarah ka culture validation laga. Unke aane se engineering discipline, reviews aur roadmap sab ek dum next level pe chale gaye. Senior hires ke saath sabse bada challenge aapko kis front pe feel hua?',
   'win',now()-interval '26 days'),
  (wins,u[1+mod(81,ulen)],
   'Win — Office shifted from cafe corners to small but our own space in Noida Sec 62',
   'Cafe corners se calls, noisy background aur WiFi drops – sab karke finally Noida Sec 62 mein chota sa office le liya, apna board lagaya and first day team ne floor pe hi maggi kha ke celebrate kiya. Rent lean hai but psychological shift massive feel ho raha hai. First office choose karte waqt aapki top priority kya thi?',
   'win',now()-interval '28 days'),
  (wins,u[1+mod(82,ulen)],
   'Win — Referral engine kicked in, 54% of MRR now via word-of-mouth',
   'Referral engine finally snap in hua and ab 54% MRR sirf word-of-mouth se aa raha hai, CAC sheet dekh ke literally aankhon ko sukoon mil raha hai. In-product prompts + CS calls ne existing happy customers ko amplify kar diya. Aap referrals ko nudge karne ke liye sabse zyada effective lever kya use karte ho?',
   'win',now()-interval '30 days'),
  (wins,u[1+mod(83,ulen)],
   'Win — Finally paying both co-founders a modest salary after 18 months zero pay',
   '18 months tak co-founders ne zero salary li, ghar se side support chal raha tha and har mahine thought aata tha ki kab tak. Ab finally modest salary start hui and parents ko bhi lagne laga ki "startup ka kuch ho raha hai". Aapke hisaab se founder salary realistically kab start honi chahiye?',
   'win',now()-interval '32 days'),
  (wins,u[1+mod(84,ulen)],
   'Win — UGC creators giving 10x ROAS compared to big agency ads',
   'UGC creators se banaye gaye raw, slightly imperfect ads ne big agency glossy films ko literally 10x ROAS se beat kar diya. Users ko lagta hai real log use kar rahe hain, not actors. Aap UGC creators ko kaise onboard karte ho – agency, direct DMs, platforms ya friends-of-friends loop se?',
   'win',now()-interval '34 days'),
  (wins,u[1+mod(85,ulen)],
   'Win — First US logo came inbound after a random Twitter thread',
   'Random Twitter thread pe apne product ke internal metrics share kiye and 4 din baad first US logo inbound aaya – full cycle remote, no travel. Time zones crazy the but trust us ek thread ne hi bana diya. Aapke liye US inbound crack karne ka strongest proof point kya raha – case studies, open roadmap, public numbers ya founder threads?',
   'win',now()-interval '36 days'),
  (wins,u[1+mod(86,ulen)],
   'Win — Moved from chaos stand-ups to written async updates, productivity up',
   'Daily chaos standups se team drain feel kar rahi thi, isliye shift kiya written async updates pe using Notion + Slack threads. 3 weeks ke andar meetings kam, clarity zyada and productivity genuinely up feel ho raha hai. Aap async culture start karne ke liye sabse pehla step kya loge?',
   'win',now()-interval '38 days'),
  (wins,u[1+mod(87,ulen)],
   'Win — Parent finally stopped asking "beta job kab karega?" after seeing numbers',
   'Parents har family function pe puchte the "beta job kab karega" and main unko Razorpay screenshots dikha ke samjhata tha. Last quarter ka profit and salary dekh ke finally unhone khud bola "ab theek hai, tu apna kaam kar". Aapne apne parents ko startup samjhane ke liye kya hack use kiya tha?',
   'win',now()-interval '40 days'),
  (wins,u[1+mod(88,ulen)],
   'Win — 0 to 100 paying customers in Delhi-NCR without a single free trial',
   'Delhi-NCR mein 0 se 100 paying customers tak ka journey poora paid tha, koi free trial nahi, sirf strong onboarding aur value-first demos. Ye dekh ke confidence aaya ki log pain feel karte hain to pay bhi karte hain bina freebies ke. Aapke hisaab se first 100 customers ka ideal mix kya hota hai?',
   'win',now()-interval '42 days'),
  (wins,u[1+mod(89,ulen)],
   'Win — Broke even on every channel, no loss-leader anymore in the funnel',
   'Channel-wise CAC, LTV aur payback pe kaam karke finally har acquisition channel at least break-even ya profitable ho gaya, koi aisa nahi bacha jo funnel ka "loss leader" ho. Ab growth experiments karte time guilt kam aur clarity zyada feel hoti hai. Aapne channel-level P&L kab se track karna start kiya tha honestly?',
   'win',now()-interval '44 days');

  ------------------------------------------------------------------
  -- 20 UNIQUE POLLS for Wins (posts 71–90)
  ------------------------------------------------------------------
  INSERT INTO forum_polls(post_id,question,options) VALUES
  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — First ₹1L day in revenue.%' LIMIT 1),
   '₹1L/day ke baad next milestone?',
   '["₹5L/day","₹10L/day","Global launch","Team expansion"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — Churn dropped from 9%' LIMIT 1),
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

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — First time saying "No" to misfit investor%' LIMIT 1),
   'Misfit investor ko kaise spot karte ho?',
   '["Misaligned values","Too pushy","Don''t get product","All of these"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — Team offsite in Rishikesh on profits%' LIMIT 1),
   'Team offsite ka budget founder view se?',
   '["Very lean","Decent","Lavish once/yr","Case by case"]'::jsonb),

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — Customer success playbook cut tickets by 40%' LIMIT 1),
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

  ((SELECT id FROM forum_posts WHERE content LIKE 'Win — Parent finally stopped asking "beta job kab karega?"%' LIMIT 1),
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
  INSERT INTO forum_posts(community_id,user_id,content,body,post_type,created_at) VALUES
  (fails,u[1+mod(90,ulen)],
   'Fail — Burnt ₹11L on fancy office before even hitting ₹50k MRR',
   '₹50k MRR pe hi fancy office le liya, glass walls, reception, espresso machine – sab kuch and 11 lakh burn ho gaye sirf vibe ke chakkar mein. 6 months baad realize hua ki customers ko Zoom se farak nahi padta, lekin runway half ho chuka hai. Aap office pe overspend avoid karne ke liye kaunsa simple framework use karte ho?',
   'failure',now()-interval '46 days'),
  (fails,u[1+mod(91,ulen)],
   'Fail — Hired VP Sales from unicorn, could not close even 1 deal in 5 months',
   'Unicorn se ek VP Sales hire kiya high CTC pe, impressive LinkedIn, but 5 mahine mein ek bhi deal close nahi hui because playbook high-velocity startup ke liye fit nahi tha. Internal SDRs demotivated ho gaye aur founder ko phir se frontline selling pe aana pada. Aapke hisaab se unicorn se senior hire karte waqt sabse bada red flag kya hota hai?',
   'failure',now()-interval '48 days'),
  (fails,u[1+mod(92,ulen)],
   'Fail — Switched product direction 3 times in 9 months, team almost quit',
   '9 months mein 3 baar product direction pivot kiya, Notion boards badalte gaye but team ka trust aur morale girta gaya. Har baar "yeh last pivot hai" bol ke roadmap change karte rahe and ek point pe logon ne openly pushback start kar diya. Aapke view se healthy pivot frequency kya honi chahiye taaki market bhi suno aur team bhi na toote?',
   'failure',now()-interval '50 days'),
  (fails,u[1+mod(93,ulen)],
   'Fail — Spent 3 months building feature nobody used, not even once',
   '3 months pure ek shiny feature pe lage, design, backend, QA sab hua and launch ke baad analytics mein literally 0 clicks dikhe – nobody even opened the tab. Ye dekh ke samajh aaya ki founder intuition alone enough nahi hai. Aap feature build karne se pehle minimum validation ke liye kya demand karte ho?',
   'failure',now()-interval '52 days'),
  (fails,u[1+mod(94,ulen)],
   'Fail — Agency retainer ₹2L/month for brand film, 0 measurable ROI',
   'Brand film ke naam pe agency ko ₹2L/month retainer diya, 4 mahine ke baad ek glossy video mila jisse neither CAC improve hua, na leads, na brand recall measurable tha. Internal debates mein sirf yahi chal raha tha ki "accha lagta hai" but numbers silent the. Aap agency retainer sign karte waqt kaunse guardrails pehle lock karte ho?',
   'failure',now()-interval '54 days'),
  (fails,u[1+mod(95,ulen)],
   'Fail — Signed horrible office lease, 11-month lock in and had to shift remote',
   'Office lease sign karte waqt lock-in clause casually treat kiya, socha "dekh lenge" and 11-month lock-in ne baad mein pure cash flow ko choke kar diya jab remote shift karna pada. Empty office ka rent bharna sabse painful line item lag raha tha P&L sheet mein. Lease sign karte waqt aap log ka primary focus kis clause pe hota hai?',
   'failure',now()-interval '56 days'),
  (fails,u[1+mod(96,ulen)],
   'Fail — Raised small round on wrong valuation expectations, next round super hard',
   'Round chota tha but valuation artificially pump kar diya FOMO mein, us waqt achha laga but agla round raise karte time sab investors ko lag raha tha company overvalued hai for stage. Cap table tight ho gaya and down round ka fear constant background noise ban gaya. Aap overvaluation ka sabse bada nuksan kis form mein dekh chuke ho?',
   'failure',now()-interval '58 days'),
  (fails,u[1+mod(97,ulen)],
   'Fail — Friend as co-founder, great friend still, terrible co-founder match',
   'Best dost ko co-founder bana diya, socha communication mast rahegi, lekin kaam style, risk appetite aur speed mein itna mismatch tha ki company ke andar friction hi friction ho gaya. Achhi baat ye hai ki friendship bach gayi, par co-founder equation todni padi. Aap friend ko co-founder banane se pehle kaunsa hard test run karoge?',
   'failure',now()-interval '60 days'),
  (fails,u[1+mod(98,ulen)],
   'Fail — Ignored CAC math, scaled ads too early and killed runway',
   'Meta ads ne starting mein vanity metrics diye – clicks, traffic, installs – and humne CAC math ignore karke spend 5x kar diya hoping LTV baad mein catch up karega. 3 months baad runway dangerous level pe aa gaya and scale ki jagah forcefully brakes lagane pade. Aap ads scale karne se pehle kaunsa simple math hamesha ensure karte ho?',
   'failure',now()-interval '62 days'),
  (fails,u[1+mod(99,ulen)],
   'Fail — Built only for Delhi users, later realised infra not ready for rest of India',
   'Delhi users ke liye hi infra build kiya – addressing, COD, logistics sab NCR optimized tha – aur jab Lucknow, Jaipur, Pune se demand aayi to system tootne laga. Realize hua ki product India-bharat bol raha hai but backend pure Delhi-jugaad pe chal raha tha. City-specific product ko scale out karne se pehle aapka step-1 kya hota?',
   'failure',now()-interval '64 days');

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

  RAISE NOTICE '100 POSTS + 100 UNIQUE POLLS WITH BODIES DONE! FORUM ZINDA HO GAYA';
END $$;
