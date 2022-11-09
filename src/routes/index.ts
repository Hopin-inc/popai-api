import express from 'express';
import { validationError } from './../middleware/validate';
import LineRouter from './line.router';
import RemindRoute from './remind.router';

const router = express();

router.use('/line', LineRouter);
router.use('/remind', RemindRoute);

router.use(validationError);

export default router;
