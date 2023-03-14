import dataSource from "@/config/data-source";
import OptionCandidate from "@/entities/settings/OptionCandidate";
import { PropertyOptionRepository } from "@/repositories/PropertyOptionRepository";

export const OptionRepository = dataSource.getRepository(OptionCandidate).extend({
  async saveOptionCandidate(
    propertyId: number,
    optionId: string,
    sectionId: number,
    name?: string,
  ) {
    const optionCandidateExit = await this.findOne({
      relations: ["boardProperty"],
      where: {
        property_id: propertyId,
        boardProperty: { section_id: sectionId },
      },
    });

    if (!optionCandidateExit) {
      const optionCandidate = new OptionCandidate(propertyId, optionId, name);
      await this.save(optionCandidate);
    }

    await PropertyOptionRepository.savePropertyOption(propertyId, optionId);
  },
});