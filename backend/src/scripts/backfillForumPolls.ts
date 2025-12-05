/**
 * Backfill Script: Generate polls for all existing forum posts
 * 
 * Run with: npx ts-node src/scripts/backfillForumPolls.ts
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!openaiApiKey) {
  console.error('❌ Missing OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

interface GeneratedPoll {
  question: string;
  options: string[];
}

function getCommunityContext(communitySlug?: string): string {
  switch (communitySlug) {
    case 'build-in-public':
      return 'Building in Public community - users share their startup/project journeys, daily progress, wins, and challenges';
    case 'network':
      return 'Networking community - users seeking connections, introductions, and professional opportunities';
    case 'wins':
      return 'Wins & Brags community - users celebrating achievements, milestones, and successes';
    case 'failures':
      return 'Failures & Lessons community - users sharing setbacks, learnings, and growth experiences';
    default:
      return 'Professional networking and building in public community';
  }
}

async function generatePoll(postContent: string, communitySlug?: string): Promise<GeneratedPoll> {
  const communityContext = getCommunityContext(communitySlug);
  
  const prompt = `You are creating an engaging poll for a professional networking community forum. Based on the following post, generate a relevant poll question with exactly 4 options.

Post Content:
"${postContent}"

Community Context: ${communityContext}

Guidelines:
- The poll question should spark discussion and engagement
- Options should be distinct, balanced, and relevant to the post
- Keep the question under 100 characters
- Each option should be under 50 characters
- Options should cover different perspectives or choices
- Make it interesting and thought-provoking
- Avoid yes/no questions - make it more nuanced

Return ONLY valid JSON with this exact structure:
{"question": "Your poll question here?", "options": ["Option 1", "Option 2", "Option 3", "Option 4"]}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating engaging community polls. Generate polls that encourage participation and spark meaningful discussions. Always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(response);
    
    if (!parsed.question || !Array.isArray(parsed.options) || parsed.options.length !== 4) {
      throw new Error('Invalid poll structure');
    }

    return {
      question: parsed.question.slice(0, 200),
      options: parsed.options.map((opt: string) => opt.slice(0, 100)),
    };
  } catch (error) {
    // Fallback poll
    console.log('    ⚠️  Using fallback poll');
    return {
      question: "What resonates most with you about this post?",
      options: ['Totally agree', 'Partially agree', 'Different perspective', 'Want to learn more'],
    };
  }
}

async function backfillPolls() {
  console.log('🚀 Starting poll backfill for existing posts...\n');

  // Get all posts that don't have a poll yet
  const { data: posts, error: postsError } = await supabase
    .from('forum_posts')
    .select(`
      id,
      content,
      community:forum_communities(slug)
    `)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (postsError) {
    console.error('❌ Error fetching posts:', postsError);
    process.exit(1);
  }

  if (!posts || posts.length === 0) {
    console.log('ℹ️  No posts found.');
    return;
  }

  console.log(`📝 Found ${posts.length} posts to process\n`);

  // Check which posts already have polls
  const { data: existingPolls } = await supabase
    .from('forum_polls')
    .select('post_id');

  const existingPollPostIds = new Set((existingPolls || []).map(p => p.post_id));

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const postNumber = i + 1;
    
    // Skip if poll already exists
    if (existingPollPostIds.has(post.id)) {
      console.log(`[${postNumber}/${posts.length}] ⏭️  Skipping (poll exists): ${post.id}`);
      skipped++;
      continue;
    }

    console.log(`[${postNumber}/${posts.length}] 🔄 Processing: ${post.id}`);
    console.log(`    Content: "${post.content.slice(0, 50)}..."`);

    try {
      // Generate poll
      const communitySlug = (post.community as any)?.slug;
      const poll = await generatePoll(post.content, communitySlug);
      
      console.log(`    📊 Poll: "${poll.question}"`);

      // Insert poll
      const { error: insertError } = await supabase
        .from('forum_polls')
        .insert({
          post_id: post.id,
          question: poll.question,
          options: poll.options
        });

      if (insertError) {
        console.log(`    ❌ Insert failed: ${insertError.message}`);
        failed++;
      } else {
        console.log(`    ✅ Poll created!`);
        created++;
      }

      // Rate limiting - wait 500ms between API calls
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error: any) {
      console.log(`    ❌ Error: ${error.message}`);
      failed++;
    }

    console.log('');
  }

  console.log('━'.repeat(50));
  console.log('📊 BACKFILL COMPLETE');
  console.log('━'.repeat(50));
  console.log(`✅ Created: ${created}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📝 Total: ${posts.length}`);
}

// Run the backfill
backfillPolls()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

