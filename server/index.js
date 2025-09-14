const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// Create an HTTP server for Express
const server = http.createServer(app);

// Socket.IO server attached to the same HTTP server
const io = new Server(server, {
  cors: {  origin: "http://localhost:3000", // your frontend origin
    methods: ["GET", "POST"], credentials: true
  }, // allow CORS for testing, adjust in production
});

const emailToSocketMapping = new Map();
const socketToEmailMapping = new Map();

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  // 1) Join a room
  socket.on("join-room", ({ roomId, emailId }) => {
    console.log(`User ${emailId} joined room ${roomId}`);
    emailToSocketMapping.set(emailId, socket.id);
    socketToEmailMapping.set(socket.id, emailId);
    socket.join(roomId);
    socket.emit("joined-room", { roomId });
    socket.broadcast.to(roomId).emit("user-joined", { emailId });
  });

  // 2) Caller sends an offer to callee
  socket.on("call-user", ({ emailId, offer }) => {
    const socketId = emailToSocketMapping.get(emailId);
    const fromEmail = socketToEmailMapping.get(socket.id);
    if (socketId) {
      socket.to(socketId).emit("incomming-call", { from: fromEmail, offer });
    }
  });

  // 3) Callee accepts and sends answer back
  socket.on("call-accepted", ({ emailId, ans }) => {
    const socketId = emailToSocketMapping.get(emailId);
    if (socketId) {
      socket.to(socketId).emit("call-accepted", { ans });
    }
  });

  // 4) ICE candidate forwarding
  socket.on("ice-candidate", ({ emailId, candidate }) => {
    const socketId = emailToSocketMapping.get(emailId);
    if (socketId && candidate) {
      socket.to(socketId).emit("ice-candidate", { candidate });
    }
  });

  // 5) Chat messages
  socket.on("chat-message", ({ emailId, message }) => {
    const socketId = emailToSocketMapping.get(emailId);
    const from = socketToEmailMapping.get(socket.id);
    if (socketId) {
      socket.to(socketId).emit("chat-message", { from, message });
    }
  });

  // 6) Toggle video
  socket.on("toggle-video", ({ emailId, isVideoPaused }) => {
    const socketId = emailToSocketMapping.get(emailId);
    if (socketId) {
      socket.to(socketId).emit("toggle-video", { isVideoPaused });
    }
  });

  // 7) Toggle audio
  socket.on("toggle-audio", ({ roomId, isMuted }) => {
    socket.to(roomId).emit("remote-audio-toggled", { isMuted });
  });

  // 8) End call
  socket.on("end-call", ({ roomId }) => {
    socket.to(roomId).emit("remote-call-ended");
  });

  // Cleanup on disconnect
  socket.on("disconnect", () => {
    const emailId = socketToEmailMapping.get(socket.id);
    emailToSocketMapping.delete(emailId);
    socketToEmailMapping.delete(socket.id);
    console.log("Disconnected:", socket.id, emailId);
  });
});

// Express route example
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Use one port for both Express & Socket.IO
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});











