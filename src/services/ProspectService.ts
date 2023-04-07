import { Container, Service } from "typedi";
import SlackRepository from "@/repositories/SlackRepository";
import LineRepository from "@/repositories/LineRepository";
import NotionRepository from "@/repositories/NotionRepository";
import { ChatToolId } from "@/consts/common";
import logger from "@/logger/winston";
import Company from "@/entities/settings/Company";
import { CompanyRepository } from "@/repositories/settings/CompanyRepository";
import { findMatchedTiming, includesDayOfToday, isHolidayToday, toJapanDateTime } from "@/utils/common";
import { PROSPECT_BATCH_INTERVAL } from "@/consts/scheduler";

@Service()
export default class ProspectService {
  private slackRepository: SlackRepository;
  private lineRepository: LineRepository;
  private notionRepository: NotionRepository;

  constructor() {
    this.slackRepository = Container.get(SlackRepository);
    this.lineRepository = Container.get(LineRepository);
    this.notionRepository = Container.get(NotionRepository);
  }

  public async askProspects(): Promise<any> {
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
          "prospectConfig.timings",
          "prospectConfig.chatTool",
        ],
      });
      await Promise.all(companies.map(async company => {
        const { prospectConfig, timing, timingExceptions } = company;
        if (prospectConfig && timing) {
          const { enabled, timings, chatTool } = prospectConfig;
          const matchedTiming = findMatchedTiming(timings, PROSPECT_BATCH_INTERVAL);
          const timingException = timingExceptions.find(e => e.date === toJapanDateTime(new Date()));
          if (
            enabled
            && matchedTiming
            && includesDayOfToday(timing.days_of_week)
            && (!timing.disabled_on_holidays_jp || !isHolidayToday())
            && (!timingException || (!timingException.excluded))
          ) {
            switch (chatTool.id) {
              case ChatToolId.SLACK:
                if (matchedTiming.ask_plan) {
                  await this.slackRepository.askPlans(company, matchedTiming.ask_plan_milestone);
                } else {
                  await this.slackRepository.askProspects(company);
                }
                break;
              case ChatToolId.LINE:
              default:
                break;
            }
          }
        }
      }));
    } catch (error) {
      logger.error(error.message);
    }
  }
}