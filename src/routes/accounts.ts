import express from "express";
import ApiResponse from "@/common/ApiResponse";
import AccountController from "@/controllers/AccountController";

const router = express();

router.post("/", async (req, res) => {
  try {
    const controller = new AccountController();
    await controller.signUp(req.body);
    ApiResponse.successRawRes(res);
  } catch (err) {
    console.error(err);
    ApiResponse.errRes(res, err.message, err.status);
  }
});

export default router;