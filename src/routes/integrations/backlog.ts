import express from "express";
import { authRequired } from "@/middleware/auth";
import ApiResponse from "@/common/ApiResponse";
import BacklogController from "@/controllers/integrations/BacklogController";
import * as process from "process";
import { BacklogWebhookPayload } from "@/types/backlog";
import logger from "@/libs/logger";

const router = express();

router.post("/webhook/:companyId", async (req, res) => {
  try {
    const controller = new BacklogController();
    const companyId = req.params.companyId;
    const payload: BacklogWebhookPayload = req.body;
    const response = await controller.handleWebhook(companyId, payload);
    ApiResponse.successRes(res, response);
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/install", authRequired, async (req, res) => {
  try {
    const host = req.query.host as string;
    const controller = new BacklogController();
    const url = await controller.getAuthUrl(req, host);
    res.redirect(url);
  } catch (error) {
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/oauth_redirect", async (req, res) => {
  try {
    const controller = new BacklogController();
    await controller.handleCallback(req);
    res.redirect(`${ process.env.CLIENT_BASE_URL }/link/todo-app`);
  } catch (_err) {
    res.redirect(`${ process.env.CLIENT_BASE_URL }/link/todo-app`);
  }
});

export default router;
