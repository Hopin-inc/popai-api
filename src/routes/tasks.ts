import express from "express";

import TaskController from "@/controllers/TaskController";
import ApiResponse from "@/common/ApiResponse";

const router = express();

router.get("/update", async (req, res) => {
  try {
    const controller = new TaskController();
    const response = await controller.syncTodos();
    ApiResponse.successRes(res, response);
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

router.get("/remind", async (req, res) => {
  try {
    // update before remind
    const controller = new TaskController();
    // await controller.syncTodos();

    // remind
    const response = await controller.remind();
    ApiResponse.successRes(res, response);
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

export default router;
