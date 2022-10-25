import express from 'express';
import { ResponseApi } from './../common/response';
import LineController from '../controllers/line.controller';
const router = express();

// TODO middleware(config),

router.post('/webhook', async function(req, res) {
  try {
    const controller = new LineController();
    const response = await controller.handlerEvents(req.body.events);
    ResponseApi.successRes(res, response);
  } catch (err) {
    ResponseApi.errRes(res, err.message, err.status);
  }
});

export default router;
