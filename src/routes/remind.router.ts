import express from 'express';
import RemindController from '../controllers/remind.controller';
import { ResponseApi } from '../common/response';

const router = express();

router.get('/', async (req, res) => {
  try {
    const controller = new RemindController();
    const response = await controller.remindCompany();
    ResponseApi.successRes(res, response);
  } catch (err) {
    ResponseApi.errRes(res, err.message, err.status);
  }
});

export default router;
