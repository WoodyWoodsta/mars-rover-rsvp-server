/* tele-io.es6 */
/**
 * @author Sean Wood (WoodyWoodsta)
 */

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
  let count = 0;

  io.on('connection', (ctx) => {
    log(`New client connected. Number of clients: ${++count}`);
    store.server.set('teleIOClients.number', count);

    ctx.socket.on('disconnect', () => {
      store.server.set('teleIOClients.number', --count);
    });
  });


  io.on('test', () => {
    log('Test message received on TeleIO');
  });
}

/**
 * Attach custom listeners to the TeleIOClient socket instance
 * @param  {Object} io The socket instance
 */
function attachTeleListeners(io) {
  io.on('data', (data) => {
    log(data);
  });

  io.on('request', teleIOTranslator.onRequest);
}
