import { fetchApi } from './request';
import { Service } from 'typedi';
import { IMicrosoftErrorResponse, IMicrosoftRefresh } from "../types";
import MicrosoftRepository from '../repositories/microsoft.repository';

@Service()
export default class MicrosoftRequest {
  fetchApi = async <Req, Res> (
    uri: string,
    method: string,
    params = {},
    dataRefresh: IMicrosoftRefresh,
    isRefresh = false
  ) => {
    const { todoAppUser } = dataRefresh;
    const baseUrl = process.env.MICROSOFT_GRAPH_API_URL + '/' + uri;
    const response = await fetchApi<Req, Res | IMicrosoftErrorResponse>(baseUrl, method, params, false, todoAppUser.api_token);

    if (!isRefresh && (response as IMicrosoftErrorResponse)?.error?.code === 'InvalidAuthenticationToken') {
      const microsoftRepository = new MicrosoftRepository();
      const todoAppUser = await microsoftRepository.refreshToken(dataRefresh);
      if (todoAppUser) {
        dataRefresh.todoAppUser = todoAppUser;
        return await this.fetchApi<Req, Res>(uri, method, params, dataRefresh, true);
      }
    }
    return response;
  };
}
