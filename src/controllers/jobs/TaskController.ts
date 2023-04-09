import { Controller } from "tsoa";
import { Container } from "typedi";

import TaskService from "@/services/TaskService";
import DailyReportService from "@/services/DailyReportService";
import PerformanceReportService from "@/services/PerformanceReportService";
import ProspectService from "@/services/ProspectService";

export default class TaskController extends Controller {
  private taskService: TaskService;
  private prospectService: ProspectService;
  private dailyReportService: DailyReportService;
  private performanceReportService: PerformanceReportService;

  constructor() {
    super();
    this.taskService = Container.get(TaskService);
    this.prospectService = Container.get(ProspectService);
    this.dailyReportService = Container.get(DailyReportService);
    this.performanceReportService = Container.get(PerformanceReportService);
  }

  public async syncTodos(notify: boolean = false): Promise<any> {
    await this.taskService.syncTodos(null, notify);
  }

  public async remind(): Promise<any> {
    await this.taskService.remind();
  }

  public async sendDailyReport(): Promise<any> {
    await this.dailyReportService.sendDailyReport();
  }

  public async sendPerformanceReport(monthly: boolean = true): Promise<any> {
    await this.performanceReportService.sendPerformanceReport(monthly);
  }

  public async askProspects(): Promise<any> {
    await this.prospectService.askProspects();
  }
}
