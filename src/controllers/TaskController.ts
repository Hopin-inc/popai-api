import { Controller } from "tsoa";
import { Container } from "typedi";
import * as process from "process";

import TaskService from "@/services/TaskService";
import { getProcessTime } from "@/utils/common";

export default class TaskController extends Controller {
  private taskService: TaskService;

  constructor() {
    super();
    this.taskService = Container.get(TaskService);
  }

  public async syncTodos(notify: boolean = false): Promise<any> {
    console.log(`TaskController#syncTodos(notify = ${ notify }) - START`);
    const start = process.hrtime();
    await this.taskService.syncTodos(null, notify);
    const end = process.hrtime(start);
    console.log(`TaskController#syncTodos(notify = ${ notify }) - END - ${ getProcessTime(end) }`);
    return;
  }

  public async remind(): Promise<any> {
    console.log("TaskController#remind - START");
    const start = process.hrtime();
    await this.taskService.remind();
    const end = process.hrtime(start);
    console.log(`TaskController#remind - END - ${ getProcessTime(end) }`);
    return;
  }
}
