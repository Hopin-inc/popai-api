import { fetchApi } from './request';
import { Service } from 'typedi';
import { IMicrosoftRefresh } from './../types';
import MicrosoftRepository from './../repositories/microsoft.repository';

@Service()
export default class MicrosoftRequest {
  fetchApi = async (
    uri: string,
    method: string,
    params = {},
    dataRefresh: IMicrosoftRefresh,
    isRefresh = false
  ) => {
    const { todoAppUser } = dataRefresh;
    const baseUrl = process.env.MICROSOFT_GRAPH_API_URL + '/' + uri;
    const response = await fetchApi(baseUrl, method, params, false, todoAppUser.api_token);

    if (response.error && response.error.code === 'InvalidAuthenticationToken' && !isRefresh) {
      const microsoftRepository = new MicrosoftRepository();

      const todoAppUser = await microsoftRepository.refreshToken(dataRefresh);
      if (todoAppUser) {
        dataRefresh.todoAppUser = todoAppUser;
        return await this.fetchApi(uri, method, params, dataRefresh, true);
      }
    }
    return response;
  };
}
