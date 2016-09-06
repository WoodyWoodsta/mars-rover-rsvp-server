/* control-io.es6 */
import debug from 'debug';

import KoaSocket from 'koa-socket';
import * as tracker from '../utils/client-tracker';
import * as store from '../store';

const log = debug('rsvp-server:control-io');
const acceptedEvents = ['test', 'disconnect'];

export const controlIO = new KoaSocket('ControlIO');

/**
 * Initialise the socket server
 * @param  {Object} app The Koa application instance onto which to attach the KoaSocket
 */
export function initSocket(app) {
  log('Starting ControlIO socket...');
  controlIO.attach(app);

  attachMiddleware(controlIO);
  attachCoreListeners(controlIO);
  attachControlListeners(controlIO);

  log('ControlIO WebSocket live');
}

// === Private ===
/**
 * Attach core listeners to ControlIO socket namespace
 * @param  {Object} io The KoaSocket instance to attach the listeners to
 */
function attachCoreListeners(io) {
  // Add listener for any connection
  io.on('connection', ctx => {
    tracker.add(ctx.socket.id);
    store.set('server.controlIOClients.number', ctx.socket.server.engine.clientsCount / 2);
    log(`New client connected. Number of clients: ${store.server.controlIOClients.number}`);

    // Add listener for specific client disconnection
    ctx.socket.on('disconnect', () => {
      tracker.remove(ctx.socket.id);
      store.set('server.controlIOClients.number', ctx.socket.server.engine.clientsCount / 2);
      log(`Client disconnected. Number of clients: ${store.server.controlIOClients.number}`);
    });
  });

  // Test message listener
  io.on('test', ctx => {
    log('Test message received on ControlIO');
    ctx.socket.emit('test');
  });
}

/**
 * Attach context based listeners to the ControlIO socket namespace
 * @param  {Object} io The KoaSocket instance to attach the listeners to
 */
function attachControlListeners(io) {
  // Some control related commands
  io.on('data', (data) => {
    log(data);
  });
}

/**
 * Attach middleware to the socket pipeline koa style
 * @param  {Object} io The KoaSocket instance to attach the listeners to
 */
function attachMiddleware(io) {
  // Restrict socket communication to that which is allowed control
  io.use((ctx, next) => {
    log(`Checking client access for event: '${ctx.event}'`);
    if (tracker.hasControl(ctx.socket.id) || acceptedEvents.includes(ctx.event)) {
      log('Client granted access');
      return next();
    }

    log('Client access rejected');
    throw new Error('Client not in control');
  });
}