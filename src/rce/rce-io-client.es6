/* rce-io-client.es6 */
/**
 * @author Sean Wood (WoodyWoodsta)
 */

import debug from 'debug';
import { readFileSync } from 'fs';
import SocketClient from 'socket.io-client';

import * as store from '../store';
import * as rceIOClientTranslator from './rce-io-client-translator';

const log = debug('rsvp-server:rce-io-client');
const config = JSON.parse(readFileSync('./config.json'));

export let rceIOClient;

let listenersAttached = false;

/**
 * Initialise the RCEIOClient socket endpoint
 */
export default function () {
  log('Connecting to RCEIO WebSocket...');
  rceIOClient = new SocketClient(config.rce.client.socketURI);

  rceIOClient.on('connect', () => {
    log('Connected to RCEIO WebSocket');
    if (!listenersAttached) {
      attachSocketListeners(rceIOClient);
    }

    store.server.set('rover.isOnline', true);
    _syncStores();

    rceIOClient.emit('test', {});
  });

  rceIOClient.on('connect_error', () => {
    store.server.set('rover.isOnline', false);
    log('Failed to connect to RCEIO WebSocket');
  });
}

/**
 * Send a request messahe
 * @param  {String} type    The request type
 * @param  {Any}    payload The data associated with the message
 */
export function sendRequest(type, payload) {
  rceIOClient.emit('request', { type, payload });
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

  io.on('request', rceIOClientTranslator.onRequest);

  listenersAttached = true;
}

/**
 * Ensure that the stores are in sync if the server comes online after the rover
 */
function _syncStores() {
  rceIOClientTranslator.requestRepush('rceState', '*');
  rceIOClientTranslator.requestRepush('hardwareState', '*');
}
