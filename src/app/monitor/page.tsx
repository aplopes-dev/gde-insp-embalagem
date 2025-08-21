"use client";

import React, { useEffect, useState } from "react";

// Esta página lista as instâncias (óculos) conhecidas e monta webviews (iframes)
// para monitoramento central com links para os dashboards individuais

type InstanceInfo = {
  instanceId: string;
  frontUrl: string;
};

export default function MonitorPage() {
  const [instances, setInstances] = useState<InstanceInfo[]>([]);

  useEffect(() => {
    // Descoberta simples: se você tiver um endpoint para listar instâncias ativas
    // substitua por fetch("/api/instances")
    // Por ora, tenta descobrir a partir do host e faixas de portas conhecidas (opcional)
    // Recomendado: implementar um /api/instances que leia deploy/instances no servidor
  }, []);

  // Exemplo: permite adicionar manualmente instâncias (para testes)
  const [manualId, setManualId] = useState("");
  const [manualUrl, setManualUrl] = useState("");

  const addInstance = () => {
    if (!manualId || !manualUrl) return;
    setInstances((prev) =>
      prev.find((i) => i.instanceId === manualId)
        ? prev
        : [...prev, { instanceId: manualId, frontUrl: manualUrl }]
    );
    setManualId("");
    setManualUrl("");
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Central de Monitoramento (Óculos)</h1>

      <div className="flex items-center gap-2">
        <input
          className="border px-2 py-1 rounded"
          placeholder="INSTANCE_ID (rw-...)"
          value={manualId}
          onChange={(e) => setManualId(e.target.value)}
        />
        <input
          className="border px-2 py-1 rounded flex-1"
          placeholder="Front URL (http://ip:porta)"
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
        />
        <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={addInstance}>
          Adicionar
        </button>
      </div>

      {instances.length === 0 ? (
        <div className="text-gray-600">Nenhuma instância adicionada. Informe manualmente ou implemente descoberta.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {instances.map((inst) => (
            <div key={inst.instanceId} className="border rounded overflow-hidden">
              <div className="p-2 flex justify-between items-center bg-gray-100">
                <div className="font-semibold">{inst.instanceId}</div>
                <a className="text-blue-600 underline" href={inst.frontUrl} target="_blank" rel="noreferrer">
                  Abrir individual
                </a>
              </div>
              <iframe src={inst.frontUrl} className="w-full h-[360px] border-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

