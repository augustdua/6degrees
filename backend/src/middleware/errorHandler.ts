import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', err);

  // Supabase/PostgreSQL errors
  if (err.message?.includes('duplicate key value')) {
    const message = 'Duplicate field value entered';
    error = createError(message, 400);
  }

  // General validation errors
  if (err.name === 'ValidationError') {
    const message = 'Invalid input data';
    error = createError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = createError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = createError(message, 401);
  }

  const response: ApiResponse = {
    success: false,
    message: error.message || 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  };

  res.status(error.statusCode || 500).json(response);
};

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = createError(`Not found - ${req.originalUrl}`, 404);
  next(error);
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};


