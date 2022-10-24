import fetch from 'node-fetch';

/**
 * Calls the endpoint with authorization bearer token.
 * @param {string} url
 * @param {string} accessToken
 * @param {string} method
 */
export async function fetchApi(
  baseUrl: string,
  method: string,
  params = {},
  accessToken: string = null
) {
  let url = baseUrl;
  const options = {
    method: method,
    headers: { 'Content-Type': 'application/json' },
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
    const response = await fetch(url, options).then((res) => res);
    return response.json();
  } catch (error) {
    throw new Error(error.message);
  }
}
