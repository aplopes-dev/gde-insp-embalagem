import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductTypesTable } from "../_components/product-types-table";
import { BoxTypesTable } from "../_components/box-types-table";
import { BlisterTypesTable } from "../_components/blister-types-table";
import { OpsTable } from "../_components/ops-table";
import { OpBoxesTable } from "../_components/op-boxes-table";
import { OpBoxBlistersTable } from "../_components/op-box-blisters-table";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DatabasePage() {
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
              href="/admin"
              className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Banco de Dados
            </h1>
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            ⚠️ <strong>Atenção:</strong> Esta área permite gerenciar dados do banco de dados. Tenha cuidado ao deletar registros, pois essa ação não poderá ser desfeita.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="box-types">Tipos de Caixa</TabsTrigger>
            <TabsTrigger value="blister-types">Tipos de Blister</TabsTrigger>
            <TabsTrigger value="ops">OPs</TabsTrigger>
            <TabsTrigger value="op-boxes">Caixas</TabsTrigger>
            <TabsTrigger value="op-blisters">Blisters</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ProductTypesTable />
          </TabsContent>

          <TabsContent value="box-types">
            <BoxTypesTable />
          </TabsContent>

          <TabsContent value="blister-types">
            <BlisterTypesTable />
          </TabsContent>

          <TabsContent value="ops">
            <OpsTable />
          </TabsContent>

          <TabsContent value="op-boxes">
            <OpBoxesTable />
          </TabsContent>

          <TabsContent value="op-blisters">
            <OpBoxBlistersTable />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

