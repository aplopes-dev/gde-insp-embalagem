// Painel administrativo (placeholder inicial)
// Protegido via middleware: requer role ADMIN

export default function AdminHome() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Administração</h1>
      <p className="mt-2 text-sm text-gray-600">
        Este é um placeholder do painel administrativo. Em próximas entregas, aqui
        adicionaremos: gestão de usuários, permissões (RBAC), auditoria e catálogo.
      </p>
    </div>
  );
}

