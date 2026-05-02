import { publishCommand, connectRabbitMQ } from '@/libs/rabbitmq';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/libs/auth';
import { randomUUID } from 'crypto';
import db from '@/providers/database';

const LOCK_TIMEOUT_MS =
  parseInt(process.env.OPBOX_LOCK_TIMEOUT_MINUTES ?? '10') * 60 * 1000;

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

    // Lock de OpBox — só verificado quando o caller envia opBoxId no payload
    const opBoxId: string | undefined = cmdPayload?.opBoxId;
    if (opBoxId) {
      const opBox = await db.opBox.findUnique({
        where: { id: opBoxId },
        select: { id: true, assignedDeviceId: true, assignedAt: true, status: true },
      });

      if (!opBox) {
        return NextResponse.json({ error: 'OpBox não encontrada' }, { status: 404 });
      }

      const lockExpired =
        !opBox.assignedAt ||
        Date.now() - opBox.assignedAt.getTime() > LOCK_TIMEOUT_MS;

      if (opBox.assignedDeviceId && opBox.assignedDeviceId !== device_id && !lockExpired) {
        return NextResponse.json(
          { error: 'OpBox em uso por outro device', assignedDeviceId: opBox.assignedDeviceId },
          { status: 409 }
        );
      }

      // Atribuir (ou renovar) o lock
      await db.opBox.update({
        where: { id: opBoxId },
        data: { assignedDeviceId: device_id, assignedAt: new Date() },
      });
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
