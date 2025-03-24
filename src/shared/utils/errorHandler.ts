import logger from "@/libs/logger";
import axios from "axios";

export type ApiResponseError = {
  status: number,
  error: string,
  errorData?: any
}

export function handleError(error: any, message: string) {
  const isAxiosError = axios.isAxiosError(error) || error.isAxiosError;
  if (isAxiosError) {
    logger.error({
      message,
      error: error.message,
      method: error.config?.method,
      url: error.config?.url,
      body: typeof error.config?.data === "string" ? JSON.parse(error.config?.data) : error.config?.data,
      headers: error.config?.headers,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
    });
  } else {
    logger.error({
      message,
      error: error?.message || error,
      stack: error?.stack || "Sem stack trace",
    });
  }
}


export function handleApiResponseError(error: any, message: string, status: number = 500) {
  handleError(error, message)
  const isAxiosError = axios.isAxiosError(error) || error.isAxiosError;
  return {
    status,
    error: error.message || message,
    ...isAxiosError && { status: error.response?.status || status, errorData: error.response?.data }
  } as ApiResponseError
}
