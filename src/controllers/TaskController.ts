import { Controller } from "tsoa";
import { Container } from "typedi";

import TaskService from "@/services/TaskService";

export default class TaskController extends Controller {
  private taskService: TaskService;

  constructor() {
    super();
    this.taskService = Container.get(TaskService);
  }

  public async syncTodos(): Promise<any> {
    console.log("TaskController#syncTodos - START");
    await this.taskService.syncTodos();
    console.log("TaskController#syncTodos - END");
    return;
  }

  public async remind(): Promise<any> {
    console.log("TaskController#remind - START");
    await this.taskService.remind();
    console.log("TaskController#remind - END");
    return;
  }

  public async notifyOnUpdate(): Promise<any> {
    console.log("TaskController#notifyOnUpdate - START");
    await this.taskService.notifyOnUpdate();
    console.log("TaskController#notifyOnUpdate - END");
    return;
  }

  public async;
}
