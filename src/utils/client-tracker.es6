/* client-tracker.es6 */
/**
 * Will keep track of clients connected to ControlIO and manage which is in control of the rover
 * Currently implements a first come first server approach
 */

const clients = [];

export function add(clientId) {
  if (!clients.includes(clientId)) {
    clients.push(clientId);
  }
}

export function remove(clientId) {
  const index = clients.indexOf(clientId);
  if (index < 0) {
    return false;
  }

  clients.slice(index, 1);
  return true;
}

export function hasControl(clientId) {
  return clients[0] === clientId;
}
