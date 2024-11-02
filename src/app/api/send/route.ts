import { connectRabbitMQ } from '@/lib/rabbitmq';
import { NextResponse } from 'next/server';


export async function POST(request: Request) {
  const data = await request.json();
  const dataStr = JSON.stringify(data)
  try {
    const channel = await connectRabbitMQ();
    channel.sendToQueue('fila_recebimento', Buffer.from(dataStr), { persistent: true });
    return NextResponse.json({ message: 'Mensagem publicada com sucesso!' })
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Canal do RabbitMQ não está disponível' }, { status: 500 })
  }
}