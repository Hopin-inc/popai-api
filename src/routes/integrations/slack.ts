import express from "express";
import ApiResponse from "@/common/ApiResponse";
import SlackController from "@/controllers/integrations/SlackController";
import logger from "@/libs/logger";

const router = express();

router.post("/webhook", async (req, res) => {
  let responded: boolean = false;
  try {
    if (req.headers["content-type"] === "" || typeof req.headers["content-type"] === "undefined") {
      req.headers["content-type"] = "application/json";
    }
    const controller = new SlackController();
    const payload = JSON.parse(req.body.payload);
    const [response, funcAfterResponse] = await controller.handleEvent(payload);
    ApiResponse.successRawRes(res, response);
    responded = true;
    if (funcAfterResponse) {
      await funcAfterResponse();
    }
  } catch (error) {
    if (!responded) {
      ApiResponse.errRes(res, error.message, error.status);
    } else {
      logger.error(error.message, error);
    }
  }
});

router.get("/install", async (req, res) => {
  try {
    const controller = new SlackController();
    await controller.handleInstallPath(req, res);
  } catch (error) {
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/oauth_redirect", async (req, res) => {
  try {
    const controller = new SlackController();
    await controller.handleCallback(req, res);
    ApiResponse.successRawRes(res);
  } catch (error) {
    ApiResponse.errRes(res, error.message, error.status);
  }
});

export default router;
