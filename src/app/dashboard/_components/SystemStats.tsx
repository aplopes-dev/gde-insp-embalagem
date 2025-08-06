'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Server, 
  Database, 
  Wifi, 
  Monitor, 
  CheckCircle2, 
  AlertCircle,
  Activity,
  Users,
  Clock,
  TrendingUp
} from 'lucide-react'

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
  system?: {
    cpu_usage?: number
    memory_usage?: number
    disk_usage?: number
    network_status?: string
  }
}

interface DeviceStats {
  device_id: string
  frames_processed: number
  frames_served: number
  clients_connected: number
  uptime: string
}

interface SystemStatsProps {
  orchestratorStatus: OrchestratorStatus
  deviceStats: Record<string, DeviceStats>
  serverIP: string
}

export default function SystemStats({ orchestratorStatus, deviceStats, serverIP }: SystemStatsProps) {
  // Calcular estatísticas agregadas
  const totalFramesProcessed = Object.values(deviceStats).reduce((sum, stats) => sum + stats.frames_processed, 0)
  const totalFramesServed = Object.values(deviceStats).reduce((sum, stats) => sum + stats.frames_served, 0)
  const totalClients = Object.values(deviceStats).reduce((sum, stats) => sum + stats.clients_connected, 0)
  
  const onlineDevices = Object.values(orchestratorStatus.devices).filter(
    device => device.status === 'connected' || device.status === 'streaming'
  ).length
  
  const streamingDevices = Object.values(orchestratorStatus.devices).filter(
    device => device.status === 'streaming'
  ).length

  const systemEfficiency = totalFramesProcessed > 0 ? (totalFramesServed / totalFramesProcessed) * 100 : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* System Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Server className="h-4 w-4" />
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Orchestrator</span>
              <Badge variant={orchestratorStatus.running ? "default" : "destructive"}>
                {orchestratorStatus.running ? (
                  <><CheckCircle2 className="h-3 w-3 mr-1" /> Online</>
                ) : (
                  <><AlertCircle className="h-3 w-3 mr-1" /> Offline</>
                )}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Serviços Core</span>
              <Badge variant={orchestratorStatus.core_services_running ? "default" : "destructive"}>
                {orchestratorStatus.core_services_running ? (
                  <><CheckCircle2 className="h-3 w-3 mr-1" /> Rodando</>
                ) : (
                  <><AlertCircle className="h-3 w-3 mr-1" /> Parados</>
                )}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Rede</span>
              <Badge variant="default">
                <Wifi className="h-3 w-3 mr-1" />
                {serverIP}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Dispositivos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total</span>
              <span className="text-2xl font-bold">{orchestratorStatus.devices_count}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Online</span>
              <Badge variant="default">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {onlineDevices}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Transmitindo</span>
              <Badge variant="default">
                <Activity className="h-3 w-3 mr-1" />
                {streamingDevices}
              </Badge>
            </div>

            {/* Device Status Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Disponibilidade</span>
                <span>{orchestratorStatus.devices_count > 0 ? Math.round((onlineDevices / orchestratorStatus.devices_count) * 100) : 0}%</span>
              </div>
              <Progress 
                value={orchestratorStatus.devices_count > 0 ? (onlineDevices / orchestratorStatus.devices_count) * 100 : 0} 
                className="h-2" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Frames Processados</span>
              <span className="text-lg font-semibold">{totalFramesProcessed.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Frames Servidos</span>
              <span className="text-lg font-semibold">{totalFramesServed.toLocaleString()}</span>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Eficiência</span>
                <span>{systemEfficiency.toFixed(1)}%</span>
              </div>
              <Progress value={systemEfficiency} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Connections */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Conexões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Clientes Ativos</span>
              <span className="text-2xl font-bold">{totalClients}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Média por Device</span>
              <span className="text-lg font-semibold">
                {onlineDevices > 0 ? (totalClients / onlineDevices).toFixed(1) : '0'}
              </span>
            </div>

            {/* Connection Distribution */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Distribuição por Device</div>
              {Object.entries(deviceStats).map(([deviceId, stats]) => (
                <div key={deviceId} className="flex items-center justify-between text-xs">
                  <span>{deviceId}</span>
                  <Badge variant="outline" className="text-xs">
                    {stats.clients_connected}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Resources (if available) */}
      {orchestratorStatus.system && (
        <Card className="md:col-span-2 lg:col-span-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Recursos do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {orchestratorStatus.system.cpu_usage !== undefined && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>CPU</span>
                    <span>{orchestratorStatus.system.cpu_usage.toFixed(1)}%</span>
                  </div>
                  <Progress value={orchestratorStatus.system.cpu_usage} className="h-2" />
                </div>
              )}
              
              {orchestratorStatus.system.memory_usage !== undefined && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Memória</span>
                    <span>{orchestratorStatus.system.memory_usage.toFixed(1)}%</span>
                  </div>
                  <Progress value={orchestratorStatus.system.memory_usage} className="h-2" />
                </div>
              )}
              
              {orchestratorStatus.system.disk_usage !== undefined && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Disco</span>
                    <span>{orchestratorStatus.system.disk_usage.toFixed(1)}%</span>
                  </div>
                  <Progress value={orchestratorStatus.system.disk_usage} className="h-2" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
