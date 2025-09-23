import { Response } from 'express';
import { AuthenticatedRequest } from '../types';

// Stub controller - to be implemented with Supabase
export const createRequest = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({
    success: false,
    message: 'Request creation functionality not yet implemented'
  });
};

export const getMyRequests = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({
    success: false,
    message: 'Request retrieval functionality not yet implemented'
  });
};

export const getRequestByLink = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({
    success: false,
    message: 'Request link functionality not yet implemented'
  });
};

export const joinChain = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({
    success: false,
    message: 'Chain joining functionality not yet implemented'
  });
};

export const completeChain = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({
    success: false,
    message: 'Chain completion functionality not yet implemented'
  });
};