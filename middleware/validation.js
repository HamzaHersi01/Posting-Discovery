// middleware/validation.js
import { body, query, param, validationResult } from 'express-validator';

// Validation for job creation
export const validateJobPost = [
  body('title')
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('category')
    .isIn(['plumbing', 'electrical', 'carpentry', 'cleaning', 'gardening', 'painting', 'other'])
    .withMessage('Invalid category'),
  body('location.postcode')
    .isPostalCode('GB')
    .withMessage('Valid UK postcode required'),
  body('image')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL')
];

// Validation for job updates
export const validateJobUpdate = [
  param('id')
    .isMongoId()
    .withMessage('Invalid job ID'),
  body('title')
    .optional()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .optional()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('location.postcode')
    .optional()
    .isPostalCode('GB')
    .withMessage('Valid UK postcode required')
];

// Validation for job queries
export const validateJobQuery = [
  query('category')
    .optional()
    .isIn(['plumbing', 'electrical', 'carpentry', 'cleaning', 'gardening', 'painting', 'other'])
    .withMessage('Invalid category'),
  query('radius')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Radius must be between 1 and 100 km'),
  query('location')
    .optional()
    .isPostalCode('GB')
    .withMessage('Valid UK postcode required'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

// Check for validation errors - MAKE SURE THIS EXPORT EXISTS
export const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation failed', 
      errors: errors.array() 
    });
  }
  next();
};