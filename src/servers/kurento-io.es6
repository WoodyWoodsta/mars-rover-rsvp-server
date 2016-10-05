/* kurento-io.es6 */
import debug from 'debug';
import KoaSocket from 'koa-socket';
import kurento from 'kurento-client';
import { readFileSync } from 'fs';

import * as store from '../store';

const log = debug('rsvp-server:kurento-io');
const config = JSON.parse(readFileSync('./config.json')); // TODO: Convert this to a javascript config file
const kurentoIO = new KoaSocket('KurentoIO');
const candidatesQueue = {};
const noMasterMessage = 'No active rover. Try again later...';

let idCounter = 0;
let kurentoClient = null;
let master = null; // TODO: Get rid of this
let viewers = [];

// === Public ===
/**
 * Initialise the socket server
 * @param  {Object} app The Koa application instance onto which to attach the KoaSocket
 */
export function initSocket(app) {
  log('Starting KurentoIO socket...');
  kurentoIO.attach(app);

  attachCoreListeners(kurentoIO);

  log('KurentoIO WebSocket live');

  store.hardwareState.on('camera.running-changed', (event) => {
    if (event.newValue && !store.server.kurento.streamOnline) {
      startRTSP((error) => {
        if (error) {
          store.server.set('kurento.streamOnline', false);
          log(`RTSP/HTTP mjpeg stream connection failed with error: ${error}`);
        }
      });
      store.server.set('kurento.streamOnline', true);
    } else if (!event.newValue) {
      stop('master');
    }
  });

  store.server.on('rover.isOnline-changed', (event) => {
    if (!event.newValue) {
      stop('master');
    }
  });
}

// === Private ===
/**
 * Attach the core listeners to the socket instance, generally involving the socket connection itself
 * @param  {Object} io The socket connection to attach to
 */
function attachCoreListeners(io) {
  io.on('connection', (ctx) => {
    const sessionId = nextUniqueId();
    log(`New connection received with sessionId: ${sessionId}`);

    attachKurentoListeners(ctx.socket, sessionId);
  });
}

/**
 * Attach listeners involving functionality external to the socket connection
 * @param  {Object} socket    The socket connection to attach to
 * @param  {Number} sessionId The ID of the session
 */
function attachKurentoListeners(socket, sessionId) {
  socket.on('error', () => {
    log(`Connection ${sessionId} error`);
    stop(sessionId);
  });

  socket.on('close', () => {
    log(`Connection ${sessionId} closed`);
    stop(sessionId);
  });

  socket.on('message', (_message) => {
    const message = JSON.parse(_message);
    log(`Connection ${sessionId} received message: ${message}`);

    switch (message.id) {
      case 'viewer':
        startViewer(sessionId, socket, message.sdpOffer, (error, sdpAnswer) => {
          if (error) {
            return socket.send(JSON.stringify({
              id: 'viewerResponse',
              response: 'rejected',
              message: error,
            }));
          }

          socket.send(JSON.stringify({
            id: 'viewerResponse',
            response: 'accepted',
            sdpAnswer,
          }));
        });
        break;

      case 'stop':
        stop(sessionId);
        break;

      case 'onIceCandidate':
        onIceCandidate(sessionId, message.candidate);
        break;

      default:
        socket.send(JSON.stringify({
          id: 'error',
          message: `Invalid message: ${message}`,
        }));
        break;
    }
  });
}

/**
 * Create a new, unique ID
 * @return {String} The stringified ID
 */
function nextUniqueId() {
  idCounter++;
  return idCounter.toString();
}

/**
 * Recover the Kurento client for the first time
 * @param  {Function} callback
 */
function getKurentoClient(callback) {
  if (kurentoClient !== null) {
    return callback(null, kurentoClient);
  }

  kurento(config.rsvp.mediaServer.ws_uri, (error, _kurentoClient) => {
    if (error) {
      log(`Could not find media server at address ${config.rsvp.mediaServer.ws_uri}`);
      return callback(`Could not find media server at address ${config.rsvp.mediaServer.ws_uri}. Exiting with error: ${error}`);
    }

    kurentoClient = _kurentoClient;
    callback(null, kurentoClient);
  });
}

/**
 * Generate a new viewer endpoint and intiate a connection
 * @param  {Number}   sessionId The ID of the session wishing to connect
 * @param  {Object}   ws        The WebRTC WebSocket
 * @param  {Object}   sdpOffer  SDP Offer from the session
 * @param  {Function} callback
 * @return {Any}                The result of the callback
 */
