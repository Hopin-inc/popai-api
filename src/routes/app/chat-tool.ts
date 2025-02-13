import express from "express";
import ChatToolController from "@/controllers/app/ChatToolController";
import ApiResponse from "@/common/ApiResponse";
import { StatusCodes } from "@/common/StatusCodes";
import { SessionErrors } from "@/consts/error-messages";
import logger from "@/libs/logger";

const router = express();

router.get("/", async (req, res) => {
  try {
    const controller = new ChatToolController();
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

router.get("/:chatToolId/accounts", async (req, res) => {
  try {
    const chatToolId: number = parseInt(req.params.chatToolId);
    const controller = new ChatToolController();
    const { company } = req.session;
    if (company) {
      const response = await controller.getUsers(chatToolId, company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.patch("/:chatToolId/users/:userId", async (req, res) => {
  try {
    const chatToolId: number = parseInt(req.params.chatToolId);
    const userId = req.params.userId;
    const { id }: { id: string } = req.body;
    const controller = new ChatToolController();
    const { company } = req.session;
    if (company) {
      const response = await controller.updateChatToolUser(chatToolId, company.id, userId, id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
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
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/:chatToolId/channels/:channelId", async (req, res) => {
  try {
    const chatToolId: number = parseInt(req.params.chatToolId);
    const botId: string = req.query.botId as string;
    const channelId: string = req.params.channelId;
    const controller = new ChatToolController();
    const { company } = req.session;
    if (company) {
      const response = await controller.getChannelInfo(botId, channelId, chatToolId, company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/:chatToolId/bots", async (req, res) => {
  try {
    const chatToolId: number = parseInt(req.params.chatToolId);
    const controller = new ChatToolController();
    const { company } = req.session;
    if (company) {
      const response = await controller.getBots("group", chatToolId, company.id);
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
