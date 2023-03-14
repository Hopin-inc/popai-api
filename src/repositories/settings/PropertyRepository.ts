import dataSource from "@/config/data-source";
import BoardProperty from "@/entities/settings/BoardProperty";

export const PropertyRepository = dataSource.getRepository(BoardProperty).extend({
  async saveProperty(id: string, name: string, type: number, sectionId: number) {
    const propertyExists = await this.findOne({
      where: {
        section_id: sectionId,
        property_id: id,
      },
    });
    if (!propertyExists) {
      const property = new BoardProperty(sectionId, id, type, name);
      await this.save(property);
    }
  },
});