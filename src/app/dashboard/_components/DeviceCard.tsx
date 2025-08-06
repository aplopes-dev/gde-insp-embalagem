'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Monitor, 
  Wifi, 
  WifiOff, 
  Users, 
  Clock, 
  Activity,
  Maximize2,
  Settings,
  AlertCircle,
  CheckCircle2,
  Camera,
  Zap,
  TrendingUp
} from 'lucide-react'

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

interface DeviceCardProps {
  deviceId: string
  device: DeviceStatus
  stats?: DeviceStats
  serverIP: string
}

export default function DeviceCard({ deviceId, device, stats, serverIP }: DeviceCardProps) {
  const [imageError, setImageError] = useState(false)
  const [streamKey, setStreamKey] = useState(0) // Para forçar reload da imagem
  
  const isOnline = device.status === 'connected' || device.status === 'streaming'
  const videoUrl = `http://${serverIP}:${device.video_port}/stream?t=${streamKey}`
  
  // Refresh stream a cada 30 segundos para evitar cache
  useEffect(() => {
    if (isOnline) {
      const interval = setInterval(() => {
        setStreamKey(prev => prev + 1)
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [isOnline])

  // Calcular métricas
  const frameRate = stats ? (stats.frames_processed / (parseUptime(stats.uptime) || 1)) : 0
  const efficiency = stats && stats.frames_processed > 0 
    ? (stats.frames_served / stats.frames_processed) * 100 
    : 0

  function parseUptime(uptime: string): number {
    if (!uptime) return 0
    const parts = uptime.split(':')
    if (parts.length !== 3) return 0
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2])
  }

  function formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'streaming': return 'bg-green-500'
      case 'connected': return 'bg-blue-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'streaming': return 'Transmitindo'
      case 'connected': return 'Conectado'
      case 'error': return 'Erro'
      default: return 'Desconectado'
    }
  }

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
      {/* Status indicator */}
      <div className={`absolute top-0 left-0 w-full h-1 ${getStatusColor(device.status)}`} />
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            {deviceId}
          </CardTitle>
          <Badge variant={isOnline ? "default" : "destructive"}>
            {isOnline ? (
              <><CheckCircle2 className="h-3 w-3 mr-1" /> {getStatusText(device.status)}</>
            ) : (
              <><AlertCircle className="h-3 w-3 mr-1" /> Offline</>
            )}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{device.ip_address}</span>
          <span>{device.video_device}</span>
        </div>
        
        {device.model && (
          <div className="text-xs text-muted-foreground">
            {device.model} • {device.serial}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Video Stream */}
        <div className="aspect-video bg-black rounded-lg overflow-hidden relative group">
          {isOnline && !imageError ? (
            <>
              <img 
                src={videoUrl}
                alt={`Stream ${deviceId}`}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(`http://${serverIP}:${device.video_port}`, '_blank')}
                  >
                    <Maximize2 className="h-4 w-4 mr-2" />
                    Fullscreen
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setStreamKey(prev => prev + 1)}
                  >
                    <Activity className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Live indicator */}
              <div className="absolute top-2 left-2">
                <Badge variant="destructive" className="text-xs">
                  <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse" />
                  LIVE
                </Badge>
              </div>
              
              {/* Client count */}
              {stats && stats.clients_connected > 0 && (
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    {stats.clients_connected}
                  </Badge>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                {isOnline ? (
                  <>
                    <Camera className="h-8 w-8 mx-auto mb-2" />
                    <p>Carregando stream...</p>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-8 w-8 mx-auto mb-2" />
                    <p>Sem sinal</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Uptime</span>
              </div>
              <div className="text-lg font-semibold">
                {stats.uptime || formatUptime(device.uptime)}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span>Frames</span>
              </div>
              <div className="text-lg font-semibold">
                {stats.frames_processed.toLocaleString()}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span>FPS Médio</span>
              </div>
              <div className="text-lg font-semibold">
                {frameRate.toFixed(1)}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span>Eficiência</span>
              </div>
              <div className="text-lg font-semibold">
                {efficiency.toFixed(0)}%
              </div>
            </div>
          </div>
        )}

        {/* Performance Bar */}
        {stats && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Performance</span>
              <span>{efficiency.toFixed(0)}%</span>
            </div>
            <Progress value={efficiency} className="h-2" />
          </div>
        )}

        {/* Camera Status */}
        <div className="flex items-center gap-2 text-sm">
          <Camera className="h-4 w-4 text-muted-foreground" />
          <span>Câmera:</span>
          <Badge variant={stats?.camera_status === 'connected' ? 'default' : 'destructive'}>
            {stats?.camera_status === 'connected' ? 'Conectada' : 'Desconectada'}
          </Badge>
        </div>

        {/* Last Frame Time */}
        {stats?.last_frame_time && (
          <div className="text-xs text-muted-foreground">
            Último frame: {new Date(stats.last_frame_time).toLocaleTimeString()}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => window.open(`http://${serverIP}:3000?device=${deviceId}`, '_blank')}
          >
            Abrir App
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(`http://${serverIP}:${device.video_port}/stats`, '_blank')}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(`http://${serverIP}:${device.video_port}`, '_blank')}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
