import express from "express";
import ApiResponse from "@/common/ApiResponse";
import { StatusCodes } from "@/common/StatusCodes";
import UserController from "@/controllers/app/UserController";
import { SessionErrors } from "@/consts/error-messages";
import logger from "@/libs/logger";

const router = express();

router.patch("/", async (req, res) => {
  try {
    const data = req.body;
    const controller = new UserController();
    const { company } = req.session;
    if (company) {
      const response = await controller.update(data, company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.delete("/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const controller = new UserController();
    const { company } = req.session;
    if (company) {
      const response = await controller.delete(userId, company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/configs", async (req, res) => {
  try {
    // const chatToolId = parseInt(req.query.chatToolId as string);
    // const todoAppId = parseInt(req.query.todoAppId as string);
    const controller = new UserController();
    const { company } = req.session;
    if (company) {
      const response = await controller.getConfigs(company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/reporting-lines", async (req, res) => {
  try {
    const controller = new UserController();
    const { company } = req.session;
    if (company) {
      const response = await controller.getReportingLines(company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.patch("/reporting-lines/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const data: string[] = req.body as string[];
    const controller = new UserController();
    const { company } = req.session;
    if (company && userId) {
      const response = await controller.updateReportingLines(data, company.id, userId);
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
