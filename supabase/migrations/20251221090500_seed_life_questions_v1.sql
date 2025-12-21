-- Seed Life Questions Bank v1 (A–J, 120 questions)
-- Created: 2025-12-21
--
-- NOTE: This is idempotent (safe to re-run). It updates question text if changed.

INSERT INTO life_questions (id, category, text, version) VALUES
  -- A) Integrity & Truthfulness
  ('A01','A','Share one recent moment when you chose to tell an uncomfortable truth instead of staying silent.',1),
  ('A02','A','Describe one time you admitted a mistake to someone before they found out on their own.',1),
  ('A03','A','Name one small commitment you made to a friend or family member that you quietly followed through on.',1),
  ('A04','A','Give one example of when you corrected someone''s overly positive impression of you.',1),
  ('A05','A','Share one instance where you returned something or corrected an error that benefited you.',1),
  ('A06','A','Describe one time you kept a promise that became inconvenient to keep.',1),
  ('A07','A','Name one recent situation where you resisted exaggerating to make yourself look better.',1),
  ('A08','A','Give one example of when you gave credit to someone else for an idea or outcome.',1),
  ('A09','A','Share one time you disclosed a conflict of interest even though you didn''t have to.',1),
  ('A10','A','Describe one moment when you chose transparency over protecting your image.',1),
  ('A11','A','Name one occasion when you apologized without being asked to.',1),
  ('A12','A','Give one example of keeping confidential information private when sharing it would have been easy.',1),

  -- B) Discipline & Self-control
  ('B01','B','Share one daily habit you''ve maintained for at least three months and how you built it.',1),
  ('B02','B','Describe one temptation you successfully resisted this week.',1),
  ('B03','B','Name one thing you stopped doing because you realized it was wasting your time.',1),
  ('B04','B','Give one example of delaying a reward to finish something important first.',1),
  ('B05','B','Share one boundary you set around your phone or screen time.',1),
  ('B06','B','Describe one way you''ve structured your environment to make good choices easier.',1),
  ('B07','B','Name one instance where you followed your plan even when you didn''t feel like it.',1),
  ('B08','B','Give one example of how you handle days when your motivation is low.',1),
  ('B09','B','Share one thing you do consistently that most people find boring or tedious.',1),
  ('B10','B','Describe one time you said no to something fun to protect your energy or schedule.',1),
  ('B11','B','Name one unhelpful pattern you noticed in yourself and actively changed.',1),
  ('B12','B','Give one example of how you recovered after breaking a streak or habit.',1),

  -- C) Motivation & Identity
  ('C01','C','Share one accomplishment outside of work that you''re genuinely proud of.',1),
  ('C02','C','Describe one thing you do purely for enjoyment with no external validation.',1),
  ('C03','C','Name one person whose life approach you admire and what specifically inspires you.',1),
  ('C04','C','Give one example of something you pursued for years despite slow progress.',1),
  ('C05','C','Share one interest or skill you''ve recently started developing.',1),
  ('C06','C','Describe one way your values have shifted compared to five years ago.',1),
  ('C07','C','Name one thing you would still do even if no one ever knew about it.',1),
  ('C08','C','Give one example of choosing meaning over convenience in your daily life.',1),
  ('C09','C','Share one long-term personal goal and one concrete step you took toward it recently.',1),
  ('C10','C','Describe one thing you tried that didn''t work out and what you took from it.',1),
  ('C11','C','Name one quality you''re actively trying to develop in yourself.',1),
  ('C12','C','Give one example of how you''ve made a difficult trade-off between competing priorities.',1),

  -- D) Stress & Recovery
  ('D01','D','Share one way you reset your energy after a draining day.',1),
  ('D02','D','Describe one early sign that tells you you''re approaching burnout.',1),
  ('D03','D','Name one thing you do to decompress that actually works for you.',1),
  ('D04','D','Give one example of how you handled a week when everything seemed to go wrong.',1),
  ('D05','D','Share one boundary you protect to maintain your wellbeing.',1),
  ('D06','D','Describe one adjustment you made after recognizing you were overextended.',1),
  ('D07','D','Name one person you turn to when you need perspective during tough times.',1),
  ('D08','D','Give one example of how you''ve bounced back from a disappointment.',1),
  ('D09','D','Share one practice that helps you sleep better or start mornings well.',1),
  ('D10','D','Describe one way you separate work pressure from personal time.',1),
  ('D11','D','Name one thing you stopped doing because it was adding unnecessary stress.',1),
  ('D12','D','Give one example of asking for help before a situation became a crisis.',1),

  -- E) Ego & Feedback Sensitivity
  ('E01','E','Share one piece of critical feedback you received and how you responded to it.',1),
  ('E02','E','Describe one time you changed your mind after someone disagreed with you.',1),
  ('E03','E','Name one area where you''ve actively sought input to improve.',1),
  ('E04','E','Give one example of receiving praise that you felt was undeserved and how you handled it.',1),
  ('E05','E','Share one instance when you asked someone to be more direct with you.',1),
  ('E06','E','Describe one time you felt defensive but chose to listen anyway.',1),
  ('E07','E','Name one blind spot someone helped you recognize.',1),
  ('E08','E','Give one example of accepting a suggestion that contradicted your initial instinct.',1),
  ('E09','E','Share one way you''ve learned to separate your self-worth from being right.',1),
  ('E10','E','Describe one time you thanked someone for honest feedback even though it stung.',1),
  ('E11','E','Name one person whose opinion you trust to be genuinely honest with you.',1),
  ('E12','E','Give one example of revisiting a past decision and acknowledging you could have done better.',1),

  -- F) Money Habits & Fairness
  ('F01','F','Share one principle you follow when splitting costs with friends or family.',1),
  ('F02','F','Describe one financial boundary you maintain even when it''s socially awkward.',1),
  ('F03','F','Name one purchase you delayed or skipped because it didn''t align with your priorities.',1),
  ('F04','F','Give one example of how you handled lending or borrowing money with someone close.',1),
  ('F05','F','Share one way you track or think about your personal spending.',1),
  ('F06','F','Describe one time you chose to pay more than required out of fairness.',1),
  ('F07','F','Name one money-related lesson you learned from experience rather than advice.',1),
  ('F08','F','Give one example of turning down something expensive even when you could afford it.',1),
  ('F09','F','Share one way you balance generosity with protecting your own financial health.',1),
  ('F10','F','Describe one time you had an uncomfortable money conversation and how you approached it.',1),
  ('F11','F','Name one thing you invest in consistently because you believe it compounds over time.',1),
  ('F12','F','Give one example of negotiating or asking for what you thought was fair.',1),

  -- G) Social Style & Boundaries
  ('G01','G','Share one way you typically decline invitations without damaging the relationship.',1),
  ('G02','G','Describe one relationship you intentionally invest time in and why.',1),
  ('G03','G','Name one social situation where you tend to speak up versus stay quiet.',1),
  ('G04','G','Give one example of protecting your time from someone who frequently overstepped.',1),
  ('G05','G','Share one thing you do to maintain friendships despite a busy schedule.',1),
  ('G06','G','Describe one time you addressed tension with someone instead of letting it fester.',1),
  ('G07','G','Name one type of social obligation you''ve stopped feeling guilty about skipping.',1),
  ('G08','G','Give one example of how you introduce yourself or approach new people.',1),
  ('G09','G','Share one way you handle it when someone repeatedly cancels on you.',1),
  ('G10','G','Describe one boundary you hold even when it disappoints people you care about.',1),
  ('G11','G','Name one approach you use when you disagree with a friend''s life choice.',1),
  ('G12','G','Give one example of ending or distancing a relationship that wasn''t healthy.',1),

  -- H) Family/Culture Expectations
  ('H01','H','Share one expectation from family that you''ve navigated while staying true to yourself.',1),
  ('H02','H','Describe one tradition or practice you''ve chosen to continue and why it matters to you.',1),
  ('H03','H','Name one way you communicate boundaries with family while maintaining respect.',1),
  ('H04','H','Give one example of balancing personal ambition with family responsibilities.',1),
  ('H05','H','Share one piece of life advice from an elder that you actually apply.',1),
  ('H06','H','Describe one cultural norm you''ve adapted to fit your own values.',1),
  ('H07','H','Name one family or community obligation you fulfill even when it''s inconvenient.',1),
  ('H08','H','Give one example of how you handle unsolicited advice about major life decisions.',1),
  ('H09','H','Share one way you stay connected with family despite different schedules or distances.',1),
  ('H10','H','Describe one time you respectfully disagreed with a family member''s expectation.',1),
  ('H11','H','Name one thing you''ve learned about yourself through navigating family dynamics.',1),
  ('H12','H','Give one example of creating your own path while honoring where you come from.',1),

  -- I) Self-awareness & Emotional Regulation
  ('I01','I','Share one pattern in your behavior that you''ve become more aware of recently.',1),
  ('I02','I','Describe one way you notice and manage your mood before it affects others.',1),
  ('I03','I','Name one trigger that used to bother you more than it does now.',1),
  ('I04','I','Give one example of pausing before reacting when you felt frustrated.',1),
  ('I05','I','Share one thing you''ve learned about what you need to feel at your best.',1),
  ('I06','I','Describe one time you recognized you were projecting your feelings onto a situation.',1),
  ('I07','I','Name one way you check in with yourself during busy or demanding periods.',1),
  ('I08','I','Give one example of adjusting your approach after noticing a recurring problem.',1),
  ('I09','I','Share one question you ask yourself to gain perspective when emotions run high.',1),
  ('I10','I','Describe one aspect of your personality you''ve learned to work with rather than fight.',1),
  ('I11','I','Name one way you''ve become more honest with yourself over the past year.',1),
  ('I12','I','Give one example of recognizing a limitation and finding a way to work around it.',1),

  -- J) Ethics & Trustworthiness
  ('J01','J','Share one time you walked away from an opportunity because something felt off.',1),
  ('J02','J','Describe one ethical line you hold regardless of the potential upside.',1),
  ('J03','J','Name one instance where you chose the harder right over the easier wrong.',1),
  ('J04','J','Give one example of keeping a commitment even when the other party couldn''t enforce it.',1),
  ('J05','J','Share one way you''ve handled discovering that someone you trusted was dishonest.',1),
  ('J06','J','Describe one situation where you declined to participate in something others were doing.',1),
  ('J07','J','Name one standard you apply to yourself even when no one is watching.',1),
  ('J08','J','Give one example of disclosing information that could have worked against you.',1),
  ('J09','J','Share one time you advocated for fairness even when it wasn''t your fight.',1),
  ('J10','J','Describe one way you evaluate whether a shortcut is acceptable or crosses a line.',1),
  ('J11','J','Name one value you refuse to compromise on and a moment that tested it.',1),
  ('J12','J','Give one example of how you rebuilt trust with someone after a misunderstanding.',1)
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  text = EXCLUDED.text,
  version = EXCLUDED.version;


