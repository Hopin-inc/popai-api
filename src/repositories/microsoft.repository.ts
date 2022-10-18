import { getToken, tokenRequest } from '../config/microsoft';
import { InternalServerErrorException } from '../exceptions';
import { fetchGraphApi } from '../libs/request';

export const getAccessToken = async (): Promise<any> => {
  try {
    const authResponse = await getToken(tokenRequest);
    const accessToken = authResponse.accessToken;
    const users = await fetchGraphApi('users', 'GET', {}, accessToken);
    return users;
  } catch (error) {
    throw new InternalServerErrorException(error.message);
  }
};
