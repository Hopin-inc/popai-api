import TaskService from "../services/task.service";
import { Get, Route, Controller } from "tsoa";

import { Container } from "typedi";

@Route("tasks")
export default class TaskController extends Controller {
  private taskService: TaskService;

  constructor() {
    super();
    this.taskService = Container.get(TaskService);
  }

  @Get("/update")
  public async syncTodoTask(): Promise<any> {
    console.log("TaskController#syncTodoTask - START");
    await this.taskService.syncTodoTasks();
    console.log("TaskController#syncTodoTask - END");
    return;
  }

  @Get("/remind")
  public async remindTaskForCompany(): Promise<any> {
    console.log("TaskController#remindTaskForCompany - START");
    await this.taskService.remindTaskForCompany();
    console.log("TaskController#remindTaskForCompany - END");

    return;
  }
}
