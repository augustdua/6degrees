import { supabase } from '../config/database';
import { IConnectionRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ConnectionRequestModel {
  static async create(requestData: Partial<IConnectionRequest>): Promise<IConnectionRequest> {
    const shareableLink = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const { data, error } = await supabase
      .from('connection_requests')
      .insert([{
        creator: requestData.creator,
        target: requestData.target?.trim(),
        message: requestData.message?.trim() || '',
        reward: requestData.reward,
        status: requestData.status || 'active',
        expires_at: expiresAt,
        shareable_link: shareableLink
      }])
      .select()
      .single();

    if (error) throw error;
    return this.transformConnectionRequest(data);
  }

  static async findById(id: string): Promise<IConnectionRequest | null> {
    const { data, error } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.transformConnectionRequest(data) : null;
  }

  static async findByCreator(creatorId: string): Promise<IConnectionRequest[]> {
    const { data, error } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('creator', creatorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.transformConnectionRequest);
  }

  private static transformConnectionRequest(data: any): IConnectionRequest {
    return {
      id: data.id,
      creator: data.creator,
      target: data.target,
      message: data.message,
      reward: data.reward,
      status: data.status,
      expiresAt: new Date(data.expires_at),
      shareableLink: data.shareable_link,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}

export default ConnectionRequestModel;



