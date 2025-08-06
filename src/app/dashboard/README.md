# 📊 Dashboard Multi-Device - Frontend

Dashboard em tempo real para monitoramento de múltiplos dispositivos RealWear simultaneamente. Interface moderna construída com Next.js, React e Tailwind CSS.

## 🆕 Funcionalidades

### **Visão Geral do Sistema**
- **Status do Orchestrator** em tempo real
- **Serviços Core** (PostgreSQL, RabbitMQ, etc.)
- **Contagem de dispositivos** conectados
- **Métricas de performance** agregadas

### **Monitoramento por Device**
- **Stream de vídeo** em tempo real por device
- **Estatísticas individuais** (frames, clientes, uptime)
- **Status da câmera** e conexão
- **Controles** (abrir app, fullscreen, configurações)

### **Métricas Avançadas**
- **Performance do sistema** (CPU, memória, disco)
- **Eficiência de streaming** por device
- **Distribuição de clientes** conectados
- **Gráficos de progresso** visuais

### **Interface Responsiva**
- **Grid adaptativo** para múltiplos devices
- **Cards interativos** com hover effects
- **Atualização automática** a cada 5 segundos
- **Tema claro/escuro** integrado

## 🚀 Componentes

### **Página Principal (`page.tsx`)**
- **Auto-detecção** do servidor Orchestrator
- **Gerenciamento de estado** com React hooks
- **Atualização automática** em background
- **Tratamento de erros** robusto

### **DeviceCard (`_components/DeviceCard.tsx`)**
- **Stream de vídeo** MJPEG em tempo real
- **Overlay com informações** do device
- **Indicador LIVE** e contagem de clientes
- **Métricas de performance** (FPS, eficiência)
- **Controles interativos** (fullscreen, refresh, configurações)

### **SystemStats (`_components/SystemStats.tsx`)**
- **Visão geral do sistema** com badges de status
- **Métricas agregadas** de todos os devices
- **Gráficos de progresso** para recursos do sistema
- **Distribuição de clientes** por device

## 🎨 Interface

### **Layout Responsivo**
```
┌─────────────────────────────────────────────────────────┐
│ Header: Dashboard Multi-Device + Controles              │
├─────────────────────────────────────────────────────────┤
│ System Stats: 4 cards com métricas principais          │
├─────────────────────────────────────────────────────────┤
│ Device Grid: Cards de devices em grid responsivo       │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                    │
│ │Device 1 │ │Device 2 │ │Device 3 │                    │
│ │Stream   │ │Stream   │ │Stream   │                    │
│ │Stats    │ │Stats    │ │Stats    │                    │
│ │Controls │ │Controls │ │Controls │                    │
│ └─────────┘ └─────────┘ └─────────┘                    │
└─────────────────────────────────────────────────────────┘
```

### **Device Card Detalhado**
```
┌─────────────────────────────────────┐
│ ● Status Bar (verde/vermelho)       │
├─────────────────────────────────────┤
│ 📱 Device ID + Badge Status         │
│ IP Address • Video Device           │
│ Model • Serial (se disponível)      │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │        VIDEO STREAM             │ │
│ │     [LIVE] [Clients: 2]         │ │
│ │                                 │ │
│ │  [Fullscreen] [Refresh]         │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Uptime: 2h 15m    Frames: 12,345   │
│ FPS Médio: 28.5   Eficiência: 95%  │
├─────────────────────────────────────┤
│ Performance: ████████░░ 85%         │
├─────────────────────────────────────┤
│ Câmera: ✅ Conectada                │
│ Último frame: 10:30:45              │
├─────────────────────────────────────┤
│ [Abrir App] [⚙️] [🔍]               │
└─────────────────────────────────────┘
```

## 🔧 Configuração

### **Auto-detecção de Servidor**
O dashboard tenta conectar automaticamente nos IPs:
```typescript
const possibleIPs = [
  'localhost',
  '192.168.0.100', 
  '192.168.1.100',
  '10.0.0.100'
]
```

### **Atualização Automática**
```typescript
// Atualiza a cada 5 segundos
useEffect(() => {
  updateData()
  const interval = setInterval(updateData, 5000)
  return () => clearInterval(interval)
}, [])
```

### **Refresh de Stream**
```typescript
// Refresh stream a cada 30 segundos para evitar cache
useEffect(() => {
  if (isOnline) {
    const interval = setInterval(() => {
      setStreamKey(prev => prev + 1)
    }, 30000)
    return () => clearInterval(interval)
  }
}, [isOnline])
```

## 🌐 Integração

### **URLs Acessadas**
```typescript
// Status do Orchestrator
GET http://{serverIP}:8090/status

// Stats de cada device
GET http://{serverIP}:{videoPort}/stats

// Stream de vídeo
GET http://{serverIP}:{videoPort}/stream

// Interface do video feed
GET http://{serverIP}:{videoPort}/

// App específico do device
GET http://{serverIP}:3000?device={deviceId}
```

### **Estrutura de Dados**
```typescript
interface OrchestratorStatus {
  running: boolean
  core_services_running: boolean
  devices_count: number
  devices: Record<string, DeviceStatus>
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
```

## 🎯 Funcionalidades Interativas

### **Controles por Device**
- **Abrir App**: Abre aplicação específica do device
- **Fullscreen**: Abre stream em tela cheia
- **Configurações**: Abre página de stats do video feed
- **Refresh Stream**: Força atualização do stream

### **Navegação**
- **Link no Header**: Acesso rápido ao dashboard
- **Botão Atualizar**: Refresh manual dos dados
- **Auto-refresh**: Atualização automática em background

### **Estados Visuais**
- **Online/Offline**: Badges coloridos por status
- **Live Indicator**: Indicador piscante para streams ativos
- **Progress Bars**: Barras de progresso para métricas
- **Hover Effects**: Efeitos visuais em cards e botões

## 🔄 Fluxo de Dados

### **Inicialização**
```
Dashboard carrega → Detecta servidor → Busca status → Busca stats → Renderiza
```

### **Atualização Contínua**
```
Timer (5s) → Fetch status → Fetch stats → Update state → Re-render
```

### **Interação do Usuário**
```
Click botão → Abre nova aba → URL específica do device/função
```

## 📱 Responsividade

### **Breakpoints**
- **Mobile**: 1 coluna de devices
- **Tablet**: 2 colunas de devices  
- **Desktop**: 3 colunas de devices
- **Large**: 4 colunas de devices

### **Grid Adaptativo**
```css
grid-cols-1 lg:grid-cols-2 xl:grid-cols-3
```

## 🎨 Estilização

### **Design System**
- **shadcn/ui**: Componentes base
- **Tailwind CSS**: Estilização utilitária
- **Lucide Icons**: Ícones consistentes
- **Radix UI**: Componentes acessíveis

### **Tema**
- **Suporte a tema claro/escuro**
- **Cores semânticas** (verde=online, vermelho=offline)
- **Animações suaves** (hover, loading, progress)

## 🚀 Performance

### **Otimizações**
- **React.memo** para componentes pesados
- **useCallback** para funções de callback
- **Lazy loading** de imagens de stream
- **Debounce** em atualizações frequentes

### **Caching**
- **Stream refresh** periódico para evitar cache
- **Error boundaries** para falhas de componentes
- **Fallback states** para loading e erro
