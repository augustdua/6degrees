/**
 * Seed Connector Game Data
 * Imports the 1471 jobs from JSON into PostgreSQL database
 */

import dotenv from 'dotenv';
dotenv.config(); // Load .env file

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client directly with connection details
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://tfbwfcnjdmbqmoyljeys.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

interface JobNode {
  id: number;
  job_title: string;
  industry_name: string;
  sector_name: string;
  job_description?: string;
  key_skills?: string;
  responsibilities?: string;
}

interface GraphData {
  nodes: JobNode[];
  edges: { source: number; target: number }[];
}

async function seedConnectorData() {
  console.log('🎮 Starting Connector Game Data Seeding...\n');

  try {
    // 1. Load JSON data
    console.log('📖 Reading job_graph.json...');
    const jsonPath = path.join(__dirname, '../../data/job_graph.json');
    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    const graphData: GraphData = JSON.parse(rawData);

    console.log(`   ✓ Found ${graphData.nodes.length} jobs`);
    console.log(`   ✓ Found ${graphData.edges.length} connections\n`);

    // 2. Clear existing data (if any)
    console.log('🧹 Clearing existing data...');
    const { error: clearEdgesError } = await supabase
      .from('connector_graph_edges')
      .delete()
      .neq('id', 0); // Delete all

    if (clearEdgesError) {
      console.warn('   ⚠ Warning clearing edges:', clearEdgesError.message);
    }

    const { error: clearJobsError } = await supabase
      .from('connector_jobs')
      .delete()
      .neq('id', 0); // Delete all

    if (clearJobsError) {
      console.warn('   ⚠ Warning clearing jobs:', clearJobsError.message);
    }

    console.log('   ✓ Cleared existing data\n');

    // 3. Insert jobs in batches
    console.log('📥 Inserting jobs...');
    const BATCH_SIZE = 100;
    let insertedJobs = 0;

    for (let i = 0; i < graphData.nodes.length; i += BATCH_SIZE) {
      const batch = graphData.nodes.slice(i, i + BATCH_SIZE).map(node => ({
        id: node.id,
        job_title: node.job_title,
        industry_name: node.industry_name || 'Unknown',
        sector_name: node.sector_name || 'Unknown',
        job_description: node.job_description || '',
        key_skills: node.key_skills || '',
        responsibilities: node.responsibilities || '',
        is_custom: false
      }));

      const { error } = await supabase
        .from('connector_jobs')
        .insert(batch);

      if (error) {
        console.error(`   ✗ Error inserting batch at position ${i}:`, error);
        throw error;
      }

      insertedJobs += batch.length;
      const progress = Math.round((insertedJobs / graphData.nodes.length) * 100);
      process.stdout.write(`\r   Progress: ${progress}% (${insertedJobs}/${graphData.nodes.length})`);
    }

    console.log('\n   ✓ All jobs inserted\n');

    // 4. Insert graph edges in batches
    console.log('🔗 Inserting graph connections...');
    let insertedEdges = 0;

    // Remove duplicate edges (since graph is undirected)
    const uniqueEdges = new Set<string>();
    const edgesToInsert = graphData.edges.filter(edge => {
      const key1 = `${Math.min(edge.source, edge.target)}-${Math.max(edge.source, edge.target)}`;
      if (uniqueEdges.has(key1)) return false;
      uniqueEdges.add(key1);
      return true;
    });

    console.log(`   ℹ Removed duplicates: ${graphData.edges.length} → ${edgesToInsert.length} unique edges`);

    for (let i = 0; i < edgesToInsert.length; i += BATCH_SIZE) {
      const batch = edgesToInsert.slice(i, i + BATCH_SIZE).map(edge => ({
        source_job_id: edge.source,
        target_job_id: edge.target,
        weight: 1.0
      }));

      const { error } = await supabase
        .from('connector_graph_edges')
        .insert(batch);

      if (error) {
        console.error(`   ✗ Error inserting edges at position ${i}:`, error);
        throw error;
      }

      insertedEdges += batch.length;
      const progress = Math.round((insertedEdges / edgesToInsert.length) * 100);
      process.stdout.write(`\r   Progress: ${progress}% (${insertedEdges}/${edgesToInsert.length})`);
    }

    console.log('\n   ✓ All connections inserted\n');

    // 5. Seeding complete (no playable concept)
    console.log('✓ Seeded all jobs and edges\n');

    console.log('✅ Seeding complete!');
    console.log('\n📊 Summary:');
    console.log(`   • Jobs inserted: ${insertedJobs}`);
    console.log(`   • Connections inserted: ${insertedEdges}`);
    console.log(`   • Playable flag removed\n`);

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  seedConnectorData()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

export { seedConnectorData };
