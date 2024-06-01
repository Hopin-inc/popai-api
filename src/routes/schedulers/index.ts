import express from "express";

import SchedulerController from "@/controllers/SchedulerController";
import ApiResponse from "@/common/ApiResponse";

const router = express();

router.get("/update", async (req, res) => {
  try {
    const controller = new SchedulerController();
    const response = await controller.syncTodos();
    ApiResponse.successRes(res, response);
  } catch (error) {
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/prospect", async (req, res) => {
  try {
    const controller = new SchedulerController();
    const response = await controller.askProspects();
    ApiResponse.successRes(res, response);
  } catch (error) {
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/remind", async (req, res) => {
  try {
    const controller = new SchedulerController();
    const response = await controller.remindTodos();
    ApiResponse.successRes(res, response);
  } catch (error) {
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/report", async (req, res) => {
  try {
    const controller = new SchedulerController();
    const response = await controller.reportTodos();
    ApiResponse.successRes(res, response);
  } catch (error) {
    ApiResponse.errRes(res, error.message, error.status);
  }
});

export default router;
