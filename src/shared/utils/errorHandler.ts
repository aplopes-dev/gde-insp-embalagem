import logger from "@/libs/logger";
import axios from "axios";

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

// export function handleError(error: any, message: string) {
//   const isRequestError = axios.isAxiosError(error) || error.isAxiosError;
//   const errorData = isRequestError ? {
//     message,
//     error: error.message,
//     method: error.config?.method,
//     url: error.config?.url,
//     body: typeof error.config?.data === "string" ? JSON.parse(error.config?.data) : error.config?.data,
//     headers: error.config?.headers,
//     status: error.response?.status,
//     statusText: error.response?.statusText,
//     responseData: error.response?.data,
//   } : {
//     message,
//     error: error?.message || error,
//     stack: error?.stack || "Sem stack trace",
//   };

//   logger.error(errorData);
//   return { isRequestError, errorData }
// }

// export function handleApiError(error: any, message: string, status?: number) {
//   const errorHandler = handleError(error, message)
//   if (errorHandler.isRequestError) {
//     return NextResponse.json({
//       message: error.message || "Erro desconhecido",
//       status: status || errorHandler.errorData.status
//     })
//   }
// }
