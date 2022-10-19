import express from 'express';
import { CreateUserRequest } from '../dto/trello/create-user-trello.dto';
import { dtoValidation } from './../middleware/validate';
import TrelloController from '../controllers/trello.controller';
import { ResponseApi } from './../common/response';

const router = express();

router.get('/', async (req, res) => {
  try {
    const controller = new TrelloController();
    const response = await controller.getBoard();
    ResponseApi.successRes(res, response);
  } catch (err) {
    ResponseApi.errRes(res, err.message, err.status);
  }
});

router.get('/card-remind', async (req, res) => {
  try {
    const controller = new TrelloController();
    const response = await controller.getCardRemind();
    ResponseApi.successRes(res, response);
  } catch (err) {
    ResponseApi.errRes(res, err.message, err.status);
  }
});

router.post('/create-user', dtoValidation(CreateUserRequest), async function(req, res) {
  try {
    const controller = new TrelloController();
    const response = await controller.createUser(req.body);
    ResponseApi.successRes(res, response);
  } catch (err) {
    ResponseApi.errRes(res, err.message, err.status);
  }
});

router.get('/user', async (req, res) => {
  try {
    const controller = new TrelloController();
    const response = await controller.getUsers();
    ResponseApi.successRes(res, response);
  } catch (err) {
    ResponseApi.errRes(res, err.message, err.status);
  }
});

export default router;
