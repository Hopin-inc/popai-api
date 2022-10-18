import fetch from 'node-fetch';

/**
 * Calls the endpoint with authorization bearer token.
 * @param {string} url
 * @param {string} accessToken
 * @param {string} method
 */
export async function fetchApi(
  url: string,
  method: string,
  params = {},
  accessToken: string = null
) {
  const options = {
    method: method,
    headers: {},
    body: null,
  };

  if (accessToken) {
    options.headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if ('GET' === method.toUpperCase()) {
    if (Object.keys(params).length)
      url += (url.split('?')[1] ? '&' : '?') + new URLSearchParams(params).toString();
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

export async function fetchTrelloApi(uri: string, method: string, params = {}) {
  let url = process.env.TRELLO_API_URL + '/1/' + uri;

  const authParam = {
    key: process.env.TRELLO_API_KEY,
    token: process.env.TRELLO_API_TOKEN,
  };

  url += '?' + new URLSearchParams(authParam).toString();
  return fetchApi(url, method, params);
}

/**
 * Calls the endpoint with authorization bearer token.
 * @param {string} uri
 * @param {string} accessToken
 * @param {string} method
 */
export async function fetchGraphApi(uri: string, method: string, params = {}, accessToken: string) {
  let url = process.env.MICROSOFT_GRAPH_API_URL + '/' + uri;
  return fetchApi(url, method, params, accessToken);
}
