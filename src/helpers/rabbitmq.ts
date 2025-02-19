import amqp, { Channel, Connection } from 'amqplib';

let channel: Channel | null = null; // Canal de comunicação
let connection: Connection | null = null; // Conexão com RabbitMQ

export async function connectRabbitMQ(): Promise<Channel> {
  if (channel) return channel; // Usa o canal existente, se disponível
  try {
    connection = await amqp.connect(`${process.env.RABBITMQ_URL}`); // Ajuste conforme necessário
    channel = await connection.createChannel();
    // await channel.assertQueue('fila_envio', { durable: true });
    await channel.assertQueue('fila_recebimento', { durable: true });
    return channel;
  } catch (error) {
    console.error('Erro ao conectar ao RabbitMQ:', error);
    throw error;
  }
}

export { channel };
