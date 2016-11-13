/* control-io-translator.es6 */
import debug from 'debug';

import { rceIOClient } from '../rce/rce-io-client';
import * as store from '../store';
import { changeRoverIpAddress, restartServer } from '../management';


const log = debug('rsvp-server:control-io-translator');

// === Incoming ===
/**
 * Handle messages of event `data`
 * @param  {Object} message The message received via socket
 */
export function onData(message) {
  switch (message.data.storeName) {
    case 'control':
      // Simply relay
      store.control.receiveData(message.data.fullPath, message.data.path, message.data.data.newValue);
      break;
    default:
      log(`Storename '${message.data.storeName}' is not recognised`);
  }
}

/**
 * Handle messages of event 'post'
 * @param  {Object} event The message received via socket
 */
export function onPost(event) {
  switch (event.data.type) {
    case 'upload-sequence':
      // Simply relay
      rceIOClient.emit('post', event.data);
      break;
    case 'playback-sequence':
      rceIOClient.emit('post', event.data);
      break;
    case 'update-trims':
      rceIOClient.emit('post', event.data);
      break;
    case 'run-self-diagnostics':
      rceIOClient.emit('post', event.data);
      break;
    case 'change-ip-address':
      changeRoverIpAddress(event.data.payload);
      break;
    case 'restart-server':
      restartServer();
      break;
    default:

  }
}

export function onRequest(event) {
  switch (event.data.type) {
    case 'repush':
      if (store[event.data.payload.storeName]) {
        store[event.data.payload.storeName].repush(event.data.payload.path, event.data.payload.notifyees);
      } else {
        log(`No such store '${event.data.payload.storeName}' found`);
      }
      break;
    case 'save-trims':
      rceIOClient.emit('request', event.data);
      break;
    default:

  }
}
