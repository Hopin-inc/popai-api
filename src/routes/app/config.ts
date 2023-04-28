import express from "express";
import ApiResponse from "@/common/ApiResponse";
import { StatusCodes } from "@/common/StatusCodes";
import ConfigController from "@/controllers/app/ConfigController";
import { SessionErrors } from "@/consts/error-messages";
import logger from "@/libs/logger";

const router = express();

router.get("/", async (req, res) => {
  try {
    const controller = new ConfigController();
    const { company } = req.session;
    if (company) {
      const response = await controller.getCommonConfig(company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.patch("/", async (req, res) => {
  try {
    const controller = new ConfigController();
    const { company } = req.session;
    const data = req.body;
    if (company) {
      const response = await controller.updateCommonConfig(data, company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/features", async (req, res) => {
  try {
    const controller = new ConfigController();
    const { company } = req.session;
    if (company) {
      const response = await controller.getFeatures(company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
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
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
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
      ApiResponse.errRes(res, SessionErrors.InvalidAccount, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

export default router;
