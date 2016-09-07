/* store.es6 */
/**
 * Store. Operates on a data-driven model in terms of socket notifications
 */
import debug from 'debug';
import objectPath from 'object-path';

import { controlIO } from './servers/control-io';
import { teleIO } from './servers/tele-io';
import { rceIOClient } from './rce/rce-io-client';

const log = debug('rsvp-server:store');

/**
 * Server state data
 * SOURCE
 * @member {Object} controlIOClients  Of the clients connected to the controlIO socket
 * @member {Object} teleIOClients     Of the clients connected to the teleIO socket
 * @member {Object} rover             Of the rover
 */
export const server = {
  controlIOClients: {
    number: 0,
  },

  teleIOClients: {
    number: 0,
  },

  rover: {
    isOnline: false,
  },

  _watched: {
    'controlIOClients.number': ['teleIO'],
    'teleIOClients.number': ['teleIO'],
    'rover.isOnline': ['teleIO'],
  },
  _type: 'source',
};

/**
 * Control input store
 * SINK
 */
export const control = {
  _watched: {
  },
  _type: 'sink',
};

export const rceState = {
  rceCpu: undefined,
  rceMemory: undefined,
  camCpu: undefined,
  camMemory: undefined,
  _watched: {
    rceCpu: ['teleIO'],
    rceMemory: ['teleIO'],
    camCpu: ['teleIO'],
    camMemory: ['teleIO'],
  },
  _type: 'sink',
};

export const stores = {
  rceState,
  control,
  server,
};

/**
 * Mutate the store, optionally notifying listeners on specific socket channels of the change
 * NOTE: Mutating the store will automatically notify according to the `_watched` array in each store object
 * @param {String}                path      The path of the property to change
 * @param {Any}                   data      The new data
 * @param {Array/String/Function} notifyees Custom notification: the name of the socket channel to notify on, or an array of
 *                                          such names, or a callback function, or an array of callback functions or a mixed
 *                                          array of notifyees or callback functions :D
 */
export function set(path, data, notifyees) {
  // Record of notified
  const notified = [];

  // Record and mutate
  const baseDotIdx = path.indexOf('.');
  let dotIndex = 0;
  const base = path.slice(0, baseDotIdx);
  const key = path.slice(baseDotIdx + 1);

  const oldValue = objectPath.get(stores, path);
  objectPath.set(stores, path, data);

  while (dotIndex > -1) {
    const sub = key.slice(0, dotIndex || undefined);
    if (stores[base]._watched[sub]) {
      stores[base]._watched[sub].forEach((notifyee) => {
        // Handle all types
        if (typeof notifyee === 'function') {
          notifyee(data, oldValue, path);
        } else {
          notifyMutate(notifyee, base, path, oldValue, data);
          notified.push(notifyee);
        }
      });

      break;
    }

    dotIndex = key.indexOf('.', dotIndex + 1);
  }

  // Custom Notify
  if (notifyees) {
    // Handle all types
    if (typeof notifyees === 'string') {
      // One notifyee
      if (!notified.includes(notifyees)) {
        notifyMutate(notifyees, base, path, data, oldValue);
        notified.push(notifyees);
      }
    } else if (notifyees.constructor === Array) {
      // Multiple notifyees
      notifyees.forEach((notifyee) => {
        // Handle all types
        if (typeof notifyee === 'function') {
          notifyee(data, oldValue, path);
        } else if (!notified.includes(notifyee)) {
          // Do not notify more than once
          notifyMutate(notifyee, base, path, data, oldValue);
          notified.push(notifyee);
        }
      });
    } else if (typeof notifyees === 'function') {
      notifyees(data, oldValue, path);
    } else {
      log('Notifyee list is not a string nor an array');
    }
  }
}

// === Private ===
/**
 * Emit a notification of a mutation on a store property
 * @param  {String} notifyee  The socket on which to send the notification
 * @param  {String} storeName The name of the store concerned
 * @param  {String} path      The property path of the property that was mutated
 * @param  {any}    oldValue  The previous value
 * @param  {any}    newValue  The new value
 */
function notifyMutate(notifyee, storeName, path, oldValue, newValue) {
  // Construct message to send
  const message = {
    type: 'mutate',
    storeName,
    path,
    data: {
      oldValue,
      newValue,
    },
  };

  // Notify
  switch (notifyee) {
    case 'controlIO':
      controlIO.broadcast('data', message);
      break;
    case 'teleIO':
      teleIO.broadcast('data', message);
      break;
    case 'rceIO':
      rceIOClient.emit('data', message);
      break;
    default:
      log('Attempted notification failed, no such notifyee');
      break;
  }
}
