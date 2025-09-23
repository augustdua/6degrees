import { supabase } from '../config/database';
import { IReward } from '../types';

export class RewardModel {
  static async create(rewardData: Partial<IReward>): Promise<IReward> {
    const { data, error } = await supabase
      .from('rewards')
      .insert([{
        chain_id: rewardData.chainId,
        user_id: rewardData.userId,
        amount: rewardData.amount,
        status: rewardData.status || 'pending',
        paid_at: rewardData.paidAt
      }])
      .select()
      .single();

    if (error) throw error;
    return this.transformReward(data);
  }

  static async findById(id: string): Promise<IReward | null> {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.transformReward(data) : null;
  }

  private static transformReward(data: any): IReward {
    return {
      id: data.id,
      chainId: data.chain_id,
      userId: data.user_id,
      amount: data.amount,
      status: data.status,
      paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}

export default RewardModel;


