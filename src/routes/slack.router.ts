import express from 'express';
import { ResponseApi } from '../common/response';
import SlackController from '../controllers/slack.controller';
const router = express();

// TODO middleware(config),

router.post('/webhook', async function(req, res) {
  try {
    const controller = new SlackController();
    const response = await controller.handleEvent(req.body.events);
    ResponseApi.successRes(res, response);
  } catch (err) {
    ResponseApi.errRes(res, err.message, err.status);
  }
});