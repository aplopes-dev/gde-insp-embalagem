import { Channel, connect } from 'amqplib';

let channel: Channel | null = null; // Canal de comunicação
let connection: any = null; // Conexão com RabbitMQ (tipagem relaxada para evitar conflito de defs)

export async function connectRabbitMQ(): Promise<Channel> {
  if (channel) return channel; // Usa o canal existente, se disponível
  try {
    connection = await connect(`${process.env.RABBITMQ_URL}`); // Ajuste conforme necessário
    const ch = await connection.createChannel();
    await ch.assertQueue('fila_action', { durable: true });
    await ch.assertQueue('fila_oculos', { durable: true });
    channel = ch;
    return ch;
  } catch (error) {
    console.error('Erro ao conectar ao RabbitMQ:', error);
    throw error;
  }
}

export { channel };
