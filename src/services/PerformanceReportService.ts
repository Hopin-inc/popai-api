import { Container, Service } from "typedi";
import SlackRepository from "@/repositories/SlackRepository";
import NotionRepository from "@/repositories/NotionRepository";
import { TodoRepository } from "@/repositories/transactions/TodoRepository";
import { CompanyRepository } from "@/repositories/settings/CompanyRepository";
import Company from "@/entities/settings/Company";
import LineRepository from "@/repositories/LineRepository";
import TrelloRepository from "@/repositories/TrelloRepository";

@Service()
export default class PerformanceReportService {
  private slackRepository: SlackRepository;
  private lineRepository: LineRepository;
  private notionRepository: NotionRepository;
  private trelloRepository: TrelloRepository;

  constructor() {
    this.slackRepository = Container.get(SlackRepository);
    this.lineRepository = Container.get(LineRepository);
    this.notionRepository = Container.get(NotionRepository);
    this.trelloRepository = Container.get(TrelloRepository);
  }

  public async sendPerformanceReport(monthly: boolean = false): Promise<any> {
    const companies = await CompanyRepository.find({});

    const sendOperations = async (company: Company) => {
      await this.sendPerformanceReportByChannel(company);
    };
    await Promise.all(companies.map(company => {
      if (company.id === 1) {
        return (sendOperations(company));
      }
    }));
  }

  private async sendPerformanceReportByChannel(company: Company) {
    const performanceReportItems = await TodoRepository.getLastWeekTodosByStatus(company);
    console.log(performanceReportItems.delayed.length);
    console.log(performanceReportItems.completed.length);
    const ratio = performanceReportItems.delayed.length / performanceReportItems.planed.length * 100;
    console.log(ratio);
  }
}