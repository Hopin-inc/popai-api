import express from "express";
import ApiResponse from "@/common/ApiResponse";
import SlackController from "@/controllers/SlackController";

const router = express();

router.post("/webhook", async function(req, res) {
  try {
    if (req.headers["content-type"] === "" || typeof req.headers["content-type"] === "undefined") {
      return req.headers["content-type"] = "application/json";
    }
    const controller = new SlackController();
    const payload = JSON.parse(req.body.payload);
    const [response, funcAfterResponse] = await controller.handleEvent(payload);
    ApiResponse.successRawRes(res, response);
    if (funcAfterResponse) {
      await funcAfterResponse();
    }
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

export default router;