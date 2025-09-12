// Admin > Produtos: listagem de ProductType com detalhes de Box/Blister e histórico
// Protegido e com edição via Server Actions. Auditoria integrada.

import db from "@/providers/database";
import Link from "next/link";
import { requireAdmin } from "@/shared/auth/permissions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader as DHeader, DialogTitle as DTitle, DialogDescription as DDesc } from "@/components/ui/dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";


import { updateProductPackaging } from "./actions";
import ProductEditForm from "./ProductEditForm";


export const dynamic = "force-dynamic";
async function saveProductPackaging(formData: FormData) {
  "use server";
  return await updateProductPackaging(formData);
}


function humanizeAction(a: string): string {
  const map: Record<string, string> = {
    UPDATE_PRODUCT_TYPE: "Atualizar Produto",
    UPDATE_BOX_TYPE: "Atualizar Caixa",
    UPDATE_BLISTER_TYPE: "Atualizar Blister",
  };
  return map[a] || a;
}

function humanizeEntity(e: string): string {
  const map: Record<string, string> = {
    ProductType: "Produto",
    BoxType: "Caixa",
    BlisterType: "Blister",
  };
  return map[e] || e;
}

function collectChanges(a: any, b: any, prefix = ""): Array<{ path: string; before: any; after: any }> {
  const changes: Array<{ path: string; before: any; after: any }> = [];
  const keys = new Set([...(a ? Object.keys(a) : []), ...(b ? Object.keys(b) : [])]);
  for (const k of Array.from(keys)) {
    if (k === "id") continue; // não exibir linhas de id
    const va = a ? a[k] : undefined;
    const vb = b ? b[k] : undefined;
    const path = prefix ? `${prefix}.${k}` : k;
    const isObjA = va && typeof va === "object" && !Array.isArray(va);
    const isObjB = vb && typeof vb === "object" && !Array.isArray(vb);
    if (isObjA || isObjB) {
      changes.push(...collectChanges(va || {}, vb || {}, path));
    } else if (va !== vb) {
      changes.push({ path, before: va, after: vb });
    }
  }
  return changes;
}

function humanizeChangePath(p: string): string {
  const map: Record<string, string> = {
    name: "Nome",
    slots: "Slots",
    limitPerBox: "Blister por caixa",
  };
  return map[p] || p;
}

