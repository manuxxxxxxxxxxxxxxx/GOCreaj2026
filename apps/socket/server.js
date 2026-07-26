const { createServer } = require('http');
const { Server }       = require('socket.io');

const PORT = process.env.PORT || 3001;

const httpServer = createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('SVGO Signal Server running\n');
});

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// rooms[roomId] = Set of socket.id
const rooms = {};

io.on('connection', socket => {
  console.log('[signal] connected:', socket.id);

  // ── Presencia / bandeja personal del usuario (para push de mensajes) ─────────
  // Cada usuario se une a su propia sala "user_<id>" al conectar; así el emisor
  // de un mensaje puede empujarlo en tiempo real al receptor sin polling.
  socket.on('join-user', ({ userId }) => {
    if (!userId) return;
    socket.data.userId = userId;
    socket.join(`user_${userId}`);
  });

  // ── Nuevo mensaje de chat (push en tiempo real, la persistencia va por REST) ──
  socket.on('send-message', ({ receptorId, message }) => {
    if (!receptorId || !message) return;
    io.to(`user_${receptorId}`).emit('new-message', message);
  });

  // ── Confirmación de lectura (para pasar de un check a dos en tiempo real) ────
  socket.on('mark-read', ({ otroId, leidoPorId }) => {
    if (!otroId) return;
    io.to(`user_${otroId}`).emit('messages-read', { by: leidoPorId });
  });

  // ── Reacción / eliminación de mensaje (push instantáneo) ─────────────────────
  socket.on('reaction-change', ({ otroId, chatId, emoji, usuarioId }) => {
    if (!otroId) return;
    io.to(`user_${otroId}`).emit('reaction-change', { chatId, emoji, usuarioId });
  });

  socket.on('message-deleted', ({ otroId, chatId }) => {
    if (!otroId) return;
    io.to(`user_${otroId}`).emit('message-deleted', { chatId });
  });

  // ── Sync tri-party de pedidos (Usuario/Vendedor/Repartidor) ───────────────────
  // Los tres se unen a la sala "pedido_<id>" mientras siguen el pedido; PHP sigue
  // siendo la fuente de verdad (persistencia vía REST) — el socket solo empuja un
  // aviso instantáneo a los otros dos para que refresquen, sin esperar su poll.
  socket.on('join-pedido', ({ pedidoId }) => {
    if (!pedidoId) return;
    socket.join(`pedido_${pedidoId}`);
  });

  socket.on('leave-pedido', ({ pedidoId }) => {
    if (!pedidoId) return;
    socket.leave(`pedido_${pedidoId}`);
  });

  // ── Cambio de estado/progreso del pedido (aceptado, en camino, entregado...) ──
  socket.on('pedido-estado-cambio', ({ pedidoId, ...payload }) => {
    if (!pedidoId) return;
    socket.to(`pedido_${pedidoId}`).emit('pedido-estado-cambio', payload);
  });

  // ── Ubicación en vivo del repartidor + ETA/tráfico recalculado ────────────────
  socket.on('pedido-ubicacion', ({ pedidoId, ...payload }) => {
    if (!pedidoId) return;
    socket.to(`pedido_${pedidoId}`).emit('pedido-ubicacion', payload);
  });

  // ── Join a call room ─────────────────────────────────────────────────────────
  socket.on('join-call', ({ room, userId }) => {
    socket.join(room);
    socket.data.room   = room;
    socket.data.userId = userId;

    if (!rooms[room]) rooms[room] = new Set();
    rooms[room].add(socket.id);

    // Tell everyone else in the room that a new peer joined
    socket.to(room).emit('peer-joined', { socketId: socket.id, userId });
    console.log(`[signal] ${userId} joined room ${room}`);
  });

  // ── WebRTC offer (caller → callee) ───────────────────────────────────────────
  socket.on('offer', ({ room, sdp, to }) => {
    const payload = { sdp, from: socket.id, userId: socket.data.userId };
    if (to) {
      io.to(to).emit('offer', payload);
    } else {
      socket.to(room).emit('offer', payload);
    }
  });

  // ── WebRTC answer (callee → caller) ─────────────────────────────────────────
  socket.on('answer', ({ room, sdp, to }) => {
    const payload = { sdp, from: socket.id, userId: socket.data.userId };
    if (to) {
      io.to(to).emit('answer', payload);
    } else {
      socket.to(room).emit('answer', payload);
    }
  });

  // ── ICE candidates ───────────────────────────────────────────────────────────
  socket.on('ice-candidate', ({ room, candidate, to }) => {
    const payload = { candidate, from: socket.id };
    if (to) {
      io.to(to).emit('ice-candidate', payload);
    } else {
      socket.to(room).emit('ice-candidate', payload);
    }
  });

  // ── Hang up ──────────────────────────────────────────────────────────────────
  socket.on('hang-up', ({ room }) => {
    socket.to(room).emit('peer-left', { socketId: socket.id });
    leaveRoom(socket);
  });

  // ── Cleanup on disconnect ────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const room = socket.data.room;
    if (room) socket.to(room).emit('peer-left', { socketId: socket.id });
    leaveRoom(socket);
    console.log('[signal] disconnected:', socket.id);
  });
});

function leaveRoom(socket) {
  const room = socket.data.room;
  if (!room || !rooms[room]) return;
  rooms[room].delete(socket.id);
  if (rooms[room].size === 0) delete rooms[room];
  socket.leave(room);
}

httpServer.listen(PORT, () => {
  console.log(`[signal] listening on :${PORT}`);
});
