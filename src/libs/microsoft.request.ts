import { fetchApi } from './request';
import { Service } from 'typedi';
import { IImplementedTodoApp, ITodoAppUser } from 'src/types';
import MicrosoftRepository from './../repositories/microsoft.repository';

@Service()
export default class MicrosoftRequest {
  private accessToken: string;
  private todoAppUser: ITodoAppUser;
  private implementedTodoApp: IImplementedTodoApp;

  setTernant(implementedTodoApp: IImplementedTodoApp) {
    this.implementedTodoApp = implementedTodoApp;
  }

  setAuth(accessToken: string) {
    this.accessToken = accessToken;
  }

  setTodoAppUser(todoAppUser: ITodoAppUser) {
    this.todoAppUser = todoAppUser;
  }

  getTodoAppUser() {
    return this.todoAppUser;
  }

  fetchApi = async (uri: string, method: string, params = {}, isRefresh = false) => {
    const baseUrl = process.env.MICROSOFT_GRAPH_API_URL + '/' + uri;
    const response = await fetchApi(baseUrl, method, params, this.accessToken);

    if (response.error && response.error.code === 'InvalidAuthenticationToken' && !isRefresh) {
      console.log(response);
      const microsoftRepository = new MicrosoftRepository();
      const todoAppUser = await microsoftRepository.refreshToken(this.implementedTodoApp);
      if (todoAppUser) {
        this.setAuth(todoAppUser.api_token);
        return await this.fetchApi(baseUrl, method, params, true);
      }
    }
    return response;
  };
}
