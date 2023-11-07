import { Container, Service } from "typedi";
import SlackRepository from "@/repositories/SlackRepository";
import logger from "@/libs/logger";
import { RemindConfigViewRepository } from "@/repositories/views/RemindConfigViewRepository";
import Company from "@/entities/settings/Company";
import { CompanyRepository } from "@/repositories/settings/CompanyRepository";
import { UserConfigViewRepository } from "@/repositories/views/UserConfigViewRepository";
import { findMatchedTiming } from "@/utils/misc";
import { REMIND_BATCH_INTERVAL } from "@/consts/scheduler";
import { includesDayOfToday, isHolidayToday, toJapanDateTime } from "@/utils/datetime";
import { ChatToolId, RemindType } from "@/consts/common";
import LineWorksRepository from "@/repositories/LineWorksRepository";

@Service()
export default class RemindService {
  private slackRepository: SlackRepository;
  private lineWorksRepository: LineWorksRepository;

  constructor() {
    this.slackRepository = Container.get(SlackRepository);
    this.lineWorksRepository = Container.get(LineWorksRepository);
  }

  public async send(): Promise<any> {
    try {
      const [companies, remindConfigViews] = await Promise.all([
        this.getTargetCompanies(),
        RemindConfigViewRepository.find(),
      ]);
      await Promise.all(companies.map(async company => {
        await Promise.all(company.remindConfigs?.map(async remindConfig => {
          const remindConfigView = remindConfigViews.find(rc => rc.configId === remindConfig.id);
          if (remindConfigView?.enabled && !remindConfigView.isValid) return;

          const { chatToolId, timings, type } = remindConfig;
          const matchedTiming = findMatchedTiming(timings, REMIND_BATCH_INTERVAL);
          if (!matchedTiming) return;

          const logMeta = {
            company: company.id,
            chatTool: chatToolId,
            type,
          };
          const target = type === RemindType.TODOS ? "todos" : "projects";
          logger.info(`Sending reminders of ${ target } for company ${ company.id }`, logMeta);
          switch (chatToolId) {
            case ChatToolId.SLACK:
              await this.slackRepository.remind(company, matchedTiming, remindConfig);
              break;
            case ChatToolId.LINEWORKS:
              await this.lineWorksRepository.remind(company, matchedTiming, remindConfig);
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
          "implementedTodoApps",
          "implementedChatTool",
          "timing",
          "timingExceptions",
          "remindConfigs.timings",
        ],
      }),
      UserConfigViewRepository.find(),
    ]);
    return companies.filter(company => {
      const { remindConfigs, timing, timingExceptions } = company;
      const userConfigView = userConfigViews.find(ucv => ucv.companyId === company.id);
      if (!userConfigView?.isValid) return false;
      const filteredConfigs = remindConfigs.filter(remindConfig => {
        if (remindConfig && timing) {
          const { enabled, timings } = remindConfig;
          const matchedTiming = findMatchedTiming(timings, REMIND_BATCH_INTERVAL);
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
        company.remindConfigs = filteredConfigs;
        return true;
      } else return false;
    });
  }
}
