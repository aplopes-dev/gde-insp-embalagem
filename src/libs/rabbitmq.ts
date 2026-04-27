import amqp, { Channel, Connection } from 'amqplib';

export const EXCHANGE_COMMANDS = 'gde.commands';
export const EXCHANGE_EVENTS   = 'gde.events';

let channel: Channel | null = null;
let connection: Connection | null = null;

export async function connectRabbitMQ(): Promise<Channel> {
  if (channel) return channel;
  try {
    const conn = await amqp.connect(`${process.env.RABBITMQ_URL}`);
    connection = conn as any;
    const ch = await (conn as any).createChannel();
    channel = ch;
    await channel!.assertExchange(EXCHANGE_COMMANDS, 'direct', { durable: true });
    await channel!.assertExchange(EXCHANGE_EVENTS,   'direct', { durable: true });
    return channel!;
  } catch (error) {
    console.error('Erro ao conectar ao RabbitMQ:', error);
    throw error;
  }
}

/** Publica comando para um device específico. routing_key = device_id */
export async function publishCommand(deviceId: string, payload: object): Promise<void> {
  const ch = await connectRabbitMQ();
  ch.publish(EXCHANGE_COMMANDS, deviceId, Buffer.from(JSON.stringify(payload)), { persistent: true });
}

/** Publica evento no exchange de eventos. routing_key = device_id */
export async function publishEvent(deviceId: string, payload: object): Promise<void> {
  const ch = await connectRabbitMQ();
  ch.publish(EXCHANGE_EVENTS, deviceId, Buffer.from(JSON.stringify(payload)), { persistent: true });
}

export { channel };
