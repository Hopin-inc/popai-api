import { Controller } from "tsoa";
import { Container } from "typedi";
import * as process from "process";

import TaskService from "@/services/TaskService";
import { getProcessTime } from "@/utils/common";
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
    console.log(`TaskController#syncTodos(notify = ${notify}) - START`);
    const start = process.hrtime();
    await this.taskService.syncTodos(null, notify);
    const end = process.hrtime(start);
    console.log(`TaskController#syncTodos(notify = ${notify}) - END - ${getProcessTime(end)}`);
    return;
  }

  public async remind(): Promise<any> {
    console.log("TaskController#remind - START");
    const start = process.hrtime();
    await this.taskService.remind();
    const end = process.hrtime(start);
    console.log(`TaskController#remind - END - ${getProcessTime(end)}`);
    return;
  }

  public async sendDailyReport(): Promise<any> {
    console.log("TaskController#sendDailyReport - START");
    const start = process.hrtime();
    await this.dailyReportService.sendDailyReport();
    const end = process.hrtime(start);
    console.log(`TaskController#sendDailyReport - END - ${getProcessTime(end)}`);
  }

  public async sendPerformanceReport(monthly: boolean = true): Promise<any> {
    console.log(`TaskController#sendPerformanceReport(monthly = ${monthly}) - START`);
    const start = process.hrtime();
    await this.performanceReportService.sendPerformanceReport(monthly);
    const end = process.hrtime(start);
    console.log(`TaskController#sendPerformanceReport(monthly = ${monthly}) - END - ${getProcessTime(end)}`);
  }

  public async askProspects(): Promise<any> {
    console.log("TaskController#askProspects - START");
    const start = process.hrtime();
    await this.prospectService.askProspects();
    const end = process.hrtime(start);
    console.log(`TaskController#askProspects - END - ${getProcessTime(end)}`);
  }
}
