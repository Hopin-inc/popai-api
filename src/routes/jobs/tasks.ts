import express from "express";

import TaskController from "@/controllers/jobs/TaskController";
import ApiResponse from "@/common/ApiResponse";

const router = express();

router.get("/update", async (req, res) => {
  try {
    const notify = !!req.query.notify;
    const controller = new TaskController();
    const response = await controller.syncTodos(notify);
    ApiResponse.successRes(res, response);
  } catch (error) {
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/daily", async (req, res) => {
  try {
    const controller = new TaskController();
    const response = await controller.sendDailyReport();
    ApiResponse.successRes(res, response);
  } catch (error) {
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/report", async (req, res) => {
  try {
    const monthly = !!req.query.monthly;
    const controller = new TaskController();
    // await controller.syncTodos();
    const response = await controller.sendPerformanceReport(monthly);
    ApiResponse.successRes(res, response);
  } catch (error) {
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/prospect", async (req, res) => {
  try {
    const controller = new TaskController();
    const response = await controller.askProspects();
    ApiResponse.successRes(res, response);
  } catch (error) {
    ApiResponse.errRes(res, error.message, error.status);
  }
});

export default router;
