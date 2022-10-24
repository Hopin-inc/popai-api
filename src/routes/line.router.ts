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

router.post('/send_message', async function(req, res) {
  try {
    const controller = new LineController();

    const userId = 'Ue008382c2c4654b3405288404351a4c5';

    const response = await controller.sendMessage(
      userId,
      'sungdv',
      '[Code LINE sdk]',
      'http://google.com'
    );
    ResponseApi.successRes(res, response);
  } catch (err) {
    ResponseApi.errRes(res, err.message, err.status);
  }
});

export default router;
