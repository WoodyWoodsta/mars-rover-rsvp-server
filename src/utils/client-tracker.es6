/* client-tracker.es6 */
/**
 * @author Sean Wood (WoodyWoodsta)
 */

/**
 * Will keep track of clients connected to ControlIO and manage which is in control of the rover
 * Currently implements a first come first server approach
 */

const clients = [];

/**
 * Add the clientID to the list of connected Clients
 * @param {[type]} clientId [description]
 */
export function add(clientId) {
  if (!clients.includes(clientId)) {
    clients.push(clientId);
  }
}

/**
 * Remove the clientId from the list of connected clients
 * @param  {String} clientId The socket ID of the Client
 */
export function remove(clientId) {
  const index = clients.indexOf(clientId);
  if (index < 0) {
    return false;
  }

  clients.splice(index, 1);
  return true;
}

/**
 * Check whether or not a Client with a particualr clientId has control of the rover
 * @param  {String}  clientId The socket ID of the Client
 * @return {Boolean}          Whether or not the Client has control of the rover
 */
export function hasControl(clientId) {
  return clients[0] === clientId;
}
