import dataSource from "@/config/data-source";
import ProspectConfigView from "@/entities/views/ProspectConfigView";

export const ProspectConfigViewRepository = dataSource.getRepository(ProspectConfigView).extend({

});
