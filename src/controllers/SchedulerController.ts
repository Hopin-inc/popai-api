import { Controller } from "tsoa";
import { Container } from "typedi";

import TaskService from "@/services/TaskService";
import ProspectService from "@/services/ProspectService";
import RemindService from "@/services/RemindService";

export default class SchedulerController extends Controller {
  private taskService: TaskService;
  private prospectService: ProspectService;
  private remindService: RemindService;

  constructor() {
    super();
    this.taskService = Container.get(TaskService);
    this.prospectService = Container.get(ProspectService);
    this.remindService = Container.get(RemindService);
  }

  public async syncTodos(): Promise<any> {
    await this.taskService.syncTodos(null);
  }

  public async askProspects(): Promise<any> {
    await this.prospectService.ask();
  }

  public async remindTodos(): Promise<any> {
    await this.remindService.send();
  }
}
