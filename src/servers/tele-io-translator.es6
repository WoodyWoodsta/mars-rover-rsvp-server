/* tele-io-translator.es6 */
import debug from 'debug';

import * as store from '../store';

const log = debug('rsvp-server:tele-io-translator');

// === Incoming ===
export function onRequest(event) {
  switch (event.data.type) {
    case 'repush':
      if (store[event.data.payload.storeName]) {
        store[event.data.payload.storeName].repush(event.data.payload.path, event.data.payload.notifyees);
      } else {
        log(`No such store '${event.data.payload.storeName}' found`);
      }
      break;
    default:

  }
}
