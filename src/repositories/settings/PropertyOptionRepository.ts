import dataSource from "@/config/data-source";
import PropertyOption from "@/entities/settings/PropertyOption";
import { OptionRepository } from "@/repositories/settings/OptionRepository";

export const PropertyOptionRepository = dataSource.getRepository(PropertyOption).extend({
  async savePropertyOption(propertyId: number, optionId?: string) {
    const optionRecord = optionId
      ? await OptionRepository.findOneBy({ property_id: propertyId, option_id: optionId })
      : await OptionRepository.findOneBy({ property_id: propertyId });

    const propertyOptionExit = await this.findOneBy({
      property_id: propertyId,
      option_id: optionRecord?.id,
    });

    if (!propertyOptionExit) {
      const propertyOption = new PropertyOption(propertyId, optionRecord?.id);
      await this.save(propertyOption);
    }
  },
});