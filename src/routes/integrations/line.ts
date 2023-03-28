import express from "express";
import ApiResponse from "@/common/ApiResponse";
import LineController from "@/controllers/integrations/LineController";
import RichMenuController from "@/controllers/integrations/RichMenuController";
import { StatusCodes } from "@/common/StatusCodes";

const router = express();

// TODO middleware(config),

router.post("/webhook", async function(req, res) {
  try {
    const controller = new LineController();
    const response = await controller.handleEvents(req.body.events);
    ApiResponse.successRes(res, response);
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

router.post("/rich_menu/update", async function(req, res) {
  try {
    const userAgent = req.get("user-agent");
    console.log("userAgent", userAgent);
    if (
      process.env.ENV !== "LOCAL" &&
      !userAgent.endsWith("AppEngine-Google; (+http://code.google.com/appengine)")
    ) {
      return res.status(StatusCodes.FORBIDDEN).send("Access restricted!");
    }

    const demoRichMenuId = req.body.demo_rich_menu_id;

    if (!demoRichMenuId) {
      return res.status(StatusCodes.BAD_REQUEST).send("Invalid parameter!");
    }

    const controller = new RichMenuController();
    const response = await controller.updateRichMenu(demoRichMenuId);

    ApiResponse.successRes(res, response);
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

export default router;
