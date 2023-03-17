import express from "express";
import ApiResponse from "@/common/ApiResponse";
import { StatusCodes } from "@/common/StatusCodes";
import TodoAppController from "@/controllers/app/TodoAppController";

const router = express();

router.get("/", async (req, res) => {
  try {
    const controller = new TodoAppController();
    const { company } = req.session;
    if (company) {
      const response = await controller.getList(company);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, "Bad request.", StatusCodes.BAD_REQUEST);
    }
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

router.get("/:todoAppId/accounts", async (req, res) => {
  try {
    const todoAppId: number = parseInt(req.params.todoAppId);
    const controller = new TodoAppController();
    const { company } = req.session;
    if (company) {
      const response = await controller.getUsers(todoAppId, company.id);
      ApiResponse.successRes(res, response);
    } else {
      ApiResponse.errRes(res, "Bad request.", StatusCodes.BAD_REQUEST);
    }
  } catch (err) {
    ApiResponse.errRes(res, err.message, err.status);
  }
});

export default router;
