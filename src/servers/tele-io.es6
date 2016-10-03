/* tele-io.es6 */
import debug from 'debug';

import KoaSocket from 'koa-socket';

import * as store from '../store';
import * as teleIOTranslator from './tele-io-translator';

const log = debug('rsvp-server:tele-io');

export const teleIO = new KoaSocket('TeleIO');

/**
 * Initialise the socket server
 * @param  {Object} app The Koa application instance onto which to attach the KoaSocket
 */
export function initSocket(app) {
  log('Starting TeleIO socket...');

  teleIO.attach(app);
  attachCoreListeners(teleIO);
  attachTeleListeners(teleIO);

  log('TeleIO WebSocket live');
}

// === Private ===
/**
 * Attach listeners to TeleIO socket namespace
 * @param  {Object}  io  The KoaSocket instance to attach the listeners to
 */
function attachCoreListeners(io) {
  io.on('connection', ctx => {
    log(`New client connected. Number of clients: ${ctx.socket.server.engine.clientsCount}`);
  });

  io.on('test', () => {
    log('Test message received on TeleIO');
  });
}

function attachTeleListeners(io) {
  io.on('data', (data) => {
    log(data);
  });

  io.on('request', teleIOTranslator.onRequest);
}
