-- Personality Questions System
-- Created: 2025-12-22
--
-- Adds personality assessment questions that appear randomly on the feed

-- ============================================================================
-- 1. Personality Questions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS personality_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('likert', 'binary')),
  text TEXT NOT NULL UNIQUE,
  option_a TEXT, -- For binary questions
  option_b TEXT, -- For binary questions
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE personality_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active personality questions" ON personality_questions;
CREATE POLICY "Anyone can read active personality questions" ON personality_questions
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Service role full access to personality_questions" ON personality_questions;
CREATE POLICY "Service role full access to personality_questions" ON personality_questions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE INDEX IF NOT EXISTS idx_personality_questions_type ON personality_questions(type);
CREATE INDEX IF NOT EXISTS idx_personality_questions_active ON personality_questions(is_active) WHERE is_active = true;

-- ============================================================================
-- 2. User Personality Responses Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_personality_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES personality_questions(id) ON DELETE CASCADE,
  response TEXT NOT NULL, -- For likert: 'strongly_disagree', 'disagree', 'neutral', 'agree', 'strongly_agree'
                         -- For binary: 'a' or 'b'
  response_value INT, -- Likert: 1-5, Binary: 1 or 2
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, question_id)
);

ALTER TABLE user_personality_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own personality responses" ON user_personality_responses;
CREATE POLICY "Users can read their own personality responses" ON user_personality_responses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own personality responses" ON user_personality_responses;
CREATE POLICY "Users can create their own personality responses" ON user_personality_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own personality responses" ON user_personality_responses;
CREATE POLICY "Users can update their own personality responses" ON user_personality_responses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to user_personality_responses" ON user_personality_responses;
CREATE POLICY "Service role full access to user_personality_responses" ON user_personality_responses
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE INDEX IF NOT EXISTS idx_user_personality_responses_user ON user_personality_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_personality_responses_question ON user_personality_responses(question_id);

-- ============================================================================
-- 3. Seed Likert Scale Questions (Self-Assessment)
-- ============================================================================
INSERT INTO personality_questions (type, text, category, display_order) VALUES
-- Self-assessment questions
('likert', 'I sometimes choose my words carefully to steer a conversation toward a better outcome.', 'self', 1),
('likert', 'I find it easy to stay polite even when I feel judgmental inside.', 'self', 2),
('likert', 'I dislike situations where I have no influence over the outcome.', 'self', 3),
('likert', 'I notice status dynamics quickly in new groups.', 'self', 4),
('likert', 'I prefer to keep some of my motives private.', 'self', 5),
('likert', 'I am comfortable being strategic when the stakes are high.', 'self', 6),
('likert', 'If someone disrespects me, I tend to remember it for a long time.', 'self', 7),
('likert', 'I feel strongly motivated to protect my reputation.', 'self', 8),
('likert', 'I can justify bending a rule if the rule seems pointless.', 'self', 9),
('likert', 'I often think about what people really want, not what they say they want.', 'self', 10),
('likert', 'I sometimes avoid telling the full truth when it would create unnecessary problems.', 'self', 11),
('likert', 'I am more competitive than I appear.', 'self', 12),
('likert', 'I dislike feeling indebted to people.', 'self', 13),
('likert', 'I feel satisfaction when I win a social contest (attention, influence, status).', 'self', 14),
('likert', 'I prefer relationships where expectations are clear and controllable.', 'self', 15),
('likert', 'I find it easy to detach emotionally when I need to make a hard decision.', 'self', 16),
('likert', 'I sometimes test people''s boundaries to learn what is acceptable.', 'self', 17),
('likert', 'I rarely do favors without noticing whether they are reciprocated.', 'self', 18),
('likert', 'I can stay calm in conflict while planning my next move.', 'self', 19),
('likert', 'When I want something, I become unusually persistent.', 'self', 20),

