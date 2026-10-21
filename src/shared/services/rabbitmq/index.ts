
import axios from "axios";

const SEND_TIMEOUT_MS = 8000;
const SEND_RETRY_DELAY_MS = 1000;

/**
 * Publica um comando para o worker. Tenta duas vezes: o comando leva request_id,
 * por isso o worker ignora a cópia se a primeira tentativa afinal tiver chegado.
 */
export async function sendMessageToRabbitMq(message: any, attempts = 2): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await axios.post("/api/send", message, {
        headers: { "Content-Type": "application/json" },
        timeout: SEND_TIMEOUT_MS,
      });
      console.log("RabbitMQ", message);
      return;
    } catch (error) {
      console.error(
        `Erro ao enviar mensagem ao RabbitMQ (tentativa ${attempt}/${attempts})`,
        error
      );
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, SEND_RETRY_DELAY_MS));
      }
    }
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
      { headers: { "Content-Type": "application/json" }, timeout: SEND_TIMEOUT_MS }
    );
    console.log("RabbitMQ - Mobile", message);
  } catch (error) {
    console.error("Erro ao enviar mensagem ao RabbitMQ Mobile", error);
  }
}
