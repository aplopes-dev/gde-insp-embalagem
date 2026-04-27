import { COMMANDS_EXCHANGE, buildRoutingKey, publishDual } from '@/libs/rabbitmq';
import { buildV2Envelope } from '@/libs/message-contract';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/libs/auth';
import { nestPublishCommand, useGdeApi } from '@/libs/gde-api';


export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Obtém o userId da sessão
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const userId = ( session.user as any ).id;

    if (useGdeApi()) {
      await nestPublishCommand(data, userId);
      return NextResponse.json({ message: 'Mensagem publicada com sucesso!' });
    }

    // Se o payload contém dados de blisters (array com boxId, blisters e userId)
    if (Array.isArray(data) && data.length >= 3) {
      // Formato: [boxId, blisters[], userId]
      const [boxId, blisters, providedUserId] = data;
      const payloadWithUserId = {
        boxId: boxId,
        blisters: blisters,
        userId: providedUserId || userId
      };
      
      const envelope = buildV2Envelope({
        type: "command",
        payload: payloadWithUserId,
        deviceId: String((payloadWithUserId as any).device_id ?? ""),
        opId: String((payloadWithUserId as any).op_id ?? ""),
        action: String((payloadWithUserId as any).action ?? "START_INSPECTION"),
        source: "next_api_send",
      });
      const dataStr = JSON.stringify(envelope);
      await publishDual(
        'fila_recebimento',
        COMMANDS_EXCHANGE,
        buildRoutingKey(String((payloadWithUserId as any).device_id ?? ''), 'command'),
        envelope,
      );
      return NextResponse.json({ message: 'Mensagem publicada com sucesso!' });
    } else if (Array.isArray(data) && data.length >= 2 && typeof data[0] === 'string' && Array.isArray(data[1])) {
      // Formato: [boxId, blisters[]] (fallback)
      const payloadWithUserId = {
        boxId: data[0],
        blisters: data[1],
        userId: userId
      };
      
      const envelope = buildV2Envelope({
        type: "command",
        payload: payloadWithUserId,
        deviceId: String((payloadWithUserId as any).device_id ?? ""),
        opId: String((payloadWithUserId as any).op_id ?? ""),
        action: String((payloadWithUserId as any).action ?? "START_INSPECTION"),
        source: "next_api_send",
      });
      const dataStr = JSON.stringify(envelope);
      await publishDual(
        'fila_recebimento',
        COMMANDS_EXCHANGE,
        buildRoutingKey(String((payloadWithUserId as any).device_id ?? ''), 'command'),
        envelope,
      );
      return NextResponse.json({ message: 'Mensagem publicada com sucesso!' });
    } else {
      // Para outros tipos de mensagem, adiciona userId se não existir
      const payloadWithUserId = {
        ...data,
        ...(userId && !data.userId ? { userId } : {})
      };
      
      const envelope = buildV2Envelope({
        type: "command",
        payload: payloadWithUserId,
        deviceId: String((payloadWithUserId as any).device_id ?? ""),
        opId: String((payloadWithUserId as any).op_id ?? ""),
        action: String((payloadWithUserId as any).action ?? "START_INSPECTION"),
        source: "next_api_send",
      });
      const dataStr = JSON.stringify(envelope);
      await publishDual(
        'fila_recebimento',
        COMMANDS_EXCHANGE,
        buildRoutingKey(String((payloadWithUserId as any).device_id ?? ''), 'command'),
        envelope,
      );
      return NextResponse.json({ message: 'Mensagem publicada com sucesso!' });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Canal do RabbitMQ não está disponível' }, { status: 500 })
  }
}