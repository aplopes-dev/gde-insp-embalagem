// Configurações do RabbitMQ e WebSocket
const PORT = 3001
const RABBITMQ_URL = "amqp://admin:admin@localhost:5672"
//const RABBITMQ_URL = "amqp://gde:gde123@10.42.0.209:15672"
const QUEUE_NAME = 'fila_envio';
const { Server } = require('socket.io');
const http = require('http');
const amqp = require('amqplib');

// Cria o servidor HTTP e integra com o socket.io
const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*", // Permite conexões de qualquer origem, ajuste conforme necessário
    methods: ["GET", "POST"],
  },
});



// Função para conectar ao RabbitMQ e consumir a fila
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, { durable: true });

    console.log(`Conectado à fila ${QUEUE_NAME}`);

    // Consome mensagens da fila
    channel.consume(QUEUE_NAME, (msg) => {
      if (msg !== null) {
        const message = msg.content.toString();
        console.log(`Mensagem recebida da fila: ${message}`);

        // Emite para todos os clientes conectados via socket.io
        io.emit('detectionUpdate', { ...JSON.parse(message) });
        channel.ack(msg); // Confirma o processamento da mensagem
      }
    });
  } catch (error) {
    console.error('Erro ao conectar ao RabbitMQ:', error);
  }
}


// Configura eventos do socket.io
io.on('connection', (socket) => {
  console.log('Novo cliente conectado via socket.io');

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

// Inicia o servidor HTTP com socket.io e o RabbitMQ
server.listen(PORT, () => {
  console.log(`Servidor WebSocket com socket.io escutando na porta ${PORT}`);
  connectRabbitMQ();
});

// // Set up an event listener for new client connections
// io.on('connection', (socket) => {
//   console.log("User connected!");

//   socket.on("detectionUpdate", (data) => {
//  // Broadcast a 'detectionUpdate' event to all connected clients with a message
//       io.emit("detectionUpdate", data)
//       console.log("detectionUpdate", data);
//     })
    
//     socket.on("iaHandler", (data) => {
//       // Broadcast a 'iaHandler' event to all connected clients with a message
//       io.emit("iaHandler", data)
//       console.log("iaHandler", data);
//     })
// })
