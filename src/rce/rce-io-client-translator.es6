/* rce-io-client-translator.es6 */
/**
 * @author Sean Wood (WoodyWoodsta)
 */

import debug from 'debug';

import * as store from '../store';
import * as rceIOClient from './rce-io-client';

const log = debug('rsvp-server:rce-io-client-translator');

// === Incomming ===
/**
 * Handle incoming data change message
 * @param  {Object} message The incoming socket message
 * @param  {String} event   The event name
 */
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

/**
 * Handle incoming request messages
 * @param  {Object} event The incoming property change event
 */
export function onRequest(event) {
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
/**
 * Request a repush from a remote store
 * @param  {String} storeName      The name of the remote store
 * @param  {String} path           The path of the store to repush, or '*' for the entire thing
 * @param  {Array}  [notifyees=[]] Custom notifiyees
 */
export function requestRepush(storeName, path, notifyees = []) {
  rceIOClient.sendRequest('repush', { storeName, path, notifyees });
}
