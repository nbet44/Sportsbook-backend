const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors')({ origin: true });
const app = express();
const server = require('http').createServer(app);
const path = require('path');
const io = require('socket.io')(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://totalbet365.live'],
    credentials: true
  }
});
const mongoose = require('mongoose');

const SocketServer = require('./socket');
const config = require('./config/index.js');
const AdminRouter = require('./router/AdminRoute');
const ApiRouter = require('./router/ApiRoute');


mongoose.connect(config.db.bet777, { useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true, useCreateIndex: true }).then(() => {
  console.log('Database is connected');

  app.use(cors);
  app.options('*', cors);
  app.set('socketio', io);
  app.use(express.static('./build'));
  app.use(express.static('./uploads'));
  app.use(bodyParser.json({ limit: '15360mb', type: 'application/json' }));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use('/admin', AdminRouter);
  app.use('/api', ApiRouter);
  app.use('*', (req, res, next) => {
    let expires = new Date(new Date().valueOf() + 30 * 24 * 60 * 60 * 1000);
    res.cookie('cookie1', 'value1', { sameSite: 'lax', httpOnly: true, expires: expires, path: '/' });
    next();
  });

  SocketServer(io);
  global.io = io;

  app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'build/index.html')); });

  server.listen(config.serverPort, () => {
    console.log(`Started server on => http://localhost:${config.serverPort}`);
  });

}, err => { console.log('Can not connect to the database' + err) });