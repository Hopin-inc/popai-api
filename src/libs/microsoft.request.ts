import { fetchApi } from './request';
import { Service } from 'typedi';
import { IMicrosoftErrorResponse, IMicrosoftRefresh, IMicrosoftTask } from "../types";
import MicrosoftRepository from '../repositories/microsoft.repository';

@Service()
export default class MicrosoftRequest {
  fetchApi = async <Req, Res> (
    uri: string,
    method: string,
    params = {},
    dataRefresh: IMicrosoftRefresh,
    etag?: string,
    isRefresh: boolean = false
  ) => {
    const { todoAppUser } = dataRefresh;
    const baseUrl = process.env.MICROSOFT_GRAPH_API_URL + '/' + uri;
    const response = await fetchApi<Req, Res | IMicrosoftErrorResponse>(baseUrl, method, params, false, todoAppUser.api_token);

    if (!isRefresh && (response as IMicrosoftErrorResponse)?.error?.code === 'InvalidAuthenticationToken') {
      const microsoftRepository = new MicrosoftRepository();
      const todoAppUser = await microsoftRepository.refreshToken(dataRefresh);
      if (todoAppUser) {
        dataRefresh.todoAppUser = todoAppUser;
        return await this.fetchApi<Req, Res>(uri, method, params, dataRefresh, etag, true);
      }
    }
    return response;
  };

  public async getAllTasksFromPlan(boardId: string, dataRefresh: IMicrosoftRefresh) {
    return await this.fetchApi(`planner/plans/${boardId}/tasks`, 'GET', {}, dataRefresh);
  }

  public async getMyInfo(dataRefresh: IMicrosoftRefresh) {
    return await this.fetchApi(`me`, 'GET', {}, dataRefresh);
  }

  public async updateTask(id: string, task: Partial<IMicrosoftTask>, dataRefresh: IMicrosoftRefresh) {
    const etag = await this.getEtagForTask(id, dataRefresh);
    return await this.fetchApi(`planner/tasks/${id}`, 'PATCH', task, dataRefresh, etag);
  }

  private async getEtagForTask(id: string, dataRefresh: IMicrosoftRefresh): Promise<string> {
    const res = await this.fetchApi(`planner/tasks/${id}`, 'GET', {}, dataRefresh);
    return res['@odata.etag'];
  }
}
