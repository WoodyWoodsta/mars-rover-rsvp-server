/* management.es6 */
/**
 * @author Sean Wood (WoodyWoodsta)
 */

import debug from 'debug';
import fs from 'fs';
import path from 'path';

const log = debug('rsvp-server:management');

/**
 * Change the rover IP address in the config file and restart the server to make the changes
 * @param  {String} ip The new IP address
 */
export function changeRoverIpAddress(ip) {
  log('Changing RCE IP address');

  // Resolve path and fetch existing config data
  const configPath = path.join(__dirname, '..', 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath));

  // Change IP address
  config.rce.client.ip = ip;
  config.rce.client.socketURI = `http://${ip}:3000/rce-io`;
  config.rce.client.rtspURI = `http://${ip}:8080/?action=stream`;

  // Commit config changes to file
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  // Restart server
  restartServer();
}

/**
 * Restart the server by killing the process and allowing forever to invoke
 */
export function restartServer() {
  log('Restarting server. Please make sure the server is running in `forever`.');
  process.exit();
}
