import { processAllDueSubscriptions } from '../services/mafiaPayments';

/**
 * Cron job to process all due mafia subscriptions
 * Should be run daily via Railway cron or Supabase Edge Function
 */
export async function processMafiaSubscriptionsCron(): Promise<void> {
  console.log('🔄 Starting mafia subscription processing...');
  
  const startTime = Date.now();
  
  try {
    const result = await processAllDueSubscriptions();
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Mafia subscription processing complete`);
    console.log(`📊 Stats:`);
    console.log(`   - Processed: ${result.processed}`);
    console.log(`   - Successful: ${result.successful}`);
    console.log(`   - Failed: ${result.failed}`);
    console.log(`   - Duration: ${duration}ms`);
    
    if (result.failed > 0) {
      console.warn(`⚠️  ${result.failed} subscriptions failed to process`);
    }
  } catch (error: any) {
    console.error('❌ Fatal error in mafia subscription processing:', error);
    throw error;
  }
}

// If running as standalone script
if (require.main === module) {
  processMafiaSubscriptionsCron()
    .then(() => {
      console.log('✅ Cron job completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Cron job failed:', error);
      process.exit(1);
    });
}

