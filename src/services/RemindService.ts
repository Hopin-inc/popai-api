import { Container, Service } from "typedi";
import SlackRepository from "@/repositories/SlackRepository";
import NotionRepository from "@/repositories/NotionRepository";
import { AskType, ChatToolId } from "@/consts/common";
import logger from "@/libs/logger";
import Company from "@/entities/settings/Company";
import { CompanyRepository } from "@/repositories/settings/CompanyRepository";
import { findMatchedTiming } from "@/utils/misc";
import { includesDayOfToday, isHolidayToday, toJapanDateTime } from "@/utils/datetime";
import { PROSPECT_BATCH_INTERVAL } from "@/consts/scheduler";
import { ProspectConfigViewRepository } from "@/repositories/views/ProspectConfigViewRepository";
import { UserConfigViewRepository } from "@/repositories/views/UserConfigViewRepository";

@Service()
export default class RemindService {
  private slackRepository: SlackRepository;
  private notionRepository: NotionRepository;

  constructor() {
    this.slackRepository = Container.get(SlackRepository);
    this.notionRepository = Container.get(NotionRepository);
  }

  public async send(): Promise<any> {
  }
}