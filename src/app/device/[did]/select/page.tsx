import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { redirect } from "next/navigation";
import db from "@/providers/database";
import SelectClient from "./_components/select-client";

export const dynamic = "force-dynamic";

export default async function SelectPage({
  params,
}: {
  params: { did: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const deviceSession = await db.deviceSession.findUnique({
    where: { deviceId: params.did },
    select: {
      qrToken: true,
      qrExpiresAt: true,
      activatedAt: true,
    },
  });

  // Sem sessão → volta para o dashboard para criá-la
  if (!deviceSession) redirect("/dashboard");

  // Já ativado → vai para a tela de inspeção
  if (deviceSession.activatedAt) redirect("/");

  return (
    <SelectClient
      deviceId={params.did}
      qrToken={deviceSession.qrToken}
      qrExpiresAt={deviceSession.qrExpiresAt.toISOString()}
    />
  );
}
