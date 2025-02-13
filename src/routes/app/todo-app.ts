import express from "express";
import ApiResponse from "@/common/ApiResponse";
import { StatusCodes } from "@/common/StatusCodes";
import TodoAppController from "@/controllers/app/TodoAppController";
import { SessionErrors } from "@/consts/error-messages";
import logger from "@/libs/logger";

const router = express();

router.get("/", async (req, res) => {
  try {
    const controller = new TodoAppController();
    const { company } = req.session;
    if (company) {
      const response = await controller.get(company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.delete("/", async (req, res) => {
  try {
    const controller = new TodoAppController();
    const { company } = req.session;
    if (company) {
      const response = await controller.disconnect(company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/:todoAppId/accounts", async (req, res) => {
  try {
    const todoAppId: number = parseInt(req.params.todoAppId);
    const baseUrl: string = `${ req.protocol }://${ req.get("host") }`;
    const controller = new TodoAppController();
    const { company } = req.session;
    if (company) {
      const response = await controller.getUsers(todoAppId, company.id, baseUrl);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.patch("/:todoAppId/users/:userId", async (req, res) => {
  try {
    const todoAppId: number = parseInt(req.params.todoAppId);
    const userId = req.params.userId;
    const { id }: { id: string } = req.body;
    const controller = new TodoAppController();
    const { company } = req.session;
    if (company) {
      const response = await controller.updateTodoAppUser(todoAppId, company.id, userId, id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/:todoAppId/board", async (req, res) => {
  try {
    const todoAppId: number = parseInt(req.params.todoAppId);
    const controller = new TodoAppController();
    const { company } = req.session;
    if (company) {
      const response = await controller.getBoardConfig(todoAppId, company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.post("/:todoAppId/board", async (req, res) => {
  try {
    const todoAppId: number = parseInt(req.params.todoAppId);
    const controller = new TodoAppController();
    const { company } = req.session;
    if (company) {
      const response = await controller.fetch(todoAppId, company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.patch("/:todoAppId/board", async (req, res) => {
  try {
    const todoAppId: number = parseInt(req.params.todoAppId);
    const boardId: string = req.body.boardId;
    const projectRule: number | undefined = req.body.projectRule;
    const baseUrl: string = `${ req.protocol }://${ req.get("host") }`;
    const controller = new TodoAppController();
    const { company } = req.session;
    if (company) {
      const response = await controller.updateBoardConfig(todoAppId, company.id, boardId, projectRule, baseUrl);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/:todoAppId/boards", async (req, res) => {
  try {
    const todoAppId: number = parseInt(req.params.todoAppId);
    const baseUrl: string = `${ req.protocol }://${ req.get("host") }`;
    const controller = new TodoAppController();
    const { company } = req.session;
    if (company) {
      const response = await controller.getBoards(todoAppId, company.id, baseUrl);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/:todoAppId/boards/:boardId/properties", async (req, res) => {
  try {
    const todoAppId: number = parseInt(req.params.todoAppId);
    const baseUrl: string = `${ req.protocol }://${ req.get("host") }`;
    const boardId: string = req.params.boardId;
    const controller = new TodoAppController();
    const { company } = req.session;
    if (company) {
      const response = await controller.getProperties(todoAppId, company.id, boardId, baseUrl);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/:todoAppId/boards/:boardId/usages", async (req, res) => {
  try {
    const todoAppId: number = parseInt(req.params.todoAppId);
    const boardId: string = req.params.boardId;
    const controller = new TodoAppController();
    const { company } = req.session;
    if (company) {
      const response = await controller.getUsages(todoAppId, company.id, boardId);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.patch("/:todoAppId/boards/:boardId/usages", async (req, res) => {
  try {
    const todoAppId: number = parseInt(req.params.todoAppId);
    const boardId: string = req.params.boardId;
    const data = req.body;
    const controller = new TodoAppController();
    const { company } = req.session;
    if (company) {
      const response = await controller.updateUsages(data, todoAppId, company.id, boardId);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

export default router;
