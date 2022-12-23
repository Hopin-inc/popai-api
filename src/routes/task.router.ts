import express from "express";
import TaskController from "./../controllers/task.controller";
import { ResponseApi } from "../common/response";

const router = express();

router.get("/update", async (req, res) => {
  try {
    const userAgent = req.get("user-agent");
    console.log("userAgent", userAgent);
    if (
      process.env.ENV != "LOCAL" &&
      !userAgent.endsWith("AppEngine-Google; (+http://code.google.com/appengine)")
    ) {
      return res.status(403).send("Access restricted!");
    }

    const controller = new TaskController();
    const response = await controller.syncTodoTask();
    ResponseApi.successRes(res, response);
  } catch (err) {
    ResponseApi.errRes(res, err.message, err.status);
  }
});

router.get("/remind", async (req, res) => {
  try {
    const userAgent = req.get("user-agent");
    console.log("userAgent", userAgent);
    if (
      process.env.ENV != "LOCAL" &&
      !userAgent.endsWith("AppEngine-Google; (+http://code.google.com/appengine)")
    ) {
      return res.status(403).send("Access restricted!");
    }

    // update before remind
    const controller = new TaskController();
    await controller.syncTodoTask();

    // remind
    const response = await controller.remindTaskForCompany();
    ResponseApi.successRes(res, response);
  } catch (err) {
    ResponseApi.errRes(res, err.message, err.status);
  }
});

export default router;
