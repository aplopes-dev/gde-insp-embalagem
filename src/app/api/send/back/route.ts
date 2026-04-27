import { connectRabbitMQ } from '@/libs/rabbitmq';
import { buildV2Envelope } from '@/libs/message-contract';
import { NextResponse } from 'next/server';


export async function POST(request: Request) {
  const data = await request.json();
  const envelope = buildV2Envelope({
    type: "detection",
    payload: data,
    deviceId: String((data as any).device_id ?? ""),
    opId: String((data as any).op_id ?? ""),
    action: String((data as any).action ?? "DETECTION_RESULT"),
    source: "next_api_send_back",
  });
  const dataStr = JSON.stringify(envelope)
  try {
    const channel = await connectRabbitMQ();
    channel.sendToQueue('fila_envio', Buffer.from(dataStr), { persistent: true });
    return NextResponse.json({ message: 'Mensagem publicada com sucesso!' })
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Canal do RabbitMQ não está disponível' }, { status: 500 })
  }
}