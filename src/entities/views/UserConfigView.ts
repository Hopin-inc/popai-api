import { Column, ViewEntity } from "typeorm";
import Company from "../settings/Company";
import User from "../settings/User";

@ViewEntity("v_user_configs", {
  expression: dataSource => dataSource
    .createQueryBuilder()
    .select("c.id", "company_id")
    .addSelect(`
      CASE
        WHEN COUNT(u.id) > 0 THEN TRUE
        ELSE FALSE
      END
    `, "is_valid")
    .from(Company, "c")
    .leftJoin(User, "u")
    .groupBy("c.id"),
})
export default class UserConfigView {
  @Column({ name: "company_id" })
  companyId: string;

  @Column({ name: "is_valid" })
  isValid: boolean;
}