async function getLatestOpConfigForProduct(productTypeId: number) {
  const op = await db.op.findFirst({
    where: { productTypeId },
    orderBy: { createdAt: "desc" },
    include: {
      box: { select: { id: true, name: true } },
      blister: { select: { id: true, name: true, slots: true, limitPerBox: true } },
    },
  });
  return op;
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  // Mantemos a seção /admin restrita a ADMIN para ser consistente com o restante do painel


  await requireAdmin();

  const sp = (searchParams || {}) as Record<string, any>;
  const qProduct = String(sp.qProduct ?? "").trim();
  const qBox = String(sp.qBox ?? "").trim();
  const qBlister = String(sp.qBlister ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? 1));
  const perPage = Math.min(50, Math.max(5, Number(sp.perPage ?? 10)));
  const logPage = Math.max(1, Number(sp.logPage ?? 1));
  const logPerPage = 10;

  const where: any = {};
  if (qProduct) where.name = { contains: qProduct, mode: "insensitive" };
  if (qBox || qBlister) {
    where.Op = { some: {} };
    if (qBox) (where.Op.some as any).box = { name: { contains: qBox, mode: "insensitive" } };
    if (qBlister) (where.Op.some as any).blister = { name: { contains: qBlister, mode: "insensitive" } };
  }

  const [productNameOptions, boxNameOptions, blisterNameOptions, totalProducts] = await Promise.all([
    db.productType.findMany({ distinct: ["name"], select: { name: true }, orderBy: { name: "asc" } }),
    db.boxType.findMany({ distinct: ["name"], select: { name: true }, orderBy: { name: "asc" } }),
    db.blisterType.findMany({ distinct: ["name"], select: { name: true }, orderBy: { name: "asc" } }),
    db.productType.count({ where }),
  ]);

  const products = await db.productType.findMany({
    where,
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
    skip: (page - 1) * perPage,
    take: perPage,
  });

  // Para simplicidade, buscamos as configs mais recentes por produto
  const configs = await Promise.all(
    products.map(async (p) => {
      const op = await getLatestOpConfigForProduct(p.id);
      const whereLogs = op
        ? {
            OR: [
              { entity: "BoxType", entityId: String(op.box.id) },
              { entity: "BlisterType", entityId: String(op.blister.id) },
              { entity: "ProductType", entityId: String(p.id) },
            ],
          }
        : undefined;
      const [logs, logsCount] = whereLogs



        ? await Promise.all([
            db.auditLog.findMany({
              where: whereLogs,
              orderBy: { createdAt: "desc" },
              skip: (logPage - 1) * logPerPage,
              take: logPerPage,
              include: { user: { select: { id: true, username: true, email: true } } },
            }),
            db.auditLog.count({ where: whereLogs }),
          ])
        : [[], 0];
      return { p, op, logs, logsCount } as const;
    })
  );

  const totalPages = Math.max(1, Math.ceil(totalProducts / perPage));
  function hrefWith(changes: Record<string, string | number | undefined>) {
    const qp = new URLSearchParams();
    if (qProduct) qp.set("qProduct", qProduct);
    if (qBox) qp.set("qBox", qBox);
    if (qBlister) qp.set("qBlister", qBlister);
    qp.set("page", String(page));
    qp.set("perPage", String(perPage));
    qp.set("logPage", String(logPage));

    for (const [k, v] of Object.entries(changes)) {
      if (v === undefined || v === "") qp.delete(k);
      else qp.set(k, String(v));
    }
    return `/admin/products?${qp.toString()}`;
  }


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Produtos</h1>
          <p className="text-sm text-muted-foreground">Listagem de Produtos com detalhes de embalagem e histórico.</p>
        </div>
        <Button asChild variant="outline"><Link href="/admin">Voltar</Link></Button>
      </div>




      {/* Filtros: Produto, Caixa, Blister (combobox com busca) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground pr-1">Filtros:</span>

        {/* Produto */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="justify-start">{qProduct || "Produto"}</Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-64">
            <Command>
              <CommandInput placeholder="Buscar produto..." />
              <CommandEmpty>Nenhum resultado.</CommandEmpty>
              <CommandGroup>
                <CommandItem asChild>
                  <Link href={hrefWith({ qProduct: "", page: 1 })}>Limpar</Link>
                </CommandItem>
                {productNameOptions.map((o) => (
                  <CommandItem key={o.name} asChild>
                    <Link href={hrefWith({ qProduct: o.name, page: 1 })}>{o.name}</Link>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Caixa */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="justify-start">{qBox || "Caixa"}</Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-64">
            <Command>
              <CommandInput placeholder="Buscar caixa..." />
              <CommandEmpty>Nenhum resultado.</CommandEmpty>
              <CommandGroup>
                <CommandItem asChild>
                  <Link href={hrefWith({ qBox: "", page: 1 })}>Limpar</Link>
                </CommandItem>
                {boxNameOptions.map((o) => (
                  <CommandItem key={o.name} asChild>
                    <Link href={hrefWith({ qBox: o.name, page: 1 })}>{o.name}</Link>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Blister */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="justify-start">{qBlister || "Blister"}</Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-64">
            <Command>
              <CommandInput placeholder="Buscar blister..." />
              <CommandEmpty>Nenhum resultado.</CommandEmpty>
              <CommandGroup>
                <CommandItem asChild>
                  <Link href={hrefWith({ qBlister: "", page: 1 })}>Limpar</Link>
                </CommandItem>
                {blisterNameOptions.map((o) => (
                  <CommandItem key={o.name} asChild>
                    <Link href={hrefWith({ qBlister: o.name, page: 1 })}>{o.name}</Link>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produtos</CardTitle>



          <CardDescription>Veja detalhes e histórico; edite Caixa/Blister conforme necessário.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((item) => {
                const { p, op } = item as any;
                return (
                <TableRow key={p.id}>
                  <TableCell>#{p.id}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{p.code}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="secondary" size="sm">Ver detalhes</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xl">
                          <DHeader>
                            <DTitle>Detalhes de produto</DTitle>
                            <DDesc>Produto: {p.name} (#{p.id})</DDesc>
                          </DHeader>
                          {op ? (
                            <div className="space-y-4">
                              <div>
                                <div className="text-xs text-muted-foreground">Caixa</div>
                                <div className="text-sm">#{op.box.id} • Nome atual: {op.box.name}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Blister</div>
                                <div className="text-sm">#{op.blister.id} • Nome atual: {op.blister.name}</div>
                                <div className="text-xs">Slots: {op.blister.slots} • Blister por caixa: {op.blister.limitPerBox}</div>
                              </div>

                              <ProductEditForm
                                action={saveProductPackaging}
                                product={{ id: p.id, name: p.name }}
                                box={{ id: op.box.id, name: op.box.name }}
                                blister={{ id: op.blister.id, name: op.blister.name, slots: op.blister.slots, limitPerBox: op.blister.limitPerBox }}
                              />
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">Nenhuma OP encontrada para este produto para determinar Box/Blister vinculados.</div>
                          )}
                        </DialogContent>
                      </Dialog>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">Histórico</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-5xl">
                          <DHeader>
                            <DTitle>Histórico de edições</DTitle>
                            <DDesc>{p.name} • alterações em Produto/Caixa/Blister</DDesc>
                          </DHeader>
                          {op ? (
                            <div className="space-y-3">
                              {(() => {
                                // logs pré-carregados na coleta acima


                                const logs = (configs.find((c) => (c as any).p.id === p.id) as any)?.logs as any[];
                                if (!logs || logs.length === 0) {
                                  return <div className="text-sm text-muted-foreground">Sem edições registradas.</div>;
                                }
                                return (
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Quando</TableHead>
                                        <TableHead>Usuário</TableHead>
                                        <TableHead>Ação</TableHead>
                                        <TableHead>Entidade</TableHead>
                                        <TableHead>Detalhes</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {logs.map((l) => (
                                        <TableRow key={l.id}>
                                          <TableCell className="whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</TableCell>
                                          <TableCell>{l.user?.username || l.user?.email || l.userId}</TableCell>
                                          <TableCell>{humanizeAction(l.action)}</TableCell>
                                          <TableCell>{humanizeEntity(l.entity)} #{l.entityId}</TableCell>
                                          <TableCell>
                                            {(() => {
                                              const ch = collectChanges(l.before, l.after);
                                              return ch.length ? (
                                                <div className="max-h-40 overflow-auto border rounded">
                                                  <table className="w-full text-xs">
                                                    <tbody>
                                                      {ch.map((c) => (
                                                        <tr key={c.path} className="align-top">
                                                          <td className="px-2 py-1 font-medium whitespace-nowrap">{humanizeChangePath(c.path)}</td>
                                                          <td className="px-2 py-1 text-muted-foreground">{String(c.before)}</td>
                                                          <td className="px-2 py-1">→</td>
                                                          <td className="px-2 py-1">{String(c.after)}</td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              ) : (
                                                <span className="text-xs text-muted-foreground">Sem diferenças</span>
                                              );
                                            })()}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                );
                                {(() => {
                                  const cfg = configs.find((c) => (c as any).p.id === p.id) as any;
                                  const lcount = cfg?.logsCount ?? 0;
                                  const lpages = Math.max(1, Math.ceil(lcount / logPerPage));
                                  return (
                                    <div className="mt-2 flex justify-end">
                                      <Pagination>
                                        <PaginationContent>
                                          <PaginationItem>
                                            <PaginationPrevious
                                              href={hrefWith({ logPage: Math.max(1, logPage - 1) })}
                                              className={logPage <= 1 ? "pointer-events-none opacity-50" : ""}
                                            />
                                          </PaginationItem>
                                          <PaginationItem>
                                            <div className="text-xs text-muted-foreground px-2">Página {logPage} de {lpages}</div>
                                          </PaginationItem>

                                          <PaginationItem>


                                            <PaginationNext
                                              href={hrefWith({ logPage: Math.min(lpages, logPage + 1) })}
                                              className={logPage >= lpages ? "pointer-events-none opacity-50" : ""}
                                            />
                                          </PaginationItem>
                                        </PaginationContent>
                                      </Pagination>
                                    </div>
                                  );
                                })()}

                              })()}
                              <div className="text-right">
                                <Button asChild variant="ghost" size="sm">
                                  <Link href={`/admin/audit`}>Ver na auditoria</Link>
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">Sem OP vinculada para localizar Box/Blister deste produto.</div>
                          )}


                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>

          {/* Paginação da lista de produtos */}
          <div className="mt-4 flex justify-end">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={hrefWith({ page: Math.max(1, page - 1) })}
                    className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                <PaginationItem>
                  <div className="text-xs text-muted-foreground px-2">Página {page} de {totalPages}</div>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href={hrefWith({ page: Math.min(totalPages, page + 1) })}
                    className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}

