import { Container, Service } from "typedi";

import SlackRepository from "@/repositories/SlackRepository";
import LineRepository from "@/repositories/LineRepository";
import LineMessageQueueRepository from "@/repositories/modules/LineMessageQueueRepository";

import Company from "@/entities/settings/Company";
import { ChatToolCode } from "@/consts/common";
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

@Service()
export default class DailyReportService {
  private slackRepository: SlackRepository;
  private lineRepository: LineRepository;
  private lineQueueRepository: LineMessageQueueRepository;
  private commonRepository: CommonRepository;

  private dailyReportConfigRepository: Repository<DailyReportConfig>;
  private companyRepository: Repository<Company>;

  constructor() {
    this.slackRepository = Container.get(SlackRepository);
    this.lineRepository = Container.get(LineRepository);
    this.lineQueueRepository = Container.get(LineMessageQueueRepository);
    this.commonRepository = Container.get(CommonRepository);
    this.companyRepository = AppDataSource.getRepository(Company);
    this.dailyReportConfigRepository = AppDataSource.getRepository(DailyReportConfig);
  }

  public async sendDailyReport(): Promise<any> {
    try {
      await this.lineQueueRepository.updateStatusOfOldQueueTask();
      const companies = await this.companyRepository.find({
        relations: [
          "users.chattoolUsers.chattool",
          "sections",
          "implementedChatTools.chattool",
          "adminUser.chattoolUsers.chattool",
          "companyConditions",
          "dailyReportConfig",
          "dailyReportConfig.chat_tool"
        ],
      });
      const sendOperations = async (company: Company) => {
        await this.sendDailyReportByChatTool(company, company.dailyReportConfig.chat_tool, company.dailyReportConfig.channel);
      };
      await Promise.all(companies.map(company => sendOperations(company)));
    } catch (error) {
      logger.error(new LoggerError(error.message));
      throw new InternalServerErrorException(error.message);
    }
  }

  private async sendDailyReportByChatTool(company: Company, chatTool: ChatTool, channelId: string) {
    try {
      const channelSectionsMap: Map<string, Section[]> = new Map();
      company.sections.forEach(section => {
        if (channelSectionsMap.has(channelId)) {
          channelSectionsMap.get(channelId).push(section);
        } else {
          channelSectionsMap.set(channelId, [section]);
        }
      });
      const users = company.users.filter(u => u.chatTools.some(c => c.tool_code === chatTool.tool_code));
      const [dailyReportTodos, notUpdatedTodos] = await Promise.all([
        this.commonRepository.getDailyReportItems(company),
        this.commonRepository.getNotUpdatedTodos(company),
      ]);

      const operations: ReturnType<typeof this.sendDailyReportForChannel>[] = [];
      channelSectionsMap.forEach((sections, channel) => {
        operations.push(this.sendDailyReportForChannel(
          dailyReportTodos,
          notUpdatedTodos,
          company,
          sections,
          users,
          chatTool,
          channel,
        ));
      });
      await Promise.all(operations);
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
  ) {
    switch (chatTool.tool_code) {
      case ChatToolCode.SLACK:
        await Promise.all(users.map(user => this.slackRepository.reportByUser(dailyReportTodos, company, sections, user, chatTool, channel)));
        await this.slackRepository.suggestNotUpdatedTodo(notUpdatedTodos, company, sections, users, channel);
        break;
      case ChatToolCode.LINE:
        await this.lineRepository.reportByUser(dailyReportTodos, company, sections, users, chatTool, channel);
        break;
      default:
        break;
    }
  }
}

