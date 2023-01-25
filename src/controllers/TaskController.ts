import { Controller } from "tsoa";
import { Container } from "typedi";

import TaskService from "@/services/TaskService";

export default class TaskController extends Controller {
  private taskService: TaskService;

  constructor() {
    super();
    this.taskService = Container.get(TaskService);
  }

  public async syncTodoTask(): Promise<any> {
    console.log("TaskController#syncTodoTask - START");
    await this.taskService.syncTodoTasks();
    console.log("TaskController#syncTodoTask - END");
    return;
  }

  public async remindTaskForCompany(): Promise<any> {
    console.log("TaskController#remindTaskForCompany - START");
    await this.taskService.remindTaskForCompany();
    console.log("TaskController#remindTaskForCompany - END");

    return;
  }
}
