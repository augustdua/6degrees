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
  credit_cost: Joi.number().min(10).max(1000).required().messages({
    'number.min': 'Minimum credit cost is 10 credits',
    'number.max': 'Maximum credit cost is 1000 credits',
    'any.required': 'Credit cost is required'
  }),
  target_cash_reward: Joi.number().min(10).max(10000).optional().messages({
    'number.min': 'Minimum cash reward is $10',
    'number.max': 'Maximum cash reward is $10,000'
  }),
  target_organization_id: Joi.string().uuid().optional().allow(null).messages({
    'string.guid': 'Invalid organization ID format'
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
  }),
  birthdayDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().allow('').messages({
    'string.pattern.base': 'Birthday must be in YYYY-MM-DD format'
  }),
  birthdayVisibility: Joi.string().valid('private', 'connections', 'public').optional().messages({
    'any.only': 'Birthday visibility must be private, connections, or public'
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

// Validate UUID format for Supabase
export const validateUUID = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];

    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`
      });
      return;
    }

    next();
  };
};


