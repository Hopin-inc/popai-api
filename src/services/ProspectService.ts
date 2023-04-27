import { Container, Service } from "typedi";
import SlackRepository from "@/repositories/SlackRepository";
import NotionRepository from "@/repositories/NotionRepository";
import { ChatToolId } from "@/consts/common";
import logger from "@/libs/logger";
import Company from "@/entities/settings/Company";
import { CompanyRepository } from "@/repositories/settings/CompanyRepository";
import { findMatchedTiming } from "@/utils/misc";
import { includesDayOfToday, isHolidayToday, toJapanDateTime } from "@/utils/datetime";
import { PROSPECT_BATCH_INTERVAL } from "@/consts/scheduler";

@Service()
export default class ProspectService {
  private slackRepository: SlackRepository;
  private notionRepository: NotionRepository;

  constructor() {
    this.slackRepository = Container.get(SlackRepository);
    this.notionRepository = Container.get(NotionRepository);
  }

  public async ask(): Promise<any> {
    try {
      const companies = await this.getTargetCompanies();
      await Promise.all(companies.map(async company => {
        if (company.prospectConfig) {
          const { chatToolId: chatToolId, timings } = company.prospectConfig;
          const matchedTiming = findMatchedTiming(timings, PROSPECT_BATCH_INTERVAL);
          const logMeta = {
            company: company.id,
            chatTool: chatToolId,
            askPlan: matchedTiming.askPlan,
          };
          logger.info(`Start: askProspects { company: ${ company.id }, section: ALL }`, logMeta);
          switch (chatToolId) {
            case ChatToolId.SLACK:
              if (matchedTiming.askPlan) {
                await this.slackRepository.askPlans(company, matchedTiming.askPlanMilestone);
              } else {
                await this.slackRepository.askProspects(company);
              }
              break;
            default:
              break;
          }
          logger.info(`Finish: askProspects { company: ${ company.id }, section: ALL }`, logMeta);
        }
      }));
    } catch (error) {
      logger.error(error);
    }
  }

  private async getTargetCompanies(): Promise<Company[]> {
    const companies: Company[] = await CompanyRepository.find({
      relations: [
        "users.chatToolUser",
        "users.todoAppUser",
        "implementedTodoApp",
        "implementedChatTool",
        "timing",
        "timingExceptions",
        "prospectConfig.timings",
      ],
    });
    return companies.filter(company => {
      const { prospectConfig, timing, timingExceptions } = company;
      if (prospectConfig && timing) {
        const { enabled, timings } = prospectConfig;
        const matchedTiming = findMatchedTiming(timings, PROSPECT_BATCH_INTERVAL);
        const timingException = timingExceptions.find(e => e.date === toJapanDateTime(new Date()));
        return (
          enabled
          && matchedTiming
          && includesDayOfToday(timing.daysOfWeek)
          && (!timing.disabledOnHolidaysJp || !isHolidayToday())
          && (!timingException || (!timingException.excluded))
        );
      }
    });
  }
}
