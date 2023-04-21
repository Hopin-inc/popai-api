import express from "express";
import logger from "@/libs/logger";
import ApiResponse from "@/common/ApiResponse";
import AuthController from "@/controllers/app/AuthController";
import { StatusCodes } from "@/common/StatusCodes";
import { AccountInfo } from "@/types/auth";
import { authRequired } from "@/middleware/auth";
import { AccountErrors, SessionErrors } from "@/consts/error-messages";

const router = express();

router.get("/me", async (req, res) => {
  try {
    const { uid } = req.session;
    if (uid) {
      const controller = new AuthController();
      const account = await controller.fetchLoginState(uid);
      if (account) {
        const { company, name } = account;
        const response: AccountInfo = { organization: company.name, name };
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

router.post("/signup", async (req, res) => {
  try {
    const controller = new AuthController();
    const response = await controller.signUp(req.body);
    ApiResponse.successRes(res, response);
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/verify", async (req, res) => {
  try {
    const controller = new AuthController();
    const email = decodeURIComponent(req.query.email as string);
    await controller.verifyEmail(email);
    res.redirect(`${ process.env.CLIENT_BASE_URL }/login`);
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/login", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const controller = new AuthController();
      const account = await controller.login(authHeader);
      if (account) {
        const { uid, company, name } = account;
        req.session.uid = uid;
        req.session.company = company;
        const response: AccountInfo = { organization: company.name, name };
        ApiResponse.successRes(res, response);
      } else {
        ApiResponse.errRes(res, AccountErrors.NoMatchedAccount, StatusCodes.UNAUTHORIZED);
      }
    } else {
      ApiResponse.errRes(res, AccountErrors.InvalidAuthToken, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/logout", authRequired, async (req, res) => {
  try {
    req.session.destroy(() => ApiResponse.successRawRes(res));
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

export default router;
