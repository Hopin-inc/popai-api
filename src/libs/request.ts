import fetch from 'node-fetch';

/**
 *  Calls the endpoint with authorization bearer token.
 *
 * @param baseUrl
 * @param method
 * @param params
 * @param isFormData
 * @param accessToken
 * @returns
 */
export async function fetchApi(
  baseUrl: string,
  method: string,
  params = {},
  isFormData: boolean = false,
  accessToken: string = null
) {
  let url = baseUrl;
  const options = {
    method: method,
    headers: {},
    body: null,
  };

  if (accessToken) {
    options.headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if ('GET' === method.toUpperCase()) {
    options.headers['Content-Type'] = 'application/json';
    if (Object.keys(params).length)
      url += (url.split('?')[1] ? '&' : '?') + new URLSearchParams(params).toString();
  } else {
    if (isFormData) {
      options.body = params;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(params);
    }
  }

  try {
    const response = await fetch(url, options).then((res) => res);
    return response.json();
  } catch (error) {
    throw new Error(error.message);
  }
}
