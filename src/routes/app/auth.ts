import express from "express";
import logger from "@/libs/logger";
import ApiResponse from "@/common/ApiResponse";
import AuthController from "@/controllers/app/AuthController";
import { StatusCodes } from "@/common/StatusCodes";
import { AccountInfo } from "@/types/auth";
import { authRequired } from "@/middleware/auth";
import { AccountErrors, SessionErrors } from "@/consts/error-messages";
import Company from "@/entities/settings/Company";
import { CompanyRepository } from "@/repositories/settings/CompanyRepository";
import { ChatToolId } from "@/consts/common";
import ImplementedChatTool from "@/entities/settings/ImplementedChatTool";
import { ImplementedChatToolRepository } from "@/repositories/settings/ImplementedChatToolRepository";

const router = express();

router.get("/me", async (req, res) => {
  try {
    const { uid } = req.session;
    if (uid) {
      const controller = new AuthController();
      const company = await controller.fetchLoginState(uid);
      if (company) {
        const { name, implementedChatTool } = company;
        const isRegistered = implementedChatTool?.accessToken ? true : false;
        const response: AccountInfo = {
          name,
          isRegistered,
        };
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
    const uid = req.session?.uid;
    if (uid) {
      const company = await controller.signUp(uid, req.body);
      if (company) {
        req.session.company = company;
        req.session.registered = true;
      }
      ApiResponse.successRes(res, req.session);
    } else {
      ApiResponse.errRes(res, SessionErrors.NotLoggedIn, StatusCodes.UNAUTHORIZED);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.post("/signup/email", async (req, res) => {
  try {
    const controller = new AuthController();
    await controller.signUpWithEmail(req.body);
    ApiResponse.successRes(res, null);
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
      const [company, idToken] = await controller.login(authHeader);
      const { uid } = idToken;
      const providerId = idToken.firebase.sign_in_provider;
      const appInstallUserId = idToken.firebase.identities[providerId];
      if (company) {
        const { name, implementedChatTool } = company;
        const isRegistered = !!implementedChatTool.accessToken;
        req.session.uid = uid;
        req.session.company = company;
        req.session.registered = isRegistered;
        const response: AccountInfo = {
          name,
          isRegistered,
        };
        ApiResponse.successRes(res, response);
      } else if (uid) {
        const company = await CompanyRepository.save(new Company(uid));
        req.session.uid = uid;
        req.session.company = company;
        req.session.registered = false;
        const chatToolId = providerId === "oidc.slack" ? ChatToolId.SLACK : null;
        if (chatToolId) {
          await ImplementedChatToolRepository.save(
            new ImplementedChatTool(company, chatToolId, null, appInstallUserId),
          );
        }
        ApiResponse.successRes(res, null);
      }
    } else {
      ApiResponse.errRes(res, AccountErrors.InvalidAuthToken, StatusCodes.BAD_REQUEST);
    }
  } catch (error) {
    logger.error(error.message, error);
    ApiResponse.errRes(res, error.message, error.status);
  }
});

router.get("/login/email", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const controller = new AuthController();
      const [company, idToken] = await controller.loginWithEmail(authHeader);
      const { uid } = idToken;
      if (company && uid) {
        const { name } = company;
        const isRegistered = true; // TODO
        req.session.uid = uid;
        req.session.company = company;
        req.session.registered = isRegistered;
        const response: AccountInfo = {
          name,
          isRegistered,
        };
        ApiResponse.successRes(res, response);
      } else {
        ApiResponse.errRes(res, AccountErrors.NoMatchedAccount, StatusCodes.BAD_REQUEST);
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
