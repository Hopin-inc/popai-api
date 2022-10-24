import express from 'express';
import { validationError } from './../middleware/validate';
import PingController from '../controllers/ping.controller';
import LineRouter from './line.router';
import RemindRoute from './remind.router';
import TrelloRoute from './trello.router';
import MicrosoftRoute from './microsoft.router';

const router = express();

router.get('/ping', async (_req, res) => {
  const controller = new PingController();
  const response = await controller.getMessage();
  return res.send(response);
});

router.use('/line', LineRouter);
router.use('/remind', RemindRoute);
router.use('/trello', TrelloRoute);
router.use('/microsoft', MicrosoftRoute);

router.use(validationError);

export default router;
