import { Service } from "typedi";

import MicrosoftRepository from "@/repositories/MicrosoftRepository";

import { fetchApi } from "@/libs/request";
import { IMicrosoftErrorResponse, IMicrosoftRefresh, IMicrosoftTask } from "@/types/microsoft";

@Service()
export default class MicrosoftRequest {
  private async fetchApi<Res>(
    uri: string,
    method: string,
    params: any,
    dataRefresh: IMicrosoftRefresh,
    etag?: string,
    isRefresh: boolean = false,
  ) {
    const { todoAppUser } = dataRefresh;
    const baseUrl = `${ process.env.MICROSOFT_GRAPH_API_URL }/${ uri }`;
    const response = await fetchApi<IMicrosoftErrorResponse>(baseUrl, method, params, false, todoAppUser.api_token);

    if (!isRefresh && (response as IMicrosoftErrorResponse)?.error?.code === "InvalidAuthenticationToken") {
      const microsoftRepository = new MicrosoftRepository();
      const todoAppUser = await microsoftRepository.refreshToken(dataRefresh);
      if (todoAppUser) {
        dataRefresh.todoAppUser = todoAppUser;
        return await this.fetchApi<Res>(uri, method, params, dataRefresh, etag, true);
      }
    }
    return response;
  }

  public async getAllTasksFromPlan(boardId: string, dataRefresh: IMicrosoftRefresh) {
    return await this.fetchApi(`planner/plans/${ boardId }/tasks`, "GET", undefined, dataRefresh);
  }

  public async getMyInfo(dataRefresh: IMicrosoftRefresh) {
    return await this.fetchApi("me", "GET", undefined, dataRefresh);
  }

  public async updateTask(id: string, task: Partial<IMicrosoftTask>, dataRefresh: IMicrosoftRefresh) {
    const etag = await this.getEtagForTask(id, dataRefresh);
    return await this.fetchApi(`planner/tasks/${ id }`, "PATCH", task, dataRefresh, etag);
  }

  private async getEtagForTask(id: string, dataRefresh: IMicrosoftRefresh): Promise<string> {
    const res = await this.fetchApi(`planner/tasks/${ id }`, "GET", {}, dataRefresh);
    return res["@odata.etag"];
  }
}
