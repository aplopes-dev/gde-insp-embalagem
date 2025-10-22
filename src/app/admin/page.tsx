import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, BarChart3, ArrowRight, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || user.role !== "SUPERVISOR") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Painel de Administração
            </h1>
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-8 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            ℹ️ <strong>Bem-vindo!</strong> Selecione uma das opções abaixo para acessar as funcionalidades de administração.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Banco de Dados Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Database className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <CardTitle>Banco de Dados</CardTitle>
                  <CardDescription>Gerenciar dados do sistema</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Acesse a interface de gerenciamento de dados. Aqui você pode criar, editar e deletar:
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 ml-4">
                <li>✓ Tipos de Produto</li>
                <li>✓ Tipos de Caixa</li>
                <li>✓ Tipos de Blister</li>
                <li>✓ Ordens de Produção (OPs)</li>
                <li>✓ Caixas e Blisters</li>
              </ul>
              <div className="pt-4">
                <Link href="/admin/database" className="w-full">
                  <Button className="w-full gap-2">
                    Acessar Banco de Dados
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-red-600 dark:text-red-400 pt-2">
                ⚠️ Tenha cuidado ao deletar registros, pois essa ação não poderá ser desfeita.
              </p>
            </CardContent>
          </Card>

          {/* Painel de Controle Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-green-600 dark:text-green-400" />
                <div>
                  <CardTitle>Painel de Controle</CardTitle>
                  <CardDescription>Monitorar e rastrear ações</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Acesse o painel de controle para monitorar as atividades das OPs. Você pode:
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 ml-4">
                <li>✓ Visualizar estatísticas em tempo real</li>
                <li>✓ Rastrear inspeções de caixas</li>
                <li>✓ Monitorar criação de peças</li>
                <li>✓ Filtrar por usuário, data e tipo</li>
                <li>✓ Gerar relatórios de auditoria</li>
              </ul>
              <div className="pt-4">
                <Link href="/admin/ops" className="w-full">
                  <Button className="w-full gap-2 bg-green-600 hover:bg-green-700">
                    Acessar Painel de Controle
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 pt-2">
                ✓ Acesso exclusivo para administradores
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