-- Behavioral observations
('likert', 'Most people feel calmer when their day has a predictable routine.', 'behavior', 21),
('likert', 'Most people underestimate how much sleep affects their mood and choices.', 'behavior', 22),
('likert', 'Many people use "being busy" to avoid thinking.', 'behavior', 23),
('likert', 'Most people procrastinate mainly because they dislike discomfort, not because they lack time.', 'behavior', 24),
('likert', 'Most people are more disciplined in the morning than at night.', 'behavior', 25),
('likert', 'Many people check their phone out of habit more than necessity.', 'behavior', 26),
('likert', 'Most people prefer short messages over detailed explanations.', 'behavior', 27),
('likert', 'Many people interpret delayed replies as a sign of low interest or low respect.', 'behavior', 28),
('likert', 'Most people become less patient when they feel anonymous (traffic, queues, online).', 'behavior', 29),
('likert', 'Many people are kinder when they are rested and fed.', 'behavior', 30),
('likert', 'Most people avoid tasks that could expose incompetence.', 'behavior', 31),
('likert', 'Many people feel more motivated by avoiding embarrassment than by gaining rewards.', 'behavior', 32),
('likert', 'Most people prefer convenience over quality in daily decisions.', 'behavior', 33),
('likert', 'Many people buy things to reduce stress more than to increase happiness.', 'behavior', 34),
('likert', 'Most people feel relief after finishing small chores more than they expect.', 'behavior', 35),
('likert', 'Many people keep their environment messy when their mind feels overloaded.', 'behavior', 36),
('likert', 'Most people overestimate how productive they were on an average day.', 'behavior', 37),
('likert', 'Many people prefer certainty over the best possible outcome.', 'behavior', 38),
('likert', 'Most people dislike being told what to do, even when the advice is correct.', 'behavior', 39),
('likert', 'Many people prefer to look "consistent" rather than admit they changed their mind.', 'behavior', 40),

-- Social dynamics
('likert', 'Most people are more polite when they want something.', 'social', 41),
('likert', 'Many people avoid asking for help to protect pride.', 'social', 42),
('likert', 'Most people feel uncomfortable being alone with their thoughts for long.', 'social', 43),
('likert', 'Many people use entertainment to regulate emotions, not just for fun.', 'social', 44),
('likert', 'Most people would rather feel "in control" than feel "happy."', 'social', 45),
('likert', 'Most people define success by external markers more than inner peace.', 'social', 46),
('likert', 'Many people want freedom, but also want someone else to guarantee safety.', 'social', 47),
('likert', 'Most people would trade long-term fulfillment for short-term relief under pressure.', 'social', 48),
('likert', 'Luck influences outcomes more than most people publicly admit.', 'social', 49),
('likert', 'Hard work is necessary for success, but rarely sufficient on its own.', 'social', 50),
('likert', 'Most people fear being average more than they fear being wrong.', 'social', 51),
('likert', 'Many people want recognition more than money, but avoid admitting it.', 'social', 52),
('likert', 'Most people admire confidence even when it is not backed by competence.', 'social', 53),
('likert', 'Many people chase goals because they are socially rewarded, not personally meaningful.', 'social', 54),
('likert', 'Most people become more moral when they feel secure and less moral when threatened.', 'social', 55),
('likert', 'Many people say they value truth, but prioritize identity-protection.', 'social', 56),
('likert', 'Most people believe life is fair when outcomes favor them.', 'social', 57),
('likert', 'Many people judge themselves by intentions and others by outcomes.', 'social', 58),
('likert', 'Most people prefer comfort over growth when forced to choose.', 'social', 59),
('likert', 'Many people would rather feel superior than feel peaceful.', 'social', 60),

-- Cognitive biases
('likert', 'Most people think they are less biased than the average person.', 'cognitive', 61),
('likert', 'People''s character shows most clearly when they have power.', 'cognitive', 62),
('likert', 'People''s character shows most clearly when they are under stress.', 'cognitive', 63),
('likert', 'Most people prefer belonging to being correct.', 'cognitive', 64),
('likert', 'Many people avoid deep self-reflection because it threatens self-image.', 'cognitive', 65),
('likert', 'Most people adjust their personality depending on who is present.', 'cognitive', 66),
('likert', 'Many people perform a "socially acceptable" version of themselves in public.', 'cognitive', 67),
('likert', 'Most people care about being liked, but care even more about being respected.', 'cognitive', 68),
('likert', 'Many people avoid saying unpopular truths in groups.', 'cognitive', 69),
('likert', 'Most people notice hierarchy quickly in a new group.', 'cognitive', 70),

