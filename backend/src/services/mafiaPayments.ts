import { supabase } from '../config/supabase';

/**
 * Process monthly subscription payment for a mafia member
 */
export async function processMemberSubscription(
  memberId: string,
  mafiaId: string,
  userId: string,
  monthlyPrice: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Check user's wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance, total_spent, total_earned')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      return { success: false, error: 'Wallet not found' };
    }

    if (wallet.balance < monthlyPrice) {
      // Mark subscription as expired
      await supabase
        .from('mafia_members')
        .update({ subscription_status: 'expired' })
        .eq('id', memberId);

      return { success: false, error: 'Insufficient balance' };
    }

    // 2. Deduct from wallet and update total_spent
    const newBalance = wallet.balance - monthlyPrice;
    const newTotalSpent = wallet.total_spent + monthlyPrice;
    
    const { error: deductError } = await supabase
      .from('wallets')
      .update({
        balance: newBalance,
        total_spent: newTotalSpent,
      })
      .eq('user_id', userId);

    if (deductError) {
      return { success: false, error: 'Failed to deduct from wallet' };
    }

    // 3. Record transaction
    await supabase.from('transactions').insert({
      wallet_id: wallet.id,
      type: 'debit',
      amount: monthlyPrice,
      description: `Mafia subscription payment`,
      reference_id: mafiaId,
      reference_type: 'mafia_subscription',
      status: 'completed',
    });

    // 4. Record in mafia_subscriptions
    const { data: subscription, error: subError } = await supabase
      .from('mafia_subscriptions')
      .insert({
        mafia_id: mafiaId,
        user_id: userId,
        amount: monthlyPrice,
        status: 'completed',
        revenue_split_completed: false,
      })
      .select()
      .single();

    if (subError || !subscription) {
      return { success: false, error: 'Failed to record subscription' };
    }

    // 5. Update next payment date
    const nextPaymentDate = new Date();
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

    await supabase
      .from('mafia_members')
      .update({
        subscription_status: 'active',
        next_payment_date: nextPaymentDate.toISOString().split('T')[0],
      })
      .eq('id', memberId);

    // 6. Distribute revenue to founding members
    await distributeRevenueToFoundingMembers(mafiaId, monthlyPrice, subscription.id);

    return { success: true };
  } catch (error: any) {
    console.error('Error processing subscription:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Distribute subscription revenue equally among founding members
 */
export async function distributeRevenueToFoundingMembers(
  mafiaId: string,
  totalAmount: number,
  subscriptionId: string
): Promise<void> {
  try {
    // 1. Get all founding members (including admin)
    const { data: foundingMembers, error: membersError } = await supabase
      .from('mafia_members')
      .select('user_id')
      .eq('mafia_id', mafiaId)
      .in('role', ['admin', 'founding']);

    if (membersError || !foundingMembers || foundingMembers.length === 0) {
      console.error('No founding members found for mafia:', mafiaId);
      return;
    }

    // 2. Calculate amount per founding member
    const amountPerMember = totalAmount / foundingMembers.length;

    // 3. Credit each founding member's wallet
    for (const member of foundingMembers) {
      // Get wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id, balance, total_earned')
        .eq('user_id', member.user_id)
        .single();

      if (walletError || !wallet) {
        console.error('Wallet not found for user:', member.user_id);
        continue;
      }

      // Update balance and total_earned
      const newBalance = wallet.balance + amountPerMember;
      const newTotalEarned = wallet.total_earned + amountPerMember;
      
      await supabase
        .from('wallets')
        .update({
          balance: newBalance,
          total_earned: newTotalEarned,
        })
        .eq('user_id', member.user_id);

      // Record transaction
      await supabase.from('transactions').insert({
        wallet_id: wallet.id,
        type: 'credit',
        amount: amountPerMember,
        description: `Mafia revenue share`,
        reference_id: mafiaId,
        reference_type: 'mafia_revenue',
        status: 'completed',
      });
    }

    // 4. Mark revenue split as completed
    await supabase
      .from('mafia_subscriptions')
      .update({ revenue_split_completed: true })
      .eq('id', subscriptionId);

    console.log(`✅ Distributed ${totalAmount} to ${foundingMembers.length} founding members`);
  } catch (error: any) {
    console.error('Error distributing revenue:', error);
  }
}

/**
 * Process all due subscriptions (called by cron job)
 */
export async function processAllDueSubscriptions(): Promise<{
  processed: number;
  successful: number;
  failed: number;
}> {
  const today = new Date().toISOString().split('T')[0];

  // Get all paid members with due payments
  const { data: dueMembers, error } = await supabase
    .from('mafia_members')
    .select(
      `
      id,
      user_id,
      mafia_id,
      mafias!inner (
        monthly_price
      )
    `
    )
    .eq('role', 'paid')
    .eq('subscription_status', 'active')
    .lte('next_payment_date', today);

  if (error || !dueMembers) {
    console.error('Error fetching due subscriptions:', error);
    return { processed: 0, successful: 0, failed: 0 };
  }

  let successful = 0;
  let failed = 0;

  for (const member of dueMembers) {
    const result = await processMemberSubscription(
      member.id,
      member.mafia_id,
      member.user_id,
      (member.mafias as any).monthly_price
    );

    if (result.success) {
      successful++;
    } else {
      failed++;
      console.error(
        `Failed to process subscription for member ${member.id}:`,
        result.error
      );
    }
  }

  console.log(
    `📊 Subscription processing complete: ${successful} successful, ${failed} failed out of ${dueMembers.length} total`
  );

  return {
    processed: dueMembers.length,
    successful,
    failed,
  };
}

/**
 * Calculate total revenue for a mafia
 */
export async function getMafiaRevenue(mafiaId: string): Promise<{
  totalRevenue: number;
  thisMonth: number;
  activeSubscribers: number;
}> {
  try {
    // Get total revenue
    const { data: totalData } = await supabase
      .from('mafia_subscriptions')
      .select('amount')
      .eq('mafia_id', mafiaId)
      .eq('status', 'completed');

    const totalRevenue = totalData?.reduce((sum: number, sub: any) => sum + Number(sub.amount), 0) || 0;

    // Get this month's revenue
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: monthData } = await supabase
      .from('mafia_subscriptions')
      .select('amount')
      .eq('mafia_id', mafiaId)
      .eq('status', 'completed')
      .gte('payment_date', startOfMonth.toISOString());

    const thisMonth = monthData?.reduce((sum: number, sub: any) => sum + Number(sub.amount), 0) || 0;

    // Get active subscribers count
    const { count } = await supabase
      .from('mafia_members')
      .select('*', { count: 'exact', head: true })
      .eq('mafia_id', mafiaId)
      .eq('role', 'paid')
      .eq('subscription_status', 'active');

    return {
      totalRevenue,
      thisMonth,
      activeSubscribers: count || 0,
    };
  } catch (error: any) {
    console.error('Error calculating revenue:', error);
    return { totalRevenue: 0, thisMonth: 0, activeSubscribers: 0 };
  }
}

