// routes/jobs.js
import { Router } from 'express';
import * as controller from '../controllers/jobsController.js';
import {
  validateJobPost,
  validateJobUpdate,
  validateJobQuery,
  checkValidation,
  validateCustomerId,
  validateTradesmanId,
} from '../middleware/validation.js';
import upload from '../middleware/upload.js';

const router = Router();

router.post(
  '/postJobs',
  upload.single('image'),
  validateJobPost,
  checkValidation,
  controller.postJobs
);

router.get('/getJobs', validateJobQuery, checkValidation, controller.getJobs);
router.get('/:id', controller.getJob);
router.put(
  '/updateJobs/:id',
  upload.single('image'),
  validateJobUpdate,
  checkValidation,
  controller.updateJob
);;
router.delete('/deleteJobs/:id', controller.deleteJob);
//Get jobs by customerId with param validation
router.get(
  '/customer/:customerId',
  validateCustomerId,
  checkValidation,
  controller.getJobsByCustomer
);

// Get jobs by tradesmanId with param validation
router.get(
  '/tradesman/:tradesmanId',
  validateTradesmanId,
  checkValidation,
  controller.getJobsByTradesman
);

export default router;
