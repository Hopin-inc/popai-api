import express from "express";
import ApiResponse from "@/common/ApiResponse";
import AccountController from "@/controllers/app/AccountController";

const router = express();

router.post("/", async (req, res) => {
  try {
    const controller = new AccountController();
    await controller.signUp(req.body);
    ApiResponse.successRawRes(res);
  } catch (error) {
    ApiResponse.errRes(res, error.message, error.status);
  }
});

export default router;
