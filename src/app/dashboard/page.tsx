/* eslint-disable @next/next/no-img-element */

'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Monitor, LayoutGrid, PanelLeft } from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'

interface InstanceInfo {
  instanceId: string
  frontUrl: string
  videoUrl: string
  statsUrl?: string
}

export default function DashboardPage() {
  const [instances, setInstances] = useState<InstanceInfo[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [loading, setLoading] = useState<boolean>(false)
  const [videoOnly, setVideoOnly] = useState<boolean>(false)

  const updateData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/instances', { cache: 'no-store' })
      const json = await res.json()
      setInstances(json.instances || [])
    } catch {}
    setLastUpdate(new Date())
    setLoading(false)
  }

  useEffect(() => {
    updateData()
    const id = setInterval(updateData, 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard (Central de Vídeos)</h1>
          <p className="text-muted-foreground">Mosaico de streams /video_feed por óculos</p>
          <div className="mt-1">
            <Badge variant="secondary">{instances.length} instâncias ativas</Badge>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">Última atualização: {lastUpdate.toLocaleTimeString()}</div>
          <Toggle
            pressed={videoOnly}
            onPressedChange={(v) => setVideoOnly(!!v)}
            className="mr-2"
            aria-label="Alternar modo vídeo"
            title={videoOnly ? 'Modo vídeos (ativo)' : 'Modo completo'}
          >
            {videoOnly ? <LayoutGrid className="h-4 w-4 mr-2" /> : <PanelLeft className="h-4 w-4 mr-2" />} {videoOnly ? 'Só vídeos' : 'Completo'}
          </Toggle>
          <Button onClick={updateData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <Separator />

      {/* Grid de vídeos */}
      {instances.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Monitor className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma instância detectada</h3>
              <p className="text-muted-foreground">Aguarde alguns instantes ou inicie uma sessão.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={videoOnly ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2" : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"}>
          {instances.map((inst) => (
            <div key={inst.instanceId} className={videoOnly ? "border rounded overflow-hidden" : "border rounded overflow-hidden"}>
              <div className={videoOnly ? "hidden" : "p-2 flex justify-between items-center bg-gray-100"}>
                <div className="font-semibold">{inst.instanceId}</div>
                <div className="flex gap-2 items-center">
                  {inst.statsUrl && (
                    <a className="text-xs text-gray-500 underline" href={inst.statsUrl} target="_blank" rel="noreferrer">stats</a>
                  )}
                  <a href={inst.frontUrl} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm">Visualizar</Button>
                  </a>
                </div>
              </div>
              <Image src={inst.videoUrl} alt={inst.instanceId} width={1280} height={videoOnly ? 440 : 360} className={videoOnly ? "w-full h-[440px] object-contain bg-black" : "w-full h-[360px] object-contain bg-black"} unoptimized />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
