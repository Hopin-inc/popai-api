import express from "express";
import { authRequired } from "@/middleware/auth";
import ApiResponse from "@/common/ApiResponse";
import NotionController from "@/controllers/integrations/NotionController";
import * as process from "process";

const router = express();

router.get("/install", authRequired, async (req, res) => {
  try {
    const controller = new NotionController();
    const url = await controller.getAuthUrl(req);
    res.redirect(url);
  } catch (error) {
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/oauth_redirect", async (req, res) => {
  try {
    const controller = new NotionController();
    await controller.handleCallback(req);
    res.redirect(`${ process.env.CLIENT_BASE_URL }/link`);
  } catch (_err) {
    res.redirect(`${ process.env.CLIENT_BASE_URL }/link`);
  }
});

export default router;
