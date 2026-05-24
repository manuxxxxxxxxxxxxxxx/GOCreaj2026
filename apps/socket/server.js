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
