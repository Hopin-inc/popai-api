import { fetchApi } from './request';
import { Service } from 'typedi';

@Service()
export default class microsoftRequest {
  private accessToken: string;

  setAuth(accessToken: string) {
    this.accessToken = accessToken;
  }

  fetchApi = async (uri: string, method: string, params = {}) => {
    const baseUrl = process.env.MICROSOFT_GRAPH_API_URL + '/' + uri;
    return await fetchApi(baseUrl, method, params, this.accessToken);
  };
}
