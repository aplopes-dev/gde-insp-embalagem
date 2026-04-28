import { connectRabbitMQ } from '@/libs/rabbitmq';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const data = await request.json();
  const { device_id, ...payload } = data;

  // Publica na fila exclusiva do óculos quando device_id é informado.
  // Fallback para fila_oculos (compatibilidade com chamadas sem device_id).
  const queue = device_id ? `fila_oculos_${device_id}` : 'fila_oculos';

  try {
    const channel = await connectRabbitMQ();
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), { persistent: true });
    return NextResponse.json({ message: 'Mensagem publicada com sucesso!' });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Canal do RabbitMQ não está disponível' },
      { status: 500 }
    );
  }
}
