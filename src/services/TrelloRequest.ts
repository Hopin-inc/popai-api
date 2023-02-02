import { Service } from "typedi";

import TodoAppUser from "@/entities/TodoAppUser";

import { fetchApi } from "@/libs/request";
import { ITrelloAuth, ITrelloMember, ITrelloTask, ITrelloList, ITrelloActivityLog } from "@/types/trello";

@Service()
export default class TrelloRequest {
  private async fetchApi<Req, Res>(uri: string, method: string, params = {}, trelloAuth: ITrelloAuth): Promise<Res> {
    let url = `${ process.env.TRELLO_API_URL }/1/${ uri }`;
    const { api_key, api_token } = trelloAuth;

    const authParam = {
      key: api_key,
      token: api_token,
    };

    url += "?" + new URLSearchParams(authParam).toString();
    return fetchApi<Req, Res>(url, method, params);
  }

  public generateAuth(todoAppUser: TodoAppUser): ITrelloAuth {
    const { api_key, api_token } = todoAppUser;
    return { api_key, api_token };
  }

  public async getAllCardsFromBoard(boardId: string, trelloAuth: ITrelloAuth) {
    return await this.fetchApi<{}, ITrelloTask[]>(`boards/${ boardId }/cards/all`, "GET", {}, trelloAuth);
  }

  public async getArchiveListsFromBoard(boardId: string, trelloAuth: ITrelloAuth) {
    return await this.fetchApi<{}, ITrelloList[]>(`boards/${ boardId }/lists/closed`, "GET", {}, trelloAuth);
  }

  public async getActivityLogFromBoard(boardId: string, trelloAuth: ITrelloAuth) {
    return await this.fetchApi<{}, ITrelloActivityLog[]>(`boards/${ boardId }/actions`, "GET", {}, trelloAuth);
  }

  public async getMyInfo(trelloAuth: ITrelloAuth) {
    return await this.fetchApi<{}, ITrelloMember>("members/me", "GET", {}, trelloAuth);
  }

  public async updateCard(id: string, task: Partial<ITrelloTask>, trelloAuth: ITrelloAuth) {
    return await this.fetchApi<{}, void>(`cards/${ id }`, "PUT", task, trelloAuth);
  }
}
