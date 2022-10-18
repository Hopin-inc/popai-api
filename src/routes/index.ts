import express from 'express';
import { validationError } from './../middleware/validate';
import PingController from '../controllers/ping.controller';
import TrelloRouter from './trello.router';

const router = express();

router.get('/ping', async (_req, res) => {
  const controller = new PingController();
  const response = await controller.getMessage();
  return res.send(response);
});

router.use('/trello', TrelloRouter);

router.use(validationError);

export default router;
