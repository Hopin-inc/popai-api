import {
  Between,
  FindOptionsWhere,
  Repository,
} from "typeorm";
import { Service } from "typedi";
import dayjs from "dayjs";

import ImplementedTodoApp from "@/entities/settings/ImplementedTodoApp";
import Company from "@/entities/settings/Company";
import Section from "@/entities/settings/Section";
import User from "@/entities/settings/User";
import CompanyCondition from "@/entities/settings/CompanyCondition";
import PropertyOption from "@/entities/settings/PropertyOption";

import AppDataSource from "@/config/data-source";
import logger from "@/logger/winston";
import { LoggerError } from "@/exceptions";
import { IDailyReportItems, valueOf } from "@/types";
import {
  TodoHistoryProperty as Property,
  TodoHistoryAction as Action,
  NOT_UPDATED_DAYS,
  EventType, TodoAppCode,
} from "@/consts/common";
import EventTiming from "@/entities/settings/EventTiming";
import { roundMinutes, toJapanDateTime } from "@/utils/common";
import DailyReport from "@/entities/transactions/DailyReport";
import { GetPageResponse, PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { Client } from "@notionhq/client";
import DailyReportConfig from "@/entities/settings/DailyReportConfig";
import BoardProperty from "@/entities/settings/BoardProperty";
import OptionCandidate from "@/entities/settings/OptionCandidate";
import { TodoRepository } from "@/repositories/TodoRepository";

@Service()
export default class CommonRepository {
  private boardPropertyRepository: Repository<BoardProperty>;
  private optionCandidateRepository: Repository<OptionCandidate>;
  private propertyOptionRepository: Repository<PropertyOption>;
  private dailyReportConfigRepository: Repository<DailyReportConfig>;
  private notionRequest: Client;

  constructor() {
    this.boardPropertyRepository = AppDataSource.getRepository(BoardProperty);
    this.optionCandidateRepository = AppDataSource.getRepository(OptionCandidate);
    this.propertyOptionRepository = AppDataSource.getRepository(PropertyOption);
    this.dailyReportConfigRepository = AppDataSource.getRepository(DailyReportConfig);
    this.notionRequest = new Client({ auth: process.env.NOTION_ACCESS_TOKEN });
  }

  public async getDayReminds(companyConditions: CompanyCondition[]): Promise<number[]> {
    return companyConditions
      .map((s) => s.remind_before_days)
      .filter(Number.isFinite);
  }

  public async saveProperty(id: string, name: string, type: number, sectionId: number) {
    const propertyExists = await this.boardPropertyRepository.findOne({
      where: {
        section_id: sectionId,
        property_id: id,
      },
    });
    if (!propertyExists) {
      const property = new BoardProperty(sectionId, id, type, name);
      await this.boardPropertyRepository.save(property);
    }
  }

  public async saveOptionCandidate(
    propertyId: number,
    optionId: string,
    sectionId: number,
    name?: string,
  ) {
      const optionCandidateExit = await this.optionCandidateRepository.findOne({
        relations: ["boardProperty"],
        where: {
          property_id: propertyId,
          boardProperty: { section_id: sectionId },
        },
      });

      if (!optionCandidateExit) {
        const optionCandidate = new OptionCandidate(propertyId, optionId, name);
        await this.optionCandidateRepository.save(optionCandidate);
      }

      await this.savePropertyOption(propertyId, optionId);
  }

  public async savePropertyOption(propertyId: number, optionId?: string) {
    const optionRecord = optionId
      ? await this.optionCandidateRepository.findOneBy({ property_id: propertyId, option_id: optionId })
      : await this.optionCandidateRepository.findOneBy({ property_id: propertyId });

    const propertyOptionExit = await this.propertyOptionRepository.findOneBy({
      property_id: propertyId,
      option_id: optionRecord?.id,
    });

    if (!propertyOptionExit) {
      const propertyOption = new PropertyOption(propertyId, optionRecord?.id);
      await this.propertyOptionRepository.save(propertyOption);
    }
  }
}
