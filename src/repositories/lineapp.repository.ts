import { InternalServerErrorException } from '../exceptions';
import { Service } from 'typedi';

@Service()
export default class LineAppRepository {
  pushMessageRemind = async (): Promise<any> => {
    try {
      //do something
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  };
}
