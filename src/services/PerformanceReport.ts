import { Container, Service } from "typedi";
import SlackRepository from "@/repositories/SlackRepository";
import NotionRepository from "@/repositories/NotionRepository";

@Service()
export default class PerformanceReportService {
  private slackRepository: SlackRepository;
  private notionRepository: NotionRepository;

  constructor() {
    this.slackRepository = Container.get(SlackRepository);
    this.notionRepository = Container.get(NotionRepository);
  }

  public async sendPerformanceReport(monthly: boolean = false): Promise<any> {
  }
}