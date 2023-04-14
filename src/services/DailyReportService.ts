import { Container, Service } from "typedi";

import SlackRepository from "@/repositories/SlackRepository";
import LineRepository from "@/repositories/LineRepository";

import Company from "@/entities/settings/Company";
import { ChatToolId, TodoAppId } from "@/consts/common";
import logger from "@/logger/winston";
import Section from "@/entities/settings/Section";
import { IDailyReportItems } from "@/types";
import Todo from "@/entities/transactions/Todo";
import User from "@/entities/settings/User";
import ChatTool from "@/entities/masters/ChatTool";
import NotionRepository from "@/repositories/NotionRepository";
import { INotionDailyReport } from "@/types/notion";
import { TodoRepository } from "@/repositories/transactions/TodoRepository";
import { CompanyRepository } from "@/repositories/settings/CompanyRepository";
import NotionService from "@/services/NotionService";
import { findMatchedTiming, includesDayOfToday, isHolidayToday, runInParallel, toJapanDateTime } from "@/utils/common";
import { PROSPECT_BATCH_INTERVAL } from "@/consts/scheduler";
import { DailyReportServiceParallels } from "@/consts/parallels";

@Service()
export default class DailyReportService {
  private slackRepository: SlackRepository;
  private lineRepository: LineRepository;
  private notionRepository: NotionRepository;

  constructor() {
    this.slackRepository = Container.get(SlackRepository);
    this.lineRepository = Container.get(LineRepository);
    this.notionRepository = Container.get(NotionRepository);
  }

  public async sendDailyReport(): Promise<any> {
    try {
      const companies = await this.getTargetCompanies();
      await Promise.all(companies.map(async company => {
        if (company.dailyReportConfig) {
          const { chatTool, channel } = company.dailyReportConfig;
          const notionClient = await NotionService.init(company.id);
          if (notionClient) {
            const logMeta = {
              company: company.name,
              chatTool: chatTool.name,
              todoApp: "Notion",  // TODO: Switch by implementedTodoApps
            };
            logger.info(`Start: sendDailyReport { company: ${ company.id }, section: ALL }`, logMeta);
            await this.sendDailyReportByChannel(company, chatTool, channel, notionClient);
            logger.info(`Finish: sendDailyReport { company: ${ company.id }, section: ALL }`, logMeta);
          }
        }
      }));
    } catch (error) {
      logger.error(error);
    }
  }

  private async getTargetCompanies(): Promise<Company[]> {
    const companies: Company[] = await CompanyRepository.find({
      relations: [
        "sections",
        "users.chattoolUsers.chattool",
        "users.todoAppUsers.todoApp",
        "users.documentToolUsers.documentTool",
        "implementedTodoApps",
        "implementedChatTools.chattool",
        "timing",
        "timingExceptions",
        "dailyReportConfig.timings",
        "dailyReportConfig.chatTool",
      ],
    });
    const filteredCompanies = await runInParallel(
      companies,
      async (company) => {
        const { dailyReportConfig, timing, timingExceptions } = company;
        if (dailyReportConfig && timing) {
          const { enabled, timings } = dailyReportConfig;
          const matchedTiming = findMatchedTiming(timings, PROSPECT_BATCH_INTERVAL);
          const timingException = timingExceptions.find(e => e.date === toJapanDateTime(new Date()));
          if (
            enabled
            && matchedTiming
            && includesDayOfToday(timing.days_of_week)
            && (!timing.disabled_on_holidays_jp || !isHolidayToday())
            && (!timingException || (!timingException.excluded))
          ) {
            return company;
          }
        }
      },
      DailyReportServiceParallels.GET_TARGET_COMPANIES,
    );
    return filteredCompanies.filter(company => company !== undefined);
  }

  private async sendDailyReportByChannel(
    company: Company,
    chatTool: ChatTool,
    channelId: string,
    notionClient: NotionService,
  ) {
    try {
      const [dailyReportTodos, notUpdatedTodos]: [IDailyReportItems, Todo[]] = await Promise.all([
        this.getDailyReportItems(company, notionClient),
        TodoRepository.getNotUpdatedTodos(company),
      ]);
      // const usersByDocApp = company.users.filter(u => { // FIXME: implementedTodoApps にNotionを連携していない場合に対応させる
      //   return u.documentTools.some(t => t.id === DocumentToolId.NOTION);
      // });
      const usersByDocApp = company.users.filter(u => {
        return u.todoApps.some(t => t.id === TodoAppId.NOTION);
      });
      const response = await this.notionRepository.postDailyReportByUser(
        dailyReportTodos,
        company,
        null,
        usersByDocApp,
        notionClient,
      );
      const usersByChatTool = company.users.filter(u => u.chatTools.some(c => c.tool_code === chatTool.tool_code));
      await this.sendDailyReportForChannel(
        dailyReportTodos,
        notUpdatedTodos,
        company,
        null,
        usersByChatTool,
        chatTool,
        channelId,
        response,
      );
    } catch (error) {
      logger.error(error);
    }
  }

  private async getDailyReportItems(company: Company, notionClient: NotionService): Promise<IDailyReportItems> {
    const [completedYesterday, delayed, ongoing] = await Promise.all([
      TodoRepository.getTodosCompletedYesterday(company),
      TodoRepository.getTodosDelayed(company, notionClient),
      TodoRepository.getTodosOngoing(company, notionClient),
    ]);
    return { completedYesterday, delayed, ongoing };
  }

  private async sendDailyReportForChannel(
    dailyReportTodos: IDailyReportItems,
    notUpdatedTodos: Todo[],
    company: Company,
    sections: Section[] | null,
    users: User[],
    chatTool: ChatTool,
    channel: string,
    response: INotionDailyReport[],
  ) {
    switch (chatTool.id) {
      case ChatToolId.SLACK:
        await Promise.all(users.map(user => {
          return this.slackRepository.reportByUser(dailyReportTodos, company, sections, user, chatTool, channel, null, response);
        }));
        await this.slackRepository.suggestNotUpdatedTodo(notUpdatedTodos, company, sections, users, channel);
        break;
      case ChatToolId.LINE:
        await this.lineRepository.reportByCompany(dailyReportTodos, company, sections, users, chatTool, channel, response);
        break;
      default:
        break;
    }
  }
}

