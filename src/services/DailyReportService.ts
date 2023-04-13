import { Container, Service } from "typedi";

import SlackRepository from "@/repositories/SlackRepository";
import LineRepository from "@/repositories/LineRepository";

import Company from "@/entities/settings/Company";
import { ChatToolCode, DocumentToolCode } from "@/consts/common";
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
import { findMatchedTiming, includesDayOfToday, isHolidayToday, toJapanDateTime } from "@/utils/common";
import { PROSPECT_BATCH_INTERVAL } from "@/consts/scheduler";

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
      const companies: Company[] = await CompanyRepository.find({
        relations: [
          "sections",
          "users.chattoolUsers.chattool",
          "users.todoAppUsers.todoApp",
          "users.documentToolUsers.documentTool",
          "implementedTodoApps",
          "implementedChatTools.chattool",
          "adminUser.chattoolUsers.chattool",
          "companyConditions",
          "timing",
          "timingExceptions",
          "dailyReportConfig.timings",
          "dailyReportConfig.chatTool",
        ],
      });
      await Promise.all(companies.map(async company => {
        const { dailyReportConfig, timing, timingExceptions } = company;
        if (dailyReportConfig && timing) {
          const { enabled, timings, chatTool, channel } = dailyReportConfig;
          const matchedTiming = findMatchedTiming(timings, PROSPECT_BATCH_INTERVAL);
          const timingException = timingExceptions.find(e => e.date === toJapanDateTime(new Date()));
          if (
            enabled
            && matchedTiming
            && includesDayOfToday(timing.days_of_week)
            && (!timing.disabled_on_holidays_jp || !isHolidayToday())
            && (!timingException || (!timingException.excluded))
          ) {
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
        }
      }));
    } catch (error) {
      logger.error(error);
    }
  }

  private async sendDailyReportByChannel(company: Company, chatTool: ChatTool, channelId: string, notionClient: NotionService) {
    try {
      const [dailyReportTodos, notUpdatedTodos]: [IDailyReportItems, Todo[]] = await Promise.all([
        this.getDailyReportItems(company, notionClient),
        TodoRepository.getNotUpdatedTodos(company),
      ]);

      const usersByDocApp = company.users.filter(u => u.documentTools.some(t => t.tool_code === DocumentToolCode.NOTION));
      const response = await this.notionRepository.postDailyReportByUser(
        dailyReportTodos, company, company.sections, usersByDocApp, notionClient);

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
    switch (chatTool.tool_code) {
      case ChatToolCode.SLACK:
        await Promise.all(users.map(user => {
          return this.slackRepository.reportByUser(dailyReportTodos, company, sections, user, chatTool, channel, null, response);
        }));
        await this.slackRepository.suggestNotUpdatedTodo(notUpdatedTodos, company, sections, users, channel);
        break;
      case ChatToolCode.LINE:
        await this.lineRepository.reportByCompany(dailyReportTodos, company, sections, users, chatTool, channel, response);
        break;
      default:
        break;
    }
  }
}

