import { publishEvent, connectRabbitMQ } from '@/libs/rabbitmq';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  const data = await request.json();
  try {
    const { device_id, ...rest } = data;
    if (!device_id) {
      const ch = await connectRabbitMQ();
      ch.sendToQueue('fila_envio', Buffer.from(JSON.stringify(data)), { persistent: true });
      return NextResponse.json({ message: 'Mensagem publicada com sucesso!' });
    }
    const event = { message_id: randomUUID(), device_id, ...rest,
                    timestamp: rest.timestamp ?? new Date().toISOString() };
    await publishEvent(device_id, event);
    return NextResponse.json({ message: 'Evento publicado!' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'RabbitMQ indisponível' }, { status: 500 });
  }
}
