import dataSource from "@/config/data-source";
import Account from "@/entities/settings/Account";

export const AccountRepository = dataSource.getRepository<Account>(Account).extend({
  async findOneByEmail(
    email: string,
    emailVerified: boolean | null = null,
    relations: string[] = [],
  ): Promise<Account | null> {
    return this.findOne({
      where: {
        email,
        ...(emailVerified !== null ? { email_verified: emailVerified } : {}),
      },
      relations: ["company", ...relations],
    });
  },
});
