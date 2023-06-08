import dataSource from "@/config/data-source";
import UserConfigView from "@/entities/views/UserConfigView";

export const UserConfigViewRepository = dataSource.getRepository(UserConfigView).extend({

});
