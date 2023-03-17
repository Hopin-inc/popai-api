import express from "express";
import ChatToolController from "@/controllers/app/ChatToolController";
import ApiResponse from "@/common/ApiResponse";
import { StatusCodes } from "@/common/StatusCodes";

const router = express();

router.get("/", async (req, res) => {
  try {
    const controller = new ChatToolController();
    const { company } = req.session;
    if (company) {
      const response = await controller.getList(company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, "Bad request.", StatusCodes.BAD_REQUEST);
    }
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

router.get("/:chatToolId/accounts", async (req, res) => {
  try {
    const chatToolId: number = parseInt(req.params.chatToolId);
    const controller = new ChatToolController();
    const { company } = req.session;
    if (company) {
      const response = await controller.getUsers(chatToolId, company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, "Bad request.", StatusCodes.BAD_REQUEST);
    }
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

router.get("/:chatToolId/channels", async (req, res) => {
  try {
    const chatToolId: number = parseInt(req.params.chatToolId);
    const controller = new ChatToolController();
    const { company } = req.session;
    if (company) {
      const response = await controller.getChannels(chatToolId, company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, "Bad request.", StatusCodes.BAD_REQUEST);
    }
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

export default router;