-- Status and influence
('likert', 'Many people become friendlier when they believe someone has high status.', 'status', 71),
('likert', 'Most people treat confident people as more competent, even without evidence.', 'status', 72),
('likert', 'Many people avoid people who seem needy or socially anxious.', 'status', 73),
('likert', 'Most people want attention, but dislike admitting they want attention.', 'status', 74),
('likert', 'Many people hide uncertainty to avoid losing status.', 'status', 75),
('likert', 'Most people mirror opinions to reduce social friction.', 'status', 76),
('likert', 'Many people punish indirectly (coldness, exclusion) rather than confront directly.', 'status', 77),
('likert', 'Most people respect boundaries more when boundaries are enforced strongly.', 'status', 78),
('likert', 'Many people keep relationships partly because of future usefulness, not only affection.', 'status', 79),
('likert', 'Most people will tolerate unfairness if it benefits their group.', 'status', 80),
('likert', 'Many people prefer indirect communication when emotions are involved.', 'status', 81),
('likert', 'Most people interpret neutrality as negativity when insecure.', 'status', 82),
('likert', 'Many people feel threatened by someone who is both confident and competent.', 'status', 83),
('likert', 'Most people want influence over others, even in small ways.', 'status', 84),
('likert', 'Many people confuse charisma with character.', 'status', 85)
ON CONFLICT (text) DO NOTHING;

-- ============================================================================
-- 4. Seed Binary Choice Questions (Dilemmas)
-- ============================================================================
INSERT INTO personality_questions (type, text, option_a, option_b, category, display_order) VALUES
('binary', 'A colleague asks for your opinion on a project they worked hard on, but it''s terrible.', 'Lie and say it has potential to avoid crushing them.', 'Tell them it''s bad so they don''t waste more time.', 'dilemma', 101),
('binary', 'Your close friend makes a factual error in front of a group.', 'Stay silent or back them up to protect their image.', 'Correct them publicly so misinformation doesn''t spread.', 'dilemma', 102),
('binary', 'You are running late for a vital meeting. There is a red light, but the road is clearly empty.', 'Wait for the green light, even if it means being late.', 'Run the light to get to the meeting on time.', 'dilemma', 103),
('binary', 'A doctor has bad news for a patient who is mentally fragile.', 'Soften the truth to give them hope, even if it''s false.', 'Give the raw medical facts immediately.', 'dilemma', 104),
('binary', 'You have two potential managers to choose from.', 'One who is kind, inclusive, but indecisive and weak.', 'One who is brilliant, effective, but cold and intimidating.', 'dilemma', 105),
('binary', 'A politician you support is caught in a minor scandal.', 'Stop supporting them because they lost moral authority.', 'Continue supporting them because their policies are still effective.', 'dilemma', 106),
('binary', 'You are arguing with a partner and realize you are wrong.', 'Apologize immediately and admit defeat.', 'Pivot the argument to a different point to avoid losing face.', 'dilemma', 107),
('binary', 'You publicly criticized a company, but they just fixed the issue.', 'Maintain your criticism so you don''t look flip-floppy.', 'Publicly praise them, admitting you were wrong.', 'dilemma', 108),
('binary', 'You must hire one person for a role.', 'A stranger who is slightly more qualified.', 'A good friend who needs the job but is slightly less qualified.', 'dilemma', 109),
('binary', 'Your country is in a crisis and needs a leader.', 'A leader who feels the people''s pain but hesitates to act.', 'A leader who acts ruthlessly to solve the problem but ignores individual suffering.', 'dilemma', 110),
('binary', 'You see your company doing something unethical but legal.', 'Speak up and risk being fired.', 'Keep your head down and protect your family''s income.', 'dilemma', 111),
('binary', 'You and a shy colleague did equal work, but the boss congratulates only you.', 'Correct the boss publicly: "Sarah did half the work."', 'Say "Thank you" and praise Sarah privately later.', 'dilemma', 112),
('binary', 'A friend apologizes for a major betrayal.', 'Forgive them to keep the peace.', 'Cut them out of your life to enforce standards.', 'dilemma', 113),
('binary', 'You feel a spike of envy when a friend wins an award.', 'Admit it to them: "I''m happy for you, but also jealous."', 'Hide it completely and perform perfect enthusiasm.', 'dilemma', 114),
('binary', 'You want to achieve a massive goal.', 'Follow every rule, even if it takes 10 years.', 'Bend the rules to get it done in 2 years.', 'dilemma', 115)
ON CONFLICT (text) DO NOTHING;
