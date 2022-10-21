import express from 'express';
import { ResponseApi } from './../common/response';
import LineController from '../controllers/line.controller';
import {
  // main APIs
  Client,
  middleware,

  // exceptions
  JSONParseError,
  SignatureValidationFailed,

  // types
  TemplateMessage,
  WebhookEvent,
} from '@line/bot-sdk';

const router = express();

const config = {
  channelAccessToken:
    'r7mqQw5Ob4sVo2g2Ud5xPnORryQV140P5X6gMlLeMpU3OboLX5IMM//8WKYgKM8vVXqw3Gocr6CGOMVUputAX6BxWXlN17ySjHOrnsYAGHSHuUXeZOeLKEOsTwADMtnU2U/4+dYnfJBvZEl0Jjf4twdB04t89/1O/w1cDnyilFU=',
  channelSecret: 'f7b05245bea6a4d07aa55483f4c6f533',
};

// create LINE SDK client
const client = new Client(config);

// TODO middleware(config),

router.post('/webhook', async function(req, res) {
  try {
    const controller = new LineController();

    const response = await controller.handlerEvents(client, req.body.events);
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
      client,
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
