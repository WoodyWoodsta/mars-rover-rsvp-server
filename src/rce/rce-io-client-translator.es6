/* rce-io-client-translator.es6 */
import debug from 'debug';

import * as store from '../store';

const log = debug('rsvp-server:rce-io-client-translator');

export function onData(message, event) {
  if (event === 'data') {
    switch (message.storeName) {
      case 'rceState':
        store.rceState.receiveData(message.fullPath, message.path, message.data.newValue);
        break;
      case 'hardwareState':
        log('Got message from the hardware state');
        store.hardwareState.receiveData(message.fullPath, message.path, message.data.newValue);
        break;
      default:
        log(`Storename '${message.storeName}' is not recognised`);
    }
  }
}
