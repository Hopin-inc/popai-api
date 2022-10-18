import express from 'express';
import { ResponseApi } from '../common/response';
import MicrosoftController from '../controllers/microsoft.controller';

const router = express();

router.get('/', async (req, res) => {
  try {
    const controller = new MicrosoftController();
    const response = await controller.getAccessToken();
    ResponseApi.successRes(res, response);
  } catch (err) {
    ResponseApi.errRes(res, err.message, err.status);
  }
});

export default router;
