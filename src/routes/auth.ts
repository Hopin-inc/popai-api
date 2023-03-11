import express from "express";
import ApiResponse from "@/common/ApiResponse";
import AuthController from "@/controllers/AuthController";
import { StatusCodes } from "@/common/StatusCodes";
import { AccountInfo } from "@/types/auth";
import { authRequired } from "@/middleware/auth";

const router = express();

router.get("/", async (req, res) => {
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
        ApiResponse.errRes(res, "No matched account.", StatusCodes.UNAUTHORIZED);
      }
    } else {
      ApiResponse.errRes(res, "No logged-in session.", StatusCodes.UNAUTHORIZED);
    }
  } catch (err) {
    console.error(err);
    ApiResponse.errRes(res, err.message, err.status);
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
        console.log(req.session);
        const response: AccountInfo = { organization: company.name, name };
        ApiResponse.successRes(res, response);
      } else {
        ApiResponse.errRes(res, "No matched account.", StatusCodes.UNAUTHORIZED);
      }
    } else {
      ApiResponse.errRes(res, "Bad auth request.", StatusCodes.BAD_REQUEST);
    }
  } catch (err) {
    console.error(err);
    ApiResponse.errRes(res, err.message, err.status);
  }
});

router.get("/logout", authRequired, async (req, res) => {
  try {
    req.session.destroy(_err => ApiResponse.successRes(res, null));
  } catch (err) {
    console.error(err);
    ApiResponse.errRes(res, err.message, err.status);
  }
});

export default router;