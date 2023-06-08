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
export default class ProspectService {
  private slackRepository: SlackRepository;
  private notionRepository: NotionRepository;

  constructor() {
    this.slackRepository = Container.get(SlackRepository);
    this.notionRepository = Container.get(NotionRepository);
  }

  public async ask(): Promise<any> {
    try {
      const [companies, prospectConfigViews] = await Promise.all([
        this.getTargetCompanies(),
        ProspectConfigViewRepository.find(),
      ]);
      await Promise.all(companies.map(async company => {
        await Promise.all(company.prospectConfigs?.map(async prospectConfig => {
          const prospectConfigView = prospectConfigViews.find(pc => pc.configId === prospectConfig.id);
          if (prospectConfigView?.enabled && !prospectConfigView?.isValid) return;

          const { chatToolId: chatToolId, timings, type } = prospectConfig;
          const matchedTiming = findMatchedTiming(timings, PROSPECT_BATCH_INTERVAL);
          if (!matchedTiming) return;

          const logMeta = {
            company: company.id,
            chatTool: chatToolId,
            type,
            mode: matchedTiming.mode,
          };
          const target = type === AskType.TODOS ? "todos" : "projects";
          logger.info(`Asking prospects of ${ target } for company ${ company.id }`, logMeta);
          switch (chatToolId) {
            case ChatToolId.SLACK:
              if (type === AskType.TODOS) {
                await this.slackRepository.askTodos(company, matchedTiming);
              } else if (type === AskType.PROJECTS) {
                await this.slackRepository.askProjects(company, matchedTiming);
              }
              break;
            default:
              break;
          }
        }));
      }));
    } catch (error) {
      logger.error(error.message, error);
    }
  }

  private async getTargetCompanies(): Promise<Company[]> {
    const [companies, userConfigViews] = await Promise.all([
      CompanyRepository.find({
        relations: [
          "users.chatToolUser",
          "users.todoAppUser",
          "implementedTodoApp",
          "implementedChatTool",
          "timing",
          "timingExceptions",
          "prospectConfigs.timings",
        ],
      }),
      UserConfigViewRepository.find(),
    ]);
    return companies.filter(company => {
      const { prospectConfigs, timing, timingExceptions } = company;
      const userConfigView = userConfigViews.find(ucv => ucv.companyId === company.id);
      if (!userConfigView?.isValid) return false;
      const filteredConfigs = prospectConfigs.filter(prospectConfig => {
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
        } else return false;
      });
      if (filteredConfigs.length) {
        company.prospectConfigs = filteredConfigs;
        return true;
      } else return false;
    });
  }
}
