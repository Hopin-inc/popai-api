import dataSource from "@/config/data-source";
import DailyReport from "@/entities/transactions/DailyReport";
import Company from "@/entities/settings/Company";
import User from "@/entities/settings/User";
import Section from "@/entities/settings/Section";
import dayjs from "dayjs";
import { Between, FindOptionsWhere } from "typeorm";

export const DailyReportRepository = dataSource.getRepository<DailyReport>(DailyReport).extend({
  async getDailyReportsToday(
    company?: Company,
    user?: User,
    date: Date = new Date(),
    sections?: Section[],
  ): Promise<DailyReport[]> {
    const start = dayjs(date).startOf("day").toDate();
    const end = dayjs(date).endOf("day").toDate();
    const findByCompany: FindOptionsWhere<DailyReport> = company ? { company_id: company.id } : {};
    const findByUser: FindOptionsWhere<DailyReport> = user ? { user_id: user.id } : {};
    const where: FindOptionsWhere<DailyReport> = {
      ...findByCompany,
      ...findByUser,
      created_at: Between(start, end),
    };
    const dailyReports = await this.find({ where, relations: ["user.chattoolUsers"] });
    if (sections) {
      dailyReports.filter(report => sections.some(section => report.section_ids.includes(section.id)));
    }
    return dailyReports;
  },
});
