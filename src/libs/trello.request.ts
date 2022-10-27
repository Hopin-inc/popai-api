import { fetchApi } from './request';
import { Service } from 'typedi';
import { ITrelloAuth } from './../types';

@Service()
export default class TrelloRequest {
  fetchApi = async (uri: string, method: string, params = {}, trelloAuth: ITrelloAuth) => {
    let url = process.env.TRELLO_API_URL + '/1/' + uri;
    const { api_key, api_token } = trelloAuth;

    const authParam = {
      key: api_key,
      token: api_token,
    };

    url += '?' + new URLSearchParams(authParam).toString();
    return fetchApi(url, method, params);
  };
}
