import bcrypt from 'bcryptjs';
import { supabase } from '../config/database';
import { IUser } from '../types';

export class UserModel {
  static async create(userData: Partial<IUser>): Promise<IUser> {
    // Hash password before saving
    if (userData.password) {
      const salt = await bcrypt.genSalt(12);
      userData.password = await bcrypt.hash(userData.password, salt);
    }

    const { data, error } = await supabase
      .from('users')
      .insert([{
        email: userData.email?.toLowerCase().trim(),
        password: userData.password,
        first_name: userData.firstName?.trim(),
        last_name: userData.lastName?.trim(),
        avatar: userData.avatar || null,
        bio: userData.bio || '',
        linkedin_url: userData.linkedinUrl || null,
        twitter_url: userData.twitterUrl || null,
        is_verified: userData.isVerified || false
      }])
      .select()
      .single();

    if (error) throw error;
    return this.transformUser(data);
  }

  static async findByEmail(email: string): Promise<IUser | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.transformUser(data) : null;
  }

  static async findById(id: string): Promise<IUser | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.transformUser(data) : null;
  }

  static async comparePassword(candidatePassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, hashedPassword);
  }

  private static transformUser(data: any): IUser {
    return {
      id: data.id,
      email: data.email,
      password: data.password,
      firstName: data.first_name,
      lastName: data.last_name,
      fullName: `${data.first_name} ${data.last_name}`,
      avatar: data.avatar,
      bio: data.bio,
      linkedinUrl: data.linkedin_url,
      twitterUrl: data.twitter_url,
      isVerified: data.is_verified,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

export default UserModel;