function startViewer(sessionId, ws, sdpOffer, callback) {
  clearCandidatesQueue(sessionId);

  if (master === null) {
    stop(sessionId);
    return callback(noMasterMessage);
  }

  master.pipeline.create('WebRtcEndpoint', (error, webRtcEndpoint) => {
    if (error) {
      stop(sessionId);
      return callback(error);
    }
    viewers[sessionId] = {
      webRtcEndpoint,
      ws,
    };

    if (master === null) {
      stop(sessionId);
      return callback(noMasterMessage);
    }

    if (candidatesQueue[sessionId]) {
      while (candidatesQueue[sessionId].length) {
        const candidate = candidatesQueue[sessionId].shift();
        webRtcEndpoint.addIceCandidate(candidate);
      }
    }

    webRtcEndpoint.on('OnIceCandidate', (event) => {
      const candidate = kurento.getComplexType('IceCandidate')(event.candidate);
      ws.send(JSON.stringify({
        id: 'iceCandidate',
        candidate,
      }));
    });

    webRtcEndpoint.processOffer(sdpOffer, (sdpOfferError, sdpAnswer) => {
      if (sdpOfferError) {
        stop(sessionId);
        return callback(sdpOfferError);
      }
      if (master === null) {
        stop(sessionId);
        return callback(noMasterMessage);
      }

      master.playerEndpoint.connect(webRtcEndpoint, (connectEndpointError) => {
        if (connectEndpointError) {
          stop(sessionId);
          return callback(connectEndpointError);
        }
        if (master === null) {
          stop(sessionId);
          return callback(noMasterMessage);
        }

        callback(null, sdpAnswer);
        webRtcEndpoint.gatherCandidates((gatherCandsError) => {
          if (gatherCandsError) {
            stop(sessionId);
            return callback(gatherCandsError);
          }
        });
      });
    });
  });
}

/**
 * Start receiving a stream from the RTSP server and offer it as an endpoint for the broadcaster
 * @param  {Function} callback
 */
function startRTSP(callback) {
  if (master !== null) {
    return callback('Master already present');
  }

  log('Starting RTSP/HTTP mjpeg stream relay...');

  getKurentoClient((error, _kurentoClient) => {
    if (error) {
      stop('master');
      return callback(error);
    }

    _kurentoClient.create('MediaPipeline', (mediaPipelineError, _pipeline) => {
      if (mediaPipelineError) {
        log('Error creating media pipline');
        return callback(mediaPipelineError);
      }

      // PlayerEndpoint params
      const params = {
        uri: config.rce.client.rtspURI,
        useEncodedMedia: false, // true
      };

      master = {};
      master.pipeline = _pipeline;

      master.pipeline.create('PlayerEndpoint', params, (playerEndpointError, _playerEndpoint) => {
        if (playerEndpointError) {
          log('Error creating player endpoint');
          return callback(playerEndpointError);
        }

        master.playerEndpoint = _playerEndpoint;
        master.playerEndpoint.play((playError) => {
          if (playError) {
            log('Error playing back the stream');
            return callback(playError);
          }
        });
      });
    });
  });
}

/**
 * Clear a candidate from the queue
 * @param  {Number} sessionId The ID of the session of concern
 */
function clearCandidatesQueue(sessionId) {
  if (candidatesQueue[sessionId]) {
    delete candidatesQueue[sessionId];
  }
}

/**
 * Close either the master endpoint or a viewer endpoint
 * @param  {[type]} sessionId [description]
 */
function stop(sessionId) {
  if (master !== null && sessionId === 'master') {
    // Stop the stream
    viewers.forEach((viewer) => {
      if (viewer.ws) {
        viewer.ws.send(JSON.stringify({
          id: 'stopCommunication',
        }));
      }
    });

    master.pipeline.release();
    master = null;
    viewers = [];
    store.server.set('kurento.streamOnline', false);
  } else if (viewers[sessionId]) {
    // Stop a viewer
    viewers[sessionId].webRtcEndpoint.release();
    delete viewers[sessionId];
  }

  clearCandidatesQueue(sessionId);
}

/**
 * Handle an incoming ICE candidate
 * @param  {Number} sessionId  The ID of the session of concern
 * @param  {Object} _candidate The ICE candidate
 */
function onIceCandidate(sessionId, _candidate) {
  const candidate = kurento.getComplexType('IceCandidate')(_candidate);

  if (viewers[sessionId] && viewers[sessionId].webRtcEndpoint) {
    log('Sending viewer candidate');
    viewers[sessionId].webRtcEndpoint.addIceCandidate(candidate);
  } else {
    log('Queueing candidate');
    if (!candidatesQueue[sessionId]) {
      candidatesQueue[sessionId] = [];
    }
    candidatesQueue[sessionId].push(candidate);
  }
}
