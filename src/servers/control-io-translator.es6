/* control-io-translator.es6 */
import debug from 'debug';

import { rceIOClient } from '../rce/rce-io-client';

const log = debug('rsvp-server:control-io-translator');

/**
 * Handle messages of event `data`
 * @param  {Object} message The message received via sockets
 */
export function onData(message) {
  switch (message.data.storeName) {
    case 'control':
      // Simply relay the control messages to the rover
      rceIOClient.emit(message.event, message.data);
      break;
    default:
      log(`Storename '${message.data.storeName}' is not recognised`);
  }
}
