import express from "express";
import ApiResponse from "@/common/ApiResponse";
import SlackController from "@/controllers/SlackController";
import { authRequired } from "@/middleware/auth";

const router = express();

router.post("/webhook", async (req, res) => {
  let responded: boolean = false;
  try {
    if (req.headers["content-type"] === "" || typeof req.headers["content-type"] === "undefined") {
      return req.headers["content-type"] = "application/json";
    }
    const controller = new SlackController();
    const payload = JSON.parse(req.body.payload);
    const [response, funcAfterResponse] = await controller.handleEvent(payload);
    ApiResponse.successRawRes(res, response);
    responded = true;
    if (funcAfterResponse) {
      await funcAfterResponse();
    }
  } catch (err) {
    if (!responded) {
      ApiResponse.errRes(res, err.message, err.status);
    } else {
      console.error(err);
    }
  }
});

router.get("/install", authRequired, async (req, res) => {
  try {
    const controller = new SlackController();
    await controller.handleInstallPath(req, res);
    ApiResponse.successRawRes(res);
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

router.get("/oauth_redirect", async (req, res) => {
  try {
    const controller = new SlackController();
    await controller.handleCallback(req, res);
    ApiResponse.successRawRes(res);
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

export default router;