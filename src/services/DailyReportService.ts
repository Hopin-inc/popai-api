import { Container, Service } from "typedi";

import SlackRepository from "@/repositories/SlackRepository";
import LineRepository from "@/repositories/LineRepository";
import LineMessageQueueRepository from "@/repositories/modules/LineMessageQueueRepository";

import Company from "@/entities/settings/Company";
import { ChatToolCode, DocumentToolCode } from "@/consts/common";
import logger from "@/logger/winston";
import { InternalServerErrorException, LoggerError } from "@/exceptions";
import { Repository } from "typeorm";
import AppDataSource from "@/config/data-source";
import Section from "@/entities/settings/Section";
import { IDailyReportItems } from "@/types";
import Todo from "@/entities/transactions/Todo";
import User from "@/entities/settings/User";
import ChatTool from "@/entities/masters/ChatTool";
import DailyReportConfig from "@/entities/settings/DailyReportConfig";
import CommonRepository from "@/repositories/modules/CommonRepository";
import NotionRepository from "@/repositories/NotionRepository";
import { INotionDailyReport } from "@/types/notion";

@Service()
export default class DailyReportService {
  private slackRepository: SlackRepository;
  private lineRepository: LineRepository;
  private lineQueueRepository: LineMessageQueueRepository;
  private commonRepository: CommonRepository;
  private notionRepository: NotionRepository;
  private dailyReportConfigRepository: Repository<DailyReportConfig>;
  private companyRepository: Repository<Company>;

  constructor() {
    this.slackRepository = Container.get(SlackRepository);
    this.lineRepository = Container.get(LineRepository);
    this.lineQueueRepository = Container.get(LineMessageQueueRepository);
    this.commonRepository = Container.get(CommonRepository);
    this.notionRepository = Container.get(NotionRepository);
    this.dailyReportConfigRepository = AppDataSource.getRepository(DailyReportConfig);
    this.companyRepository = AppDataSource.getRepository(Company);
  }

  public async sendDailyReport(): Promise<any> {
    try {
      await this.lineQueueRepository.updateStatusOfOldQueueTask();
      const companies = await this.companyRepository.find({
        relations: [
          "sections",
          "users.chattoolUsers.chattool",
          "users.todoAppUsers.todoApp",
          "users.documentToolUsers.documentTool",
          "implementedTodoApps",
          "implementedChatTools.chattool",
          "adminUser.chattoolUsers.chattool",
          "companyConditions",
          "dailyReportConfig",
          "dailyReportConfig.chat_tool",
        ],
      });
      const sendOperations = async (company: Company) => {
        await this.sendDailyReportByChannel(company, company.dailyReportConfig.chat_tool, company.dailyReportConfig.channel);
      };
      await Promise.all(companies.map(company => sendOperations(company)));
    } catch (error) {
      logger.error(new LoggerError(error.message));
      throw new InternalServerErrorException(error.message);
    }
  }

  private async sendDailyReportByChannel(company: Company, chatTool: ChatTool, channelId: string) {
    try {
      const channelSectionsMap: Map<string, Section[]> = new Map();
      company.sections.forEach(section => {
        if (channelSectionsMap.has(channelId)) {
          channelSectionsMap.get(channelId).push(section);
        } else {
          channelSectionsMap.set(channelId, [section]);
        }
      });
      const [dailyReportTodos, notUpdatedTodos] = await Promise.all([
        this.commonRepository.getDailyReportItems(company),
        this.commonRepository.getNotUpdatedTodos(company),
      ]);

      const usersByDocApp = company.users.filter(u => u.documentTools.some(t => t.tool_code === DocumentToolCode.NOTION));
      const response = await this.notionRepository.postDailyReportByUser(dailyReportTodos, company.sections, usersByDocApp);

      const usersByChatTool = company.users.filter(u => u.chatTools.some(c => c.tool_code === chatTool.tool_code));
      const sendOperations: ReturnType<typeof this.sendDailyReportForChannel>[] = [];
      channelSectionsMap.forEach((sections, channel) => {
        sendOperations.push(this.sendDailyReportForChannel(
          dailyReportTodos,
          notUpdatedTodos,
          company,
          sections,
          usersByChatTool,
          chatTool,
          channel,
          response,
        ));
      });
      await Promise.all(sendOperations);
    } catch (error) {
      console.error(error);
      logger.error(new LoggerError(error.message));
    }
  }

  private async sendDailyReportForChannel(
    dailyReportTodos: IDailyReportItems,
    notUpdatedTodos: Todo[],
    company: Company,
    sections: Section[],
    users: User[],
    chatTool: ChatTool,
    channel: string,
    response: INotionDailyReport[],
  ) {
    switch (chatTool.tool_code) {
      case ChatToolCode.SLACK:
        await Promise.all(users.map(user => this.slackRepository.reportByUser(dailyReportTodos, company, sections, user, chatTool, channel, null, response)));
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

