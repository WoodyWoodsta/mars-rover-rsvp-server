/* index.es6 */
import debug from 'debug';

import Koa from 'koa';
import koaBody from 'koa-bodyparser';
import serve from 'koa-static';
import koaLogger from 'koa-logger';
import { readFileSync } from 'fs';
import router from './routes';
import rceIOClient from './rce/rce-io-client';
import * as controlIO from './servers/control-io';
import * as teleIO from './servers/tele-io';

const log = debug('rsvp-server:control-server');

log('Starting server...');
const config = JSON.parse(readFileSync('./config.json'));

const app = new Koa();

// === Middleware ===
app.use(koaLogger());
app.use(koaBody());
app.use(router());

controlIO.initSocket(app);
teleIO.initSocket(app);

app.use(serve('./app'));

// === Connect ===
app.listen(config.rsvp.server.port);
log(`RSVP Control Server started on port ${config.rsvp.server.port}`);

// Initialise client WebSocket connection to RCE
// rceIOClient();
