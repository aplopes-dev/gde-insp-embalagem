import amqp, { Channel, Connection } from 'amqplib';

let channel: Channel | null = null; // Canal de comunicação
let connection: Connection | null = null; // Conexão com RabbitMQ

export async function connectRabbitMQ(): Promise<Channel> {
  if (channel) return channel; // Usa o canal existente, se disponível
  try {
    const conn = await amqp.connect(`${process.env.RABBITMQ_URL}`);
    connection = conn as any;
    const ch = await (conn as any).createChannel();
    channel = ch;
    // await channel.assertQueue('fila_envio', { durable: true });
    if (channel) {
      await channel.assertQueue('fila_recebimento', { durable: true });
    }
    return channel!;
  } catch (error) {
    console.error('Erro ao conectar ao RabbitMQ:', error);
    throw error;
  }
}

export { channel };
