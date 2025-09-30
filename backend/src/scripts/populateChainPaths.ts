/**
 * Script to populate chain_paths for all existing chains
 * Run this once after migration to backfill existing chains
 *
 * Usage: npm run populate-paths
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { buildChainPaths } from '../controllers/pathController';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables:');
  console.error('SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_ANON_KEY or SUPABASE_SERVICE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function populateAllChainPaths() {
  console.log('🔄 Starting chain paths population...\n');

  try {
    // Fetch all active chains
    const { data: chains, error } = await supabase
      .from('chains')
      .select('*')
      .eq('status', 'active');

    if (error) {
      console.error('❌ Error fetching chains:', error);
      return;
    }

    if (!chains || chains.length === 0) {
      console.log('✅ No active chains found.');
      return;
    }

    console.log(`📊 Found ${chains.length} active chains\n`);

    // Process each chain
    for (const chain of chains) {
      console.log(`Processing chain: ${chain.id}`);
      console.log(`  - Participants: ${chain.participants?.length || 0}`);

      try {
        // Build paths using the algorithm
        const paths = buildChainPaths(chain.participants || []);

        console.log(`  - Paths found: ${paths.length}`);

        if (paths.length === 0) {
          console.log(`  ⚠️  No paths to insert (chain might have only creator)\n`);
          continue;
        }

        // Delete existing paths for this chain
        const { error: deleteError } = await supabase
          .from('chain_paths')
          .delete()
          .eq('chain_id', chain.id);

        if (deleteError) {
          console.error(`  ❌ Error deleting old paths:`, deleteError.message);
          continue;
        }

        // Prepare path records
        const pathRecords = paths.map(path => ({
          chain_id: chain.id,
          path_id: `${chain.id}-${path.leafUserId}`,
          creator_id: path.pathUserIds[0],
          leaf_userid: path.leafUserId,
          subtree_root_id: path.subtreeRootId,
          path_userids: path.pathUserIds,
          path_participants: path.pathParticipants,
          base_reward: chain.total_reward / paths.length, // Equal distribution
          current_reward: chain.total_reward / paths.length,
          path_length: path.pathLength,
          is_complete: path.isComplete,
          subtree_frozen_until: null,
          last_child_added_at: null
        }));

        // Insert new paths
        const { error: insertError } = await supabase
          .from('chain_paths')
          .insert(pathRecords);

        if (insertError) {
          console.error(`  ❌ Error inserting paths:`, insertError.message);
          continue;
        }

        console.log(`  ✅ Successfully inserted ${pathRecords.length} paths\n`);

      } catch (pathError: any) {
        console.error(`  ❌ Error building paths:`, pathError.message);
        console.log('');
      }
    }

    console.log('\n✅ Path population complete!');

    // Summary
    const { data: pathCount } = await supabase
      .from('chain_paths')
      .select('id', { count: 'exact', head: true });

    console.log(`\n📊 Summary:`);
    console.log(`   Total chains processed: ${chains.length}`);
    console.log(`   Total paths created: ${pathCount || 0}`);

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
populateAllChainPaths()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });