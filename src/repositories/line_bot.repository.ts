import { AppDataSource } from '../config/data-source';
import { InternalServerErrorException } from '../exceptions';
import { Profile } from '@line/bot-sdk';
import { LineProfile } from '../entify/line_profile.entity';
import { ReportingLine } from '../entify/reporting_lines.entity';
import { User } from '../entify/user.entity';

export const createLineProfile = async (lineProfile: Profile): Promise<LineProfile> => {
  try {
    const lineProfileRepository = AppDataSource.getRepository(LineProfile);
    // return lineProfileRepository.find(lineProfile.userId);

    const findResult = await lineProfileRepository.findOneBy({
      line_id: lineProfile.userId,
    });

    if (!findResult) {
      const profile = new LineProfile();
      profile.line_id = lineProfile.userId;
      profile.display_name = lineProfile.displayName;
      profile.picture_url = lineProfile.pictureUrl;
      profile.status_message = lineProfile.statusMessage;

      return await lineProfileRepository.save(profile);
    } // find by id

    return findResult;
  } catch (error) {
    throw new InternalServerErrorException(error.message);
  }
};

export const getSuperiorUsers = async (lineId: string): Promise<Array<User>> => {
  // Get userinfo
  const userRepositoty = AppDataSource.getRepository(User);
  const userInfo = await userRepositoty.findOneBy({ line_id: lineId });

  if (!userInfo) {
    return Promise.resolve([]);
  }

  // Get supervisords

  const reportingLineRepository = AppDataSource.getRepository(ReportingLine);
  const superiorUserIds = await reportingLineRepository.findBy({
    subordinate_user_id: userInfo.id,
  });

  if (superiorUserIds.length == 0) {
    return Promise.resolve([]);
  }

  const superiorUsers = await userRepositoty
    .createQueryBuilder('users')
    .where('id IN (:...ids)', {
      ids: superiorUserIds.map((superiorUserId) => superiorUserId.superior_user_id),
    })
    .getMany();

  return superiorUsers;
};
