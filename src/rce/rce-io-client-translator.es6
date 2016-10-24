/* rce-io-client-translator.es6 */
import debug from 'debug';

import * as store from '../store';
import * as rceIOClient from './rce-io-client';

const log = debug('rsvp-server:rce-io-client-translator');

// === Incomming ===
export function onData(message, event) {
  if (event === 'data') {
    switch (message.storeName) {
      case 'rceState':
        store.rceState.receiveData(message.fullPath, message.path, message.data.newValue);
        break;
      case 'hardwareState':
        store.hardwareState.receiveData(message.fullPath, message.path, message.data.newValue);
        break;
      default:
        log(`Storename '${message.storeName}' is not recognised (path: ${message.path})`);
    }
  }
}

export function onRequest(event) {
  debugger;
  switch (event.type) {
    case 'repush':
      if (store[event.payload.storeName]) {
        store[event.payload.storeName].repush(event.payload.path, event.payload.notifyees);
      } else {
        log(`No such store '${event.payload.storeName}' found`);
      }
      break;
    default:
      log(`Request type ${event.type} unrecognised`);
  }
}

// === Outgoing ===
export function requestRepush(storeName, path, notifyees = []) {
  rceIOClient.sendRequest('repush', { storeName, path, notifyees });
}
