import { publishCommand, connectRabbitMQ } from '@/libs/rabbitmq';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/libs/auth';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const userId = (session.user as any).id;

    // Formato legado: array [boxId, blisters[], userId?]
    if (Array.isArray(data)) {
      const [boxId, blisters, providedUserId] = data;
      const payload = { boxId, blisters, userId: providedUserId || userId };
      const ch = await connectRabbitMQ();
      ch.sendToQueue('fila_recebimento', Buffer.from(JSON.stringify(payload)), { persistent: true });
      return NextResponse.json({ message: 'Mensagem publicada com sucesso!' });
    }

    // Formato novo: { device_id, op_id, action, step, payload }
    const { device_id, op_id, action, step, payload: cmdPayload } = data;
    if (!device_id || !op_id) {
      return NextResponse.json({ error: 'device_id e op_id são obrigatórios' }, { status: 400 });
    }

    const command = {
      message_id: randomUUID(),
      device_id,
      op_id,
      action: action ?? 'START_INSPECTION',
      step:   step   ?? 'quantity',
      payload: { ...cmdPayload, ...(userId && !cmdPayload?.userId ? { userId } : {}) },
      timestamp: new Date().toISOString(),
    };

    await publishCommand(device_id, command);
    return NextResponse.json({ message: 'Comando publicado!', message_id: command.message_id });
  } catch {
    return NextResponse.json({ error: 'RabbitMQ indisponível' }, { status: 500 });
  }
}
