/* index.es6 */
import debug from 'debug';

import Koa from 'koa';
import http from 'http';
import https from 'https';
import koaBody from 'koa-bodyparser';
import serve from 'koa-static';
import koaLogger from 'koa-logger';
import { readFileSync } from 'fs';
import router from './routes';
import rceIOClient from './rce/rce-io-client';
import * as controlIO from './servers/control-io';
import * as teleIO from './servers/tele-io';
import * as kurentoIO from './servers/kurento-io';

const log = debug('rsvp-server:control-server');

log('Starting server...');
const config = JSON.parse(readFileSync('./config.json'));
const security = {
  key: readFileSync('./src/keys/server.key'),
  cert: readFileSync('./src/keys/server.crt'),
};

// App
const app = new Koa();

// Middleware
app.use(koaLogger());
app.use(koaBody());
app.use(router());
app.use(serve('./app'));

// Server
if (config.rsvp.server.security === 'ssl') {
  app.server = https.createServer({ ...security }, app.callback());
  log('Server configured to use SSL encryption');
} else {
  app.server = http.createServer(app.callback());
  log('Server configured as unencrypted');
}

// Sockets
controlIO.initSocket(app);
teleIO.initSocket(app);
kurentoIO.initSocket(app);

// Connect
app.server.listen(config.rsvp.server.port, () => {
  log(`RSVP Control Server started on port ${config.rsvp.server.port}`);
});

// Initialise client WebSocket connection to RCE
// rceIOClient();
