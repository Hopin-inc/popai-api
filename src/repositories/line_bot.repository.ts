import { AppDataSource } from '../config/data-source';
import { InternalServerErrorException } from '../exceptions';
import { Profile } from '@line/bot-sdk';
import { LineProfile } from '../entify/line_profile.entity';

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
