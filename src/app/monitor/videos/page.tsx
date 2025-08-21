"use client";

import React, { useEffect, useState } from "react";

// Dashboard de monitoramento com video_feed de cada óculos
// Cada instância expõe http://SERVER:DETECTOR_EXTERNAL_PORT/video_feed

type InstanceInfo = {
  instanceId: string;
  videoUrl: string;
};

export default function MonitorVideosPage() {
  const [instances, setInstances] = useState<InstanceInfo[]>([]);
  const [manualId, setManualId] = useState("");
  const [manualUrl, setManualUrl] = useState("");

  useEffect(() => {
    // Auto-popula consultando o endpoint local
    fetch("/api/instances")
      .then((r) => r.json())
      .then((json) => setInstances(json.instances || []))
      .catch(() => {});
  }, []);

  const addInstance = () => {
    if (!manualId || !manualUrl) return;
    setInstances((prev) =>
      prev.find((i) => i.instanceId === manualId)
        ? prev
        : [...prev, { instanceId: manualId, videoUrl: manualUrl }]
    );
    setManualId("");
    setManualUrl("");
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Central de Monitoramento – Vídeos</h1>
      <p className="text-sm text-gray-600">
        Cada card abaixo carrega o /video_feed do backend de uma instância. Você pode adicionar manualmente uma instância informando o INSTANCE_ID e a URL do video_feed.
      </p>

      <div className="flex items-center gap-2">
        <input
          className="border px-2 py-1 rounded"
          placeholder="INSTANCE_ID (rw-...)"
          value={manualId}
          onChange={(e) => setManualId(e.target.value)}
        />
        <input
          className="border px-2 py-1 rounded flex-1"
          placeholder="URL do video_feed (ex.: http://ip:porta/video_feed)"
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
        />
        <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={addInstance}>
          Adicionar
        </button>
      </div>

      {instances.length === 0 ? (
        <div className="text-gray-600">Nenhuma instância adicionada.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {instances.map((inst) => (
            <div key={inst.instanceId} className="border rounded overflow-hidden">
              <div className="p-2 flex justify-between items-center bg-gray-100">
                <div className="font-semibold">{inst.instanceId}</div>
                <a className="text-blue-600 underline" href={inst.videoUrl} target="_blank" rel="noreferrer">
                  Abrir individual
                </a>
              </div>
              {/* Para MJPEG, um <img> direto pode funcionar melhor que iframe */}
              <img src={inst.videoUrl} alt={inst.instanceId} className="w-full h-[360px] object-contain bg-black" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

