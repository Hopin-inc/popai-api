import express from "express";
import ApiResponse from "@/common/ApiResponse";
import logger from "@/libs/logger";
import LineWorksController from "@/controllers/integrations/LineWorksController";
import { AccountErrors, SessionErrors } from "@/consts/error-messages";
import { StatusCodes } from "@/common/StatusCodes";
import AuthController from "@/controllers/app/AuthController";

const router = express();

router.post("/install", async (req, res) => {
  try {
    const { uid } = req.session;
    if (uid) {
      const controller = new AuthController();
      const company = await controller.fetchLoginState(uid);
      if (company) {
        const controller = new LineWorksController();
        const response = await controller.handleInstall(req, company);
        ApiResponse.successRes(res, response);
      } else {
        ApiResponse.errRes(res, AccountErrors.NoMatchedAccount, StatusCodes.UNAUTHORIZED);
      }
    } else {
      ApiResponse.errRes(res, SessionErrors.NotLoggedIn, StatusCodes.UNAUTHORIZED);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.patch("/install", async (req, res) => {
  try {
    const { uid } = req.session;
    if (uid) {
      const controller = new AuthController();
      const company = await controller.fetchLoginState(uid);
      if (company) {
        const controller = new LineWorksController();
        const response = await controller.updateInstall(req, company);
        ApiResponse.successRes(res, response);
      } else {
        ApiResponse.errRes(res, AccountErrors.NoMatchedAccount, StatusCodes.UNAUTHORIZED);
      }
    } else {
      ApiResponse.errRes(res, SessionErrors.NotLoggedIn, StatusCodes.UNAUTHORIZED);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

export default router;
