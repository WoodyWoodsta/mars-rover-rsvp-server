/* index.es6 */
import debug from 'debug';

import Koa from 'koa';
import koaBody from 'koa-bodyparser';
import serve from 'koa-static';
import koaLogger from 'koa-logger';
import { readFileSync } from 'fs';
import router from './routes';
import rceClient from './rce/rce-client';

const log = debug('rsvp-server:control-server');

log('Starting server...');
const config = JSON.parse(readFileSync('./config.json'));

const app = new Koa();

// === Middleware ===
app.use(koaLogger());
app.use(koaBody());
app.use(router());
app.use(serve('./app'));

// === Connect ===
app.listen(config.rsvp.server.port);
log(`RSVP Control Server started on port ${config.rsvp.server.port}`);

// Initialise socket connection to RCE
rceClient();
