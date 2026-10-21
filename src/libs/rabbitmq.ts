import amqp, { ChannelModel, ConfirmChannel, Options } from 'amqplib';

export const EXCHANGE_COMMANDS = 'gde.commands';
export const EXCHANGE_EVENTS   = 'gde.events';

/** Comando parado na fila mais do que isto já não serve (worker caído / Wi-Fi). 0 desliga. */
const COMMAND_TTL_MS = Number(process.env.RABBITMQ_COMMAND_TTL_MS ?? 60_000);
/** Sem confirmação do broker neste prazo, o pedido HTTP falha (o cliente tenta de novo). */
const PUBLISH_CONFIRM_TIMEOUT_MS = Number(process.env.RABBITMQ_CONFIRM_TIMEOUT_MS ?? 5_000);

let channelPromise: Promise<ConfirmChannel> | null = null;
let currentModel: ChannelModel | null = null;

async function openChannel(): Promise<ConfirmChannel> {
  const model = await amqp.connect(`${process.env.RABBITMQ_URL}`);
  currentModel = model;

  // Antes não havia handlers: após um reinício do broker o canal em cache ficava
  // morto e /api/send devolvia 500 até reiniciar o container.
  const drop = (reason: string) => {
    if (currentModel !== model) return;
    console.warn(`[RabbitMQ] ${reason} — a próxima publicação volta a ligar`);
    currentModel = null;
    channelPromise = null;
    model.close().catch(() => {});
  };
  model.on('error', (err) => console.error('[RabbitMQ] Erro na conexão:', err?.message));
  model.on('close', () => drop('conexão fechada'));

  const ch = await model.createConfirmChannel();
  ch.on('error', (err) => console.error('[RabbitMQ] Erro no canal:', err?.message));
  ch.on('close', () => drop('canal fechado'));
  await ch.assertExchange(EXCHANGE_COMMANDS, 'direct', { durable: true });
  await ch.assertExchange(EXCHANGE_EVENTS,   'direct', { durable: true });
  return ch;
}

/** Canal partilhado (confirmações ligadas). Concorrentes no 1.º uso partilham a mesma ligação. */
export async function connectRabbitMQ(): Promise<ConfirmChannel> {
  if (!channelPromise) {
    channelPromise = openChannel().catch((error) => {
      channelPromise = null;
      console.error('Erro ao conectar ao RabbitMQ:', error);
      throw error;
    });
  }
  return channelPromise;
}

/** Publica e espera a confirmação do broker (falha em vez de perder o comando em silêncio). */
async function publishConfirmed(
  exchange: string,
  routingKey: string,
  payload: object,
  options: Options.Publish
): Promise<void> {
  const ch = await connectRabbitMQ();
  const body = Buffer.from(JSON.stringify(payload));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const confirmed = new Promise<void>((resolve, reject) => {
    ch.publish(exchange, routingKey, body, options, (err) => (err ? reject(err) : resolve()));
  });
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`sem confirmação do RabbitMQ em ${PUBLISH_CONFIRM_TIMEOUT_MS} ms`)),
      PUBLISH_CONFIRM_TIMEOUT_MS
    );
  });
  try {
    await Promise.race([confirmed, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export function commandPublishOptions(payload: object): Options.Publish {
  const messageId = (payload as { message_id?: unknown }).message_id;
  return {
    persistent: true,
    ...(COMMAND_TTL_MS > 0 ? { expiration: String(COMMAND_TTL_MS) } : {}),
    ...(typeof messageId === 'string' ? { messageId } : {}),
  };
}

/** Publica comando para um device específico. routing_key = device_id */
export async function publishCommand(deviceId: string, payload: object): Promise<void> {
  await publishConfirmed(EXCHANGE_COMMANDS, deviceId, payload, commandPublishOptions(payload));
}

/** Publica evento no exchange de eventos. routing_key = device_id (tempo real: não persiste). */
export async function publishEvent(deviceId: string, payload: object): Promise<void> {
  await publishConfirmed(EXCHANGE_EVENTS, deviceId, payload, { persistent: false });
}
