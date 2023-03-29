import dataSource from "@/config/data-source";
import CompanyCondion from "@/entities/settings/CompanyCondition";
import CompanyCondition from "@/entities/settings/CompanyCondition";

export const CompanyConditionRepository = dataSource.getRepository<CompanyCondition>(CompanyCondion).extend({
  async getDayReminds(companyConditions: CompanyCondition[]): Promise<number[]> {
    return companyConditions
      .map((s) => s.remind_before_days)
      .filter(Number.isFinite);
  },
});
