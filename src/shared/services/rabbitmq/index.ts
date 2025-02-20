
import axios from "axios";

export async function sendMessageToRabbitMq(message: any): Promise<void> {
  try {
    const response = await axios.post("/api/send", message, {
      headers: { "Content-Type": "application/json" },
    });
    console.log("Mensagem enviada ao RabbitMQ", message);
  } catch (error) {
    console.error("Erro ao enviar mensagem ao RabbitMQ", error);
  }
}


export async function sendMessageToRabbitMqMobile(message: any): Promise<void> {
  try {
    const response = await axios.post("/api/send/mobile", message, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("Mensagem enviada ao RabbitMQ Mobile", message);
  } catch (error) {
    console.error("Erro ao enviar mensagem ao RabbitMQ Mobile", error);
  }
}