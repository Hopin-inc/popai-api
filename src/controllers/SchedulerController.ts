import { Controller } from "tsoa";
import { Container } from "typedi";

import TaskService from "@/services/TaskService";
import ProspectService from "@/services/ProspectService";

export default class SchedulerController extends Controller {
  private taskService: TaskService;
  private prospectService: ProspectService;

  constructor() {
    super();
    this.taskService = Container.get(TaskService);
    this.prospectService = Container.get(ProspectService);
  }

  public async syncTodos(): Promise<any> {
    await this.taskService.syncTodos(null);
  }

  public async askProspects(): Promise<any> {
    await this.prospectService.ask();
  }
}
