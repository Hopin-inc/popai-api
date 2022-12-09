import { fetchApi } from './request';
import { Service } from 'typedi';
import { ITodoAppUser, ITrelloAuth, ITrelloTask } from '../types';

@Service()
export default class TrelloRequest {
  private fetchApi = async (uri: string, method: string, params = {}, trelloAuth: ITrelloAuth) => {
    let url = process.env.TRELLO_API_URL + '/1/' + uri;
    const { api_key, api_token } = trelloAuth;

    const authParam = {
      key: api_key,
      token: api_token,
    };

    url += '?' + new URLSearchParams(authParam).toString();
    return fetchApi(url, method, params);
  };

  public generateAuth(todoAppUser: ITodoAppUser): ITrelloAuth {
    const { api_key, api_token } = todoAppUser;
    return { api_key, api_token };
  }

  public async getAllCardsFromBoard(boardId: string, trelloAuth: ITrelloAuth) {
    return await this.fetchApi(`boards/${boardId}/cards/all`, 'GET', {}, trelloAuth);
  }

  public async getMyInfo(trelloAuth: ITrelloAuth) {
    return await this.fetchApi(`members/me`, 'GET', {}, trelloAuth);
  }

  public async updateCard(id: string, task: Partial<ITrelloTask>, trelloAuth: ITrelloAuth) {
    return await this.fetchApi(`cards/${id}`, 'PUT', task, trelloAuth)
  }
}
