/* rce-client.es6 */
import debug from 'debug';
import { readFileSync } from 'fs';
import SocketClient from 'socket.io-client';

const log = debug('rsvp-server:rce-client');
const config = JSON.parse(readFileSync('./config.json'));

export default function init() {
  log('Connecting to RCE socket.io');
  const rceIoClient = new SocketClient(config.rce.client.socketURI);

  rceIoClient.on('connect', () => {
    log('Connected to RCE socket.io');
    rceIoClient.emit('test', {});
  });

  rceIoClient.on('test', () => {
    log('Received test socket message from RCE');
  });
}
