import amqp, { Channel, Connection } from 'amqplib';

let channel: Channel | null = null; // Canal de comunicação
let connection: Connection | null = null; // Conexão com RabbitMQ
const COMMANDS_EXCHANGE = process.env.RABBITMQ_COMMANDS_EXCHANGE || 'gde.commands';
const EVENTS_EXCHANGE = process.env.RABBITMQ_EVENTS_EXCHANGE || 'gde.events';

export async function connectRabbitMQ(): Promise<Channel> {
  if (channel) return channel; // Usa o canal existente, se disponível
  try {
    const conn = await amqp.connect(`${process.env.RABBITMQ_URL}`);
    connection = conn as any;
    const ch = await (conn as any).createChannel();
    channel = ch;
    if (channel) {
      await channel.assertExchange(COMMANDS_EXCHANGE, 'topic', { durable: true });
      await channel.assertExchange(EVENTS_EXCHANGE, 'topic', { durable: true });
      await channel.assertQueue('fila_recebimento', { durable: true });
      await channel.assertQueue('fila_envio', { durable: true });
      await channel.assertQueue('fila_oculos', { durable: true });
      await channel.assertQueue('fila_action', { durable: true });
      await channel.assertQueue('fila_status', { durable: true });
    }
    return channel!;
  } catch (error) {
    console.error('Erro ao conectar ao RabbitMQ:', error);
    throw error;
  }
}

function toRoutingDevice(deviceId?: string): string {
  if (!deviceId) return 'unknown';
  const match = deviceId.match(/(\d+)/);
  if (!match) return deviceId.replace(/_/g, '.');
  return `realwear.${match[1].padStart(2, '0')}`;
}

export function buildRoutingKey(deviceId: string | undefined, kind: string): string {
  return `${toRoutingDevice(deviceId)}.${kind}`;
}

export async function publishDual(
  queueName: string,
  exchangeName: string,
  routingKey: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const ch = await connectRabbitMQ();
  const data = Buffer.from(JSON.stringify(payload));
  ch.sendToQueue(queueName, data, { persistent: true });
  ch.publish(exchangeName, routingKey, data, { persistent: true });
}

export { COMMANDS_EXCHANGE, EVENTS_EXCHANGE };
export { channel };
