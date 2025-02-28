import logger from "@/libs/logger";
import axios, { AxiosError } from "axios";

export function handleError(error: any, message: string) {
  if (axios.isAxiosError(error)) {
    const axiosError = error.toJSON() as AxiosError
    logger.error({
      message,
      error: axiosError.message,
      method: axiosError.config?.method,
      url: axiosError.config?.url,
      body: !!axiosError.config?.data ? JSON.parse(axiosError.config?.data) : undefined,
      headers: axiosError.config?.headers,
      response: axiosError.response,
    });
  } else {
    logger.error({
      message,
      error: error?.message || error,
      stack: error?.stack || "Sem stack trace",
    });
  }
  throw new Error(message);
}
