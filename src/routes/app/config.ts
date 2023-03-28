import express from "express";
import ApiResponse from "@/common/ApiResponse";
import { StatusCodes } from "@/common/StatusCodes";
import ConfigController from "@/controllers/app/ConfigController";
import { IConfigCommon, IConfigDailyReport } from "@/types/app";

const router = express();

router.get("/", async (req, res) => {
  try {
    const controller = new ConfigController();
    const { company } = req.session;
    if (company) {
      const response = await controller.getCommonConfig(company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, "Bad request.", StatusCodes.BAD_REQUEST);
    }
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

router.patch("/", async (req, res) => {
  try {
    const controller = new ConfigController();
    const { company } = req.session;
    const data: Partial<IConfigCommon> = req.body;
    if (company) {
      const response = await controller.updateCommonConfig(data, company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, "Bad request.", StatusCodes.BAD_REQUEST);
    }
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

router.get("/daily-report", async (req, res) => {
  try {
    const controller = new ConfigController();
    const { company } = req.session;
    if (company) {
      const response = await controller.getDailyReportConfig(company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, "Bad request.", StatusCodes.BAD_REQUEST);
    }
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

router.patch("/daily-report", async (req, res) => {
  try {
    const controller = new ConfigController();
    const { company } = req.session;
    const data: Partial<IConfigDailyReport> = req.body;
    if (company) {
      const response = await controller.updateDailyReportConfig(data, company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, "Bad request.", StatusCodes.BAD_REQUEST);
    }
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

router.get("/notify", async (req, res) => {
  try {
    const controller = new ConfigController();
    const { company } = req.session;
    if (company) {
      const response = await controller.getNotifyConfig(company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, "Bad request.", StatusCodes.BAD_REQUEST);
    }
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

router.patch("/notify", async (req, res) => {
  try {
    const controller = new ConfigController();
    const { company } = req.session;
    const data = req.body;
    if (company) {
      const response = await controller.updateNotifyConfig(data, company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, "Bad request.", StatusCodes.BAD_REQUEST);
    }
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

router.get("/prospect", async (req, res) => {
  try {
    const controller = new ConfigController();
    const { company } = req.session;
    if (company) {
      const response = await controller.getProspectConfig(company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, "Bad request.", StatusCodes.BAD_REQUEST);
    }
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

router.patch("/prospect", async (req, res) => {
  try {
    const controller = new ConfigController();
    const { company } = req.session;
    const data = req.body;
    if (company) {
      const response = await controller.updateProspectConfig(data, company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, "Bad request.", StatusCodes.BAD_REQUEST);
    }
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

export default router;
