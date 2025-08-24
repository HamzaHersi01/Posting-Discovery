// routes/jobs.js
import { Router } from 'express';
import * as controller from '../controllers/jobsController.js';
import {
  validateJobPost,
  validateJobUpdate,
  validateJobQuery,
  checkValidation
} from '../middleware/validation.js';

const router = Router();

router.post('/postJobs', validateJobPost, checkValidation, controller.postJobs);
router.get('/getJobs', validateJobQuery, checkValidation, controller.getJobs);
router.get('/:id', controller.getJob);
router.put('/updateJobs/:id', validateJobUpdate, checkValidation, controller.updateJob);
router.delete('/deleteJobs/:id', controller.deleteJob);

export default router;