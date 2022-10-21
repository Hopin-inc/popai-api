import express from 'express';
import { validationError } from './../middleware/validate';
import PingController from '../controllers/ping.controller';
import TrelloRouter from './trello.router';
import MicrosoftRouter from './microsoft.route';
import LineRouter from './line.router';

const router = express();

router.get('/ping', async (_req, res) => {
  const controller = new PingController();
  const response = await controller.getMessage();
  return res.send(response);
});

router.use('/trello', TrelloRouter);
router.use('/microsoft', MicrosoftRouter);
router.use('/line', LineRouter);

router.use(validationError);

export default router;
