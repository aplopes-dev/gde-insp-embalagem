'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Monitor,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import DeviceCard from './_components/DeviceCard'
import SystemStats from './_components/SystemStats'

interface DeviceStats {
  device_id: string
  video_device: string
  port: number
  uptime: string
  frames_processed: number
  frames_served: number
  clients_connected: number
  last_frame_time: string | null
  camera_status: 'connected' | 'disconnected'
}

interface DeviceStatus {
  device_id: string
  ip_address: string
  video_device: string
  video_port: number
  status: 'connected' | 'streaming' | 'error' | 'disconnected'
  uptime: number
  model?: string
  serial?: string
}

interface OrchestratorStatus {
  running: boolean
  core_services_running: boolean
  devices_count: number
  devices: Record<string, DeviceStatus>
}

export default function DashboardPage() {
  const [orchestratorStatus, setOrchestratorStatus] = useState<OrchestratorStatus | null>(null)
  const [deviceStats, setDeviceStats] = useState<Record<string, DeviceStats>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [serverIP, setServerIP] = useState<string>('localhost')

  // Detectar servidor automaticamente
  const detectServer = async (): Promise<string | null> => {
    const possibleIPs = [
      'localhost',
      '192.168.0.100',
      '192.168.1.100',
      '10.0.0.100'
    ]

    for (const ip of possibleIPs) {
      try {
        const response = await fetch(`http://${ip}:8090/status`, { 
          method: 'GET',
          timeout: 2000 
        } as any)
        if (response.ok) {
          return ip
        }
      } catch (e) {
        continue
      }
    }
    return null
  }

  // Buscar status do orchestrator
  const fetchOrchestratorStatus = async (detectedServerIP: string) => {
    try {
      const response = await fetch(`http://${detectedServerIP}:8090/status`)
      if (!response.ok) throw new Error('Falha ao buscar status do orchestrator')

      const data: OrchestratorStatus = await response.json()
      setOrchestratorStatus(data)
      setServerIP(detectedServerIP)

      // Buscar stats de cada device
      const statsPromises = Object.keys(data.devices).map(async (deviceId) => {
        const device = data.devices[deviceId]
        try {
          const statsResponse = await fetch(`http://${detectedServerIP}:${device.video_port}/stats`)
          if (statsResponse.ok) {
            const stats: DeviceStats = await statsResponse.json()
            return { deviceId, stats }
          }
        } catch (e) {
          console.warn(`Falha ao buscar stats do ${deviceId}:`, e)
        }
        return null
      })

      const statsResults = await Promise.all(statsPromises)
      const newDeviceStats: Record<string, DeviceStats> = {}

      statsResults.forEach(result => {
        if (result) {
          newDeviceStats[result.deviceId] = result.stats
        }
      })

      setDeviceStats(newDeviceStats)
      setError(null)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }

  // Atualizar dados
  const updateData = async () => {
    setLoading(true)
    const serverIP = await detectServer()
    
    if (!serverIP) {
      setError('Servidor Orchestrator não encontrado na rede')
      setLoading(false)
      return
    }

    await fetchOrchestratorStatus(serverIP)
    setLastUpdate(new Date())
    setLoading(false)
  }

  // Efeito para atualização automática
  useEffect(() => {
    updateData()
    const interval = setInterval(updateData, 5000) // Atualizar a cada 5 segundos
    return () => clearInterval(interval)
  }, [])



  if (loading && !orchestratorStatus) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Carregando dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Erro de Conexão</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={updateData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Multi-Device</h1>
          <p className="text-muted-foreground">
            Monitoramento em tempo real dos dispositivos RealWear
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Última atualização: {lastUpdate.toLocaleTimeString()}
          </div>
          <Button onClick={updateData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* System Stats */}
      {orchestratorStatus && (
        <SystemStats
          orchestratorStatus={orchestratorStatus}
          deviceStats={deviceStats}
          serverIP={serverIP}
        />
      )}

      <Separator />

      {/* Devices Grid */}
      {orchestratorStatus && Object.keys(orchestratorStatus.devices).length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {Object.entries(orchestratorStatus.devices).map(([deviceId, device]) => (
            <DeviceCard
              key={deviceId}
              deviceId={deviceId}
              device={device}
              stats={deviceStats[deviceId]}
              serverIP={serverIP}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Monitor className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum dispositivo conectado</h3>
              <p className="text-muted-foreground">
                Conecte um RealWear para começar a usar o sistema
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
