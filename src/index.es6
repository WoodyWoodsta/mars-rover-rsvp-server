/* index.es6 */
import debug from 'debug';

import Koa from 'koa';
import koaBody from 'koa-bodyparser';
import serve from 'koa-static';
import { readFileSync } from 'fs';
import router from './routes';

const log = debug('rsvp-server:control-server');

log('Starting server...');
const config = JSON.parse(readFileSync('./config.json'));

const app = new Koa();

// === Middleware ===
app.use(koaBody());
app.use(router());
app.use(serve('./app'));

// === Attach ===
app.listen(config.rsvp.server.port);
log(`RSVP Control Server started on port ${config.rsvp.server.port}`);
