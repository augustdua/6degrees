import { supabase } from '../config/database';
import { IChain } from '../types';

export class ChainModel {
  static async create(chainData: Partial<IChain>): Promise<IChain> {
    const { data, error } = await supabase
      .from('chains')
      .insert([{
        request_id: chainData.requestId,
        participants: chainData.participants,
        status: chainData.status || 'active',
        completed_at: chainData.completedAt,
        total_reward: chainData.totalReward
      }])
      .select()
      .single();

    if (error) throw error;
    return this.transformChain(data);
  }

  static async findById(id: string): Promise<IChain | null> {
    const { data, error } = await supabase
      .from('chains')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.transformChain(data) : null;
  }

  private static transformChain(data: any): IChain {
    return {
      id: data.id,
      requestId: data.request_id,
      participants: data.participants,
      status: data.status,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      totalReward: data.total_reward,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}

export default ChainModel;


