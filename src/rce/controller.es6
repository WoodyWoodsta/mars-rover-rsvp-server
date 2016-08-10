/* controller.es6 */
import debug from 'debug';

const log = debug('rsvp-server:rce-controller');
const controllerIP = null;

/**
 * [checkControl description]
 * @param  {[type]} ip [description]
 * @return {[type]}    [description]
 */
function checkControl(ip) {
  return controllerIP === ip;
}
