import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Validation schemas
export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  }),
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name cannot exceed 50 characters',
    'any.required': 'First name is required'
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name cannot exceed 50 characters',
    'any.required': 'Last name is required'
  })
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

export const createRequestSchema = Joi.object({
  target: Joi.string().min(10).max(200).required().messages({
    'string.min': 'Target description must be at least 10 characters long',
    'string.max': 'Target description cannot exceed 200 characters',
    'any.required': 'Target description is required'
  }),
  message: Joi.string().max(1000).optional().allow('').messages({
    'string.max': 'Message cannot exceed 1000 characters'
  }),
  reward: Joi.number().min(10).max(10000).required().messages({
    'number.min': 'Minimum reward is $10',
    'number.max': 'Maximum reward is $10,000',
    'any.required': 'Reward amount is required'
  })
});

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name cannot exceed 50 characters'
  }),
  lastName: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name cannot exceed 50 characters'
  }),
  bio: Joi.string().max(500).optional().allow('').messages({
    'string.max': 'Bio cannot exceed 500 characters'
  }),
  linkedinUrl: Joi.string().uri().optional().allow('').messages({
    'string.uri': 'Please provide a valid LinkedIn URL'
  }),
  twitterUrl: Joi.string().uri().optional().allow('').messages({
    'string.uri': 'Please provide a valid Twitter URL'
  }),
  avatar: Joi.string().uri().optional().allow('').messages({
    'string.uri': 'Please provide a valid avatar URL'
  })
});

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errorMessages
      });
      return;
    }
    
    next();
  };
};

// Validate MongoDB ObjectId
export const validateObjectId = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`
      });
      return;
    }
    
    next();
  };
};


