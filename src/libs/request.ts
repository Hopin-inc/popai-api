import fetch, { HeadersInit, RequestInit } from "node-fetch";

import logger from "@/logger/winston";

/**
 *  Calls the endpoint with authorization bearer token.
 *
 * @param baseUrl
 * @param method
 * @param params
 * @param isFormData
 * @param accessToken
 * @param headers
 * @returns
 */
export async function fetchApi<Res, IsFormData extends boolean = boolean>(
  baseUrl: string,
  method: string,
  params?: IsFormData extends true ? FormData : any,
  isFormData?: IsFormData,
  accessToken: string = null,
  headers?: HeadersInit,
): Promise<Res> {
  let url = baseUrl;
  const options: RequestInit = {
    method: method,
    headers: headers || {},
    body: null,
  };

  if (accessToken) {
    options.headers["Authorization"] = `Bearer ${ accessToken }`;
  }

  if ("GET" === method.toUpperCase()) {
    options.headers["Content-Type"] = "application/json";
    if (Object.keys(params).length) {
      url += (url.split("?")[1] ? "&" : "?") + new URLSearchParams(params).toString();
    }
  } else {
    if (isFormData) {
      options.body = params;
    } else {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(params);
    }
  }

  try {
    const response = await fetch(url, options);
    if (response.ok) {
      return await response.json() as Res;
    } else {
      throw new Error(JSON.stringify(await response.json()));
    }
  } catch (error) {
    logger.error(error);
    throw new Error(error.message);
  }
}
