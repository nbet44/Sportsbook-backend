const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors')({ origin: true });
const app = express();
const server = require("http").Server(app);
// const io = require("socket.io").listen(server);
const SocketServer = require("./socket");

const config = require("./config/index.js");
const AdminRouter = require("./router/AdminRoute");
const ApiRouter = require("./router/ApiRoute");
const path = require("path");

const { userModel } = require("./models/userModel");

//mongoose.connect(config.DBCONNECT, { useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true, useCreateIndex: true }).then(() => {
mongoose.connect(config.TESTDB, { useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true, useCreateIndex: true }).then(() => {
  console.log('Database is connected');


  app.use(cors);
  app.options('*', cors);
  app.use(express.static('./build'));
  app.use(express.static('./uploads'));
  app.use(bodyParser.json({ limit: "15360mb", type: 'application/json' }));
  app.use(bodyParser.urlencoded({ extended: true }));

  // app.set("socketio", io);
  app.use("/admin", AdminRouter);
  app.use("/api", ApiRouter);

  app.use("*", (req, res, next) => {
    let expires = new Date(new Date().valueOf() + 30 * 24 * 60 * 60 * 1000);
    res.cookie('cookie1', 'value1', { sameSite: 'lax', httpOnly: true, expires: expires, path: "/" });
    next();
  });

  // SocketIO Settings START

  let onlineUsers = {};

  const { Server } = require("socket.io");
  const { createAdapter } = require("@socket.io/redis-adapter");
  const { createClient } = require("redis");

  const io = new Server();

  io.on('connection', async function (socket) {
    console.log('----here is socket part-----')
    var query = socket.handshake.query;
    var roomName = query.roomName;
    if (roomName && roomName != 'null') {
      onlineUsers[socket.id] = roomName;
      await userModel.findOneAndUpdate({ _id: roomName }, { isOnline: true })
      socket.join(roomName);
      console.log(roomName + ' online');
    }

    socket.on('disconnect', async function () {
      if (onlineUsers[socket.id]) {
        await userModel.findOneAndUpdate({ _id: onlineUsers[socket.id] }, { isOnline: false });
        console.log(socket.id, " disconnected", onlineUsers)
      }
      delete onlineUsers[socket.id];
    });
  })

  const pubClient = createClient({ url: "redis://localhost:6379" });
  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    io.listen(6500);
  });
  global.io = io;
  SocketServer();

  // app.get('/admin', (req, res) => { res.sendFile(path.join(__dirname, 'client/admin/index.html')); });
  app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'build/index.html')); });

  server.listen(config.serverPort, () => {
    console.log(`Started server on => http://localhost:${config.serverPort}`);
  });

}, err => { console.log('Can not connect to the database' + err) });