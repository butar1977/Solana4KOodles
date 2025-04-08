module.exports = {
  attachServer(server) {
    this.io = require("socket.io")(server, {
      cors: {
        origin: "*",
        methods: "*",
      },
    });
  },
  getIoInstance() {
    return this.io;
  },
  emit(socketId, event, args) {
    if (!socketId) return;
    const socket = this.io.sockets.sockets.get(socketId);
    if (!socket) return;
    socket.emit(event, args);
  },
};
