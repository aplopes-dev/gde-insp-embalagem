import { EVENTS_EXCHANGE, buildRoutingKey, publishDual } from '@/libs/rabbitmq';
import { buildV2Envelope } from '@/libs/message-contract';
import { NextResponse } from 'next/server';


export async function POST(request: Request) {
  const data = await request.json();
  const envelope = buildV2Envelope({
    type: "mobile_message",
    payload: data,
    deviceId: String((data as any).device_id ?? ""),
    opId: String((data as any).op_id ?? ""),
    action: String((data as any).action ?? "MOBILE_MESSAGE"),
    source: "next_api_send_mobile",
  });
  try {
    await publishDual(
      'fila_oculos',
      EVENTS_EXCHANGE,
      buildRoutingKey(String((envelope as any).device_id ?? ''), 'mobile_message'),
      envelope,
    );
    return NextResponse.json({ message: 'Mensagem publicada com sucesso!' })
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Canal do RabbitMQ não está disponível' }, { status: 500 })
  }
}