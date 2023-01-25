import fetch, { HeadersInit } from "node-fetch";

import { LoggerError } from "@/exceptions";
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
export async function fetchApi<Req extends Record<string, any>, Res>(
  baseUrl: string,
  method: string,
  params: Partial<Req> = {},
  isFormData: boolean = false,
  accessToken: string = null,
  headers?: HeadersInit,
): Promise<Res> {
  let url = baseUrl;
  const options = {
    method: method,
    headers: headers || {},
    body: null,
  };

  if (accessToken) {
    options.headers["Authorization"] = `Bearer ${accessToken}`;
  }

  if ("GET" === method.toUpperCase()) {
    options.headers["Content-Type"] = "application/json";
    if (Object.keys(params).length)
      url += (url.split("?")[1] ? "&" : "?") + new URLSearchParams(params).toString();
  } else {
    if (isFormData) {
      options.body = params;
    } else {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(params);
    }
  }

  try {
    const response = await fetch(url, options).then((res) => res);
    return response.json();
  } catch (error) {
    logger.error(new LoggerError(error.message));
    throw new Error(error.message);
  }
}
