import dataSource from "@/config/data-source";
import StatusConfig from "@/entities/settings/StatusConfig";
import { LevelStatusConfig } from "@/consts/status";

export const StatusFeatureRepository = dataSource.getRepository(StatusConfig).extend({
  async getOrCreateStatusConfig(companyId: string): Promise<void> {
      const statusConfig = await this.findOne({ where: { companyId } });
      if (!statusConfig) {
        await this.insert({
          companyId,
          ...LevelStatusConfig,
        });
      }
  },
});
