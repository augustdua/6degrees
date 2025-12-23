import { Request, Response } from 'express';

// User Types
export interface IUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string;
  bio?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** Zaurq role for access control */
  role?: 'ZAURQ_USER' | 'ZAURQ_PARTNER';
  /** Deprecated: legacy membership status (kept for compatibility during rollout) */
  membershipStatus?: 'member' | 'waitlist' | 'rejected';
}

// Connection Request Types
export interface IConnectionRequest {
  id: string;
  creator: string; // User ID
  target: string; // Description of who they want to connect with
  message?: string; // Optional message
  reward: number; // Reward amount in dollars
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  expiresAt: Date;
  shareableLink: string; // Unique link for sharing
  createdAt: Date;
  updatedAt: Date;
}

// Chain Types
export interface IChain {
  id: string;
  requestId: string; // Connection Request ID
  participants: IChainParticipant[];
  status: 'active' | 'completed' | 'failed';
  completedAt?: Date;
  totalReward: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChainParticipant {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'creator' | 'forwarder' | 'target' | 'connector';
  joinedAt: Date;
  rewardAmount?: number;
}

// Reward Types
export interface IReward {
  id: string;
  chainId: string;
  userId: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Request/Response Types
export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

// Validation Types
export interface CreateRequestData {
  target: string;
  message?: string;
  reward: number;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  bio?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  avatar?: string;
}


