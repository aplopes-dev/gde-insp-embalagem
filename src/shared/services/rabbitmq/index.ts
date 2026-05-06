
import axios from "axios";

export async function sendMessageToRabbitMq(message: any): Promise<void> {
  try {
    await axios.post("/api/send", message, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    const status = error?.response?.status as number | undefined;
    const data = error?.response?.data;
    console.error("Erro ao enviar mensagem ao RabbitMQ", status, data);
    const err = new Error(
      typeof data?.error === "string" ? data.error : "Falha ao enviar comando"
    ) as Error & { status?: number; payload?: unknown };
    err.status = status;
    err.payload = data;
    throw err;
  }
}

export async function sendMessageToRabbitMqMobile(
  message: any,
  deviceId?: string
): Promise<void> {
  try {
    await axios.post(
      "/api/send/mobile",
      { ...message, ...(deviceId ? { device_id: deviceId } : {}) },
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    const status = error?.response?.status as number | undefined;
    const data = error?.response?.data;
    console.error("Erro ao enviar mensagem ao RabbitMQ Mobile", status, data);
    const err = new Error(
      typeof data?.error === "string" ? data.error : "Falha ao enviar comando"
    ) as Error & { status?: number; payload?: unknown };
    err.status = status;
    err.payload = data;
    throw err;
  }
}