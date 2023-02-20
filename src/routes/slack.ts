import express from "express";
import ApiResponse from "@/common/ApiResponse";
import SlackController from "@/controllers/SlackController";

const router = express();

router.post("/webhook", async function(req, res) {
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

export default router;