import { connectRabbitMQ } from '@/libs/rabbitmq';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/libs/auth';


export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Obtém o userId da sessão
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : undefined;

    // Se o payload contém dados de blisters (array com boxId e blisters), adiciona userId
    if (Array.isArray(data) && data.length >= 2 && typeof data[0] === 'string' && Array.isArray(data[1])) {
      // Formato: [boxId, blisters[]]
      const payloadWithUserId = {
        boxId: data[0],
        blisters: data[1],
        userId: userId
      };
      
      console.log("[API /send] Adicionando userId ao payload:", userId);
      const dataStr = JSON.stringify(payloadWithUserId);
      
      const channel = await connectRabbitMQ();
      channel.sendToQueue('fila_recebimento', Buffer.from(dataStr), { persistent: true });
      return NextResponse.json({ message: 'Mensagem publicada com sucesso!', userId });
    } else {
      // Para outros tipos de mensagem, adiciona userId se não existir
      const payloadWithUserId = {
        ...data,
        ...(userId && !data.userId ? { userId } : {})
      };
      
      if (userId && !data.userId) {
        console.log("[API /send] Adicionando userId ao payload:", userId);
      }
      
      const dataStr = JSON.stringify(payloadWithUserId);
      const channel = await connectRabbitMQ();
      channel.sendToQueue('fila_recebimento', Buffer.from(dataStr), { persistent: true });
      return NextResponse.json({ message: 'Mensagem publicada com sucesso!' });
    }
  } catch (error) {
    console.error('[API /send] Erro:', error);
    return NextResponse.json({ error: 'Canal do RabbitMQ não está disponível' }, { status: 500 })
  }
}