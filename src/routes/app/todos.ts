import express from "express";
import ApiResponse from "@/common/ApiResponse";
import { StatusCodes } from "@/common/StatusCodes";
import TodoController from "@/controllers/app/TodoController";
import { SessionErrors } from "@/consts/error-messages";
import logger from "@/libs/logger";
import { TodoFilter } from "@/types/todos";

const router = express();

router.get("/:todoAppId", async (req, res) => {
  try {
    const controller = new TodoController();
    const todoAppId: number = parseInt(req.params.todoAppId);
    const { company } = req.session;
    if (company) {
      const response = await controller.get(company.id, todoAppId, req.query as unknown as TodoFilter);
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
