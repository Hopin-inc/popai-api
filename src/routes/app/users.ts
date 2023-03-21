import express from "express";
import ApiResponse from "@/common/ApiResponse";
import { StatusCodes } from "@/common/StatusCodes";
import UserController from "@/controllers/app/UserController";

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
      ApiResponse.errRes(res, "Bad request.", StatusCodes.BAD_REQUEST);
    }
  } catch (err) {
    console.error(err);
    ApiResponse.errRes(res, err.message, err.status);
  }
});

router.delete("/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const controller = new UserController();
    const { company } = req.session;
    if (company) {
      const response = await controller.delete(userId, company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, "Bad request.", StatusCodes.BAD_REQUEST);
    }
  } catch (err) {
    console.error(err);
    ApiResponse.errRes(res, err.message, err.status);
  }
});

router.get("/configs", async (req, res) => {
  try {
    const chatToolId = parseInt(req.query.chatToolId as string);
    const todoAppId = parseInt(req.query.todoAppId as string);
    const controller = new UserController();
    const { company } = req.session;
    if (company) {
      const response = await controller.getConfigs(company.id, chatToolId, todoAppId);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, "Bad request.", StatusCodes.BAD_REQUEST);
    }
  } catch (err) {
    console.error(err);
    ApiResponse.errRes(res, err.message, err.status);
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
      ApiResponse.errRes(res, "Bad request.", StatusCodes.BAD_REQUEST);
    }
  } catch (err) {
    console.error(err);
    ApiResponse.errRes(res, err.message, err.status);
  }
});

router.patch("/reporting-lines/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const data: number[] = req.body;
    const controller = new UserController();
    const { company } = req.session;
    if (company && userId) {
      const response = await controller.updateReportingLines(data, company.id, userId);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, "Bad request.", StatusCodes.BAD_REQUEST);
    }
  } catch (err) {
    console.error(err);
    ApiResponse.errRes(res, err.message, err.status);
  }
});

export default router;
