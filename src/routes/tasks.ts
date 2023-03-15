import express from "express";

import TaskController from "@/controllers/TaskController";
import ApiResponse from "@/common/ApiResponse";

const router = express();

router.get("/update", async (req, res) => {
  try {
    const notify = !!req.query.notify;
    const controller = new TaskController();
    const response = await controller.syncTodos(notify);
    ApiResponse.successRes(res, response);
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

router.get("/remind", async (req, res) => {
  try {
    const controller = new TaskController();
    await controller.syncTodos();
    const response = await controller.remind();
    ApiResponse.successRes(res, response);
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

router.get("/daily", async (req, res) => {
  try {
    const controller = new TaskController();
    await controller.syncTodos();
    const response = await controller.sendDailyReport();
    ApiResponse.successRes(res, response);
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

router.get("/report", async (req, res) => {
  try {
    const monthly = !!req.query.monthly;
    const controller = new TaskController();
    // await controller.syncTodos();
    const response = await controller.sendPerformanceReport(monthly);
    ApiResponse.successRes(res, response);
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

router.get("/prospect", async (req, res) => {
  try {
    const controller = new TaskController();
    const response = await controller.askProspects();
    ApiResponse.successRes(res, response);
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

export default router;
