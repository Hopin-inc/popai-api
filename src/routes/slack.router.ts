import express from 'express';
import { ResponseApi } from '../common/response';
import SlackController from '../controllers/slack.controller';

const router = express();

router.post('/webhook', async function(req, res) {
  try {
    if (req.headers['content-type'] === '' || typeof req.headers['content-type'] === 'undefined') {
      return req.headers['content-type'] = 'application/json';
    }
    const controller = new SlackController();
    const payload = JSON.parse(req.body.payload);
    const response = await controller.handleEvent(payload);
    ResponseApi.successRes(res, response);
  } catch (err) {
    ResponseApi.errRes(res, err.message, err.status);
  }
});

export default router;