/* rce-io-client.es6 */
import debug from 'debug';

import { readFileSync } from 'fs';
import SocketClient from 'socket.io-client';

const log = debug('rsvp-server:rce-io-client');
const config = JSON.parse(readFileSync('./config.json'));

export default function () {
  log('Connecting to RCEIO WebSocket...');
  const rceIOClient = new SocketClient(config.rce.client.socketURI);

  rceIOClient.on('connect', () => {
    log('Connected to RCEIO WebSocket');
    attachSocketListeners(this);

    this.emit('test', {});
  });

  rceIOClient.on('connect_error', () => {
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
}
