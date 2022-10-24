import { fetchApi } from './request';
import { Service } from 'typedi';

@Service()
export default class TrelloRequest {
  private apiKey: string;
  private apiToken: string;

  setAuth(apiKey: string, apiToken: string) {
    this.apiKey = apiKey;
    this.apiToken = apiToken;
  }

  fetchApi = async (uri: string, method: string, params = {}) => {
    let url = process.env.TRELLO_API_URL + '/1/' + uri;

    const authParam = {
      key: this.apiKey,
      token: this.apiToken,
    };

    url += '?' + new URLSearchParams(authParam).toString();
    return fetchApi(url, method, params);
  };
}
