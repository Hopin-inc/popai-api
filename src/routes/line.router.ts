import express from 'express';
import { ResponseApi } from '../common/response';
import LineController from '../controllers/line.controller';
import RichMenuController from '../controllers/rich_menu.controller';
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

router.post('/rich_menu/update', async function(req, res) {
  try {
    const userAgent = req.get('user-agent');
    console.log('userAgent', userAgent);
    if (
      process.env.ENV != 'LOCAL' &&
      !userAgent.endsWith('AppEngine-Google; (+http://code.google.com/appengine)')
    ) {
      return res.status(403).send('Access restricted!');
    }

    const demoRichMenuId = req.body.demo_rich_menu_id;

    if (!demoRichMenuId) {
      return res.status(400).send('Invalid parameter!');
    }

    const controller = new RichMenuController();
    const response = await controller.updateRichMenu(demoRichMenuId);

    ResponseApi.successRes(res, response);
  } catch (err) {
    ResponseApi.errRes(res, err.message, err.status);
  }
});

export default router;
