import fetch from 'node-fetch';

export async function fetchTrelloApi(url: string, method: string, params = {}) {
  const authParam = {
    key: process.env.TRELLO_API_KEY,
    token: process.env.TRELLO_API_TOKEN,
  };

  const options = {
    method: method,
    headers: {},
    body: null,
  };

  url += '?' + new URLSearchParams(authParam).toString();
  if ('GET' === method) {
    url += '&' + new URLSearchParams(params).toString();
  } else {
    options.body = JSON.stringify(params);
  }

  try {
    let response = await fetch(url, options).then((res) => res);
    return response.json();
  } catch (error) {
    throw new Error(error.message);
  }
}
