import express from "express";
import ApiResponse from "@/common/ApiResponse";
import { StatusCodes } from "@/common/StatusCodes";
import UserController from "@/controllers/app/UserController";

const router = express();

router.get("/", async (req, res) => {
  try {
    const chatToolId = parseInt(req.query.chatToolId as string);
    const todoAppId = parseInt(req.query.todoAppId as string);
    const controller = new UserController();
    const { company } = req.session;
    if (company) {
      const response = await controller.getList(company.id, chatToolId, todoAppId);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, "Bad request.", StatusCodes.BAD_REQUEST);
    }
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

export default router;
