/* control-io-translator.es6 */
import debug from 'debug';

import { rceIOClient } from '../rce/rce-io-client';

const log = debug('rsvp-server:control-io-translator');

/**
 * Handle messages of event `data`
 * @param  {Object} message The message received via socket
 */
export function onData(message) {
  switch (message.data.storeName) {
    case 'control':
      // Simply relay
      rceIOClient.emit(message.event, message.data);
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
  switch (event.type) {
    case 'upload-sequence':
      // Simply relay
      rceIOClient.emit('post', event);
      break;
    default:

  }
}
