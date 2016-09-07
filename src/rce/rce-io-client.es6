/* rce-io-client.es6 */
import debug from 'debug';
import { readFileSync } from 'fs';
import SocketClient from 'socket.io-client';

import * as store from '../store';
import * as rceIOClientTranslator from './rce-io-client-translator';

const log = debug('rsvp-server:rce-io-client');
const config = JSON.parse(readFileSync('./config.json'));

export let rceIOClient;

export default function () {
  log('Connecting to RCEIO WebSocket...');
  rceIOClient = new SocketClient(config.rce.client.socketURI);

  rceIOClient.on('connect', () => {
    log('Connected to RCEIO WebSocket');
    attachSocketListeners(rceIOClient);

    store.set('server.rover.isOnline', true);

    rceIOClient.emit('test', {});
  });

  rceIOClient.on('connect_error', () => {
    store.set('server.rover.isOnline', false);
    log('Failed to connect to RCEIO WebSocket');
  });
}

// === Private ===
/**
 * Attach listeners to RCEIO socket namespace
 * @param  {Object} io The socket.io instance to attach the listener to
 */
function attachSocketListeners(io) {
  io.on('test', () => {
    log('Received test WebSocket message from RCE');
  });

  io.on('data', (message) => {
    rceIOClientTranslator.onData(message, 'data');
  });
}
