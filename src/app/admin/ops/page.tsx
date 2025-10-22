import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3 } from "lucide-react";
import db from "@/providers/database";

export const dynamic = "force-dynamic";

export default async function OpsControlPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || user.role !== "SUPERVISOR") {
    redirect("/");
  }

  // Buscar todas as OPs
  const ops = await db.op.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Painel de Controle - OPs
            </h1>
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-800 dark:text-green-200">
            ✓ <strong>Selecione uma OP</strong> para visualizar o painel de controle com estatísticas e histórico de ações.
          </p>
        </div>

        {/* OPs Grid */}
        {ops.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Nenhuma OP encontrada no sistema.
                </p>
                <Link href="/admin/database">
                  <Button variant="outline">
                    Ir para Banco de Dados
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ops.map((op) => (
              <Card key={op.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{op.code}</CardTitle>
                  <CardDescription>ID: {op.id}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Quantidade:</span>
                      <span className="font-semibold">{op.quantityToProduce}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      <span className={`font-semibold px-2 py-1 rounded text-xs ${
                        op.status === "PENDING"
                          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200"
                          : op.status === "COMPLETED"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                      }`}>
                        {op.status === "PENDING" ? "Pendente" : op.status === "COMPLETED" ? "Concluída" : op.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Criado em:</span>
                      <span className="text-xs">
                        {new Date(op.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    {op.finishedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Finalizado em:</span>
                        <span className="text-xs">
                          {new Date(op.finishedAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    )}
                  </div>

                  <Link href={`/admin/ops/${op.id}/dashboard`} className="w-full">
                    <Button className="w-full gap-2 bg-green-600 hover:bg-green-700">
                      <BarChart3 className="w-4 h-4" />
                      Abrir Painel
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

