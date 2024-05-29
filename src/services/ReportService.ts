import { Container, Service } from "typedi";
import SlackRepository from "@/repositories/SlackRepository";
import { ChatToolId } from "@/consts/common";
import logger from "@/libs/logger";
import Company from "@/entities/settings/Company";
import { CompanyRepository } from "@/repositories/settings/CompanyRepository";
import { ProspectConfigViewRepository } from "@/repositories/views/ProspectConfigViewRepository";
import { UserConfigViewRepository } from "@/repositories/views/UserConfigViewRepository";

@Service()
export default class ReportService {
  private slackRepository: SlackRepository;

  constructor() {
    this.slackRepository = Container.get(SlackRepository);
  }

  public async report(): Promise<any> {
    try {
      const [companies, prospectConfigViews] = await Promise.all([
        this.getTargetCompanies(),
        ProspectConfigViewRepository.find(),
      ]);

      await Promise.all(companies.map(async company => {
        await Promise.all(company.prospectConfigs?.map(async prospectConfig => {
          const prospectConfigView = prospectConfigViews.find(pc => pc.configId === prospectConfig.id);
          if (prospectConfigView?.enabled && !prospectConfigView?.isValid) return;

          const { chatToolId, type } = prospectConfig;
          const logMeta = {
            company: company.id,
            chatTool: chatToolId,
            type,
          };

          logger.info(`Sending todos report of todos for company ${ company.id }`, logMeta);
          switch (chatToolId) {
            case ChatToolId.SLACK:
              await this.slackRepository.report(company, prospectConfig);
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
          "prospectConfigs",
        ],
      }),
      UserConfigViewRepository.find(),
    ]);

    return companies.filter(company => {
      const userConfigView = userConfigViews.find(ucv => ucv.companyId === company.id);
      return userConfigView?.isValid || false;
    });
  }
}
