import express from 'express';
import RemindController from '../controllers/remind.controller';
import { ResponseApi } from '../common/response';

const router = express();

router.get('/', async (req, res) => {
  try {
    const userAgent = req.get('user-agent');
    console.log('userAgent', userAgent);
    if (
      process.env.ENV != 'LOCAL' &&
      !userAgent.endsWith('AppEngine-Google; (+http://code.google.com/appengine)')
    ) {
      return res.status(403).send('Access restricted!');
    }

    const controller = new RemindController();
    const response = await controller.remindCompany();
    ResponseApi.successRes(res, response);
  } catch (err) {
    ResponseApi.errRes(res, err.message, err.status);
  }
});

export default router;
