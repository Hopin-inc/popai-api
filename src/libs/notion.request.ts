import { fetchApi } from './request';
import { Service } from 'typedi';
import { INotionAuth } from './../types';
import { Client } from '@notionhq/client';

@Service()
export default class NotionRequest {
  fetchApi = async (notionAuth: INotionAuth) => {
    const { api_key } = notionAuth;
    const notion = new Client({ auth: api_key });

    return notion;
  };
}