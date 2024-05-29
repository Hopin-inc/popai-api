import { Controller } from "tsoa";
import { Container } from "typedi";

import TaskService from "@/services/TaskService";
import ProspectService from "@/services/ProspectService";
import RemindService from "@/services/RemindService";
import ReportService from "@/services/ReportService";

export default class SchedulerController extends Controller {
  private taskService: TaskService;
  private prospectService: ProspectService;
  private remindService: RemindService;
  private reportService: ReportService;

  constructor() {
    super();
    this.taskService = Container.get(TaskService);
    this.prospectService = Container.get(ProspectService);
    this.remindService = Container.get(RemindService);
    this.reportService = Container.get(ReportService);
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

  public async reportTodos(): Promise<void> {
    await this.reportService.report();
  }
}
