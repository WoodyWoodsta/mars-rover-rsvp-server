/* controller.es6 */
/**
 * @author Sean Wood (WoodyWoodsta)
 */

import debug from 'debug';

import * as store from '../store';

const log = debug('rsvp-server:rce-controller');

/**
 * Initialise the controller (this is most likely old and dead code)
 */
export function init() {
  store.server.on('rover.isOnline-changed', _onRoverIsOnlineChanged);
}

// === Private ===

function _onRoverIsOnlineChanged(event) {
  if (!event.newValue) {
    store.hardwareState.set('camera.running', false);
    // TODO: Write a reset method
    // store.hardwareState.reset();
  } else {
    // TODO: Write a synchronisation procedure
    // store.hardwareState.sync();
  }
}
