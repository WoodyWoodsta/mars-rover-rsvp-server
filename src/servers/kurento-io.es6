/* kurento-io.es6 */
import debug from 'debug';
import KoaSocket from 'koa-socket';
import kurento from 'kurento-client';
import { readFileSync } from 'fs';

const log = debug('rsvp-server:kurento-io');
const config = JSON.parse(readFileSync('./config.json'));
const kurentoIO = new KoaSocket('KurentoIO');
const candidatesQueue = {};
const noPresenterMessage = 'No active presenter. Try again later...';

let idCounter = 0;
let kurentoClient = null;
let presenter = null;
let viewers = [];

/**
 * Initialise the socket server
 * @param  {Object} app The Koa application instance onto which to attach the KoaSocket
 */
export function initSocket(app) {
  log('Starting KurentoIO socket...');
  kurentoIO.attach(app);

  attachCoreListeners(kurentoIO);

  log('KurentoIO WebSocket live');
}

function attachCoreListeners(io) {
  io.on('connection', (ctx) => {
    const sessionId = _nextUniqueId();
    log(`New connection received with sessionId: ${sessionId}`);

    attachKurentoListeners(ctx.socket, sessionId);
  });
}

function attachKurentoListeners(socket, sessionId) {
  socket.on('error', (error) => {
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
      case 'presenter':
        startPresenter(sessionId, socket, message.sdpOffer, (error, sdpAnswer) => {
          if (error) {
            return socket.send(JSON.stringify({
              id: 'presenterResponse',
              response: 'rejected',
              message: error,
            }));
          }
          socket.send(JSON.stringify({
            id: 'presenterResponse',
            response: 'accepted',
            sdpAnswer,
          }));
        });
        break;

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

// === Private ===
function _nextUniqueId() {
  idCounter++;
  return idCounter.toString();
}

// Recover kurentoClient for the first time.
function _getKurentoClient(callback) {
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

function startPresenter(sessionId, ws, sdpOffer, callback) {
  clearCandidatesQueue(sessionId);

  if (presenter !== null) {
    stop(sessionId);
    return callback('Another user is currently acting as presenter. Try again later ...');
  }

  presenter = {
    id: sessionId,
    pipeline: null,
    webRtcEndpoint: null,
  };

  _getKurentoClient((error, _kurentoClient) => {
    if (error) {
      stop(sessionId);
      return callback(error);
    }

    if (presenter === null) {
      stop(sessionId);
      return callback(noPresenterMessage);
    }

    _kurentoClient.create('MediaPipeline', (createMediaPipelineError, pipeline) => {
      if (createMediaPipelineError) {
        stop(sessionId);
        return callback(createMediaPipelineError);
      }

      if (presenter === null) {
        stop(sessionId);
        return callback(noPresenterMessage);
      }

      presenter.pipeline = pipeline;
      pipeline.create('WebRtcEndpoint', (createEndpointError, webRtcEndpoint) => {
        if (createEndpointError) {
          stop(sessionId);
          return callback(createEndpointError);
        }

        if (presenter === null) {
          stop(sessionId);
          return callback(noPresenterMessage);
        }

        presenter.webRtcEndpoint = webRtcEndpoint;

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

          if (presenter === null) {
            stop(sessionId);
            return callback(noPresenterMessage);
          }

          callback(null, sdpAnswer);
        });

        webRtcEndpoint.gatherCandidates((gatherCandsErro) => {
          if (gatherCandsErro) {
            stop(sessionId);
            return callback(gatherCandsErro);
          }
        });
      });
    });
  });
}

function startViewer(sessionId, ws, sdpOffer, callback) {
  clearCandidatesQueue(sessionId);

  if (presenter === null) {
    stop(sessionId);
    return callback(noPresenterMessage);
  }

  presenter.pipeline.create('WebRtcEndpoint', (error, webRtcEndpoint) => {
    if (error) {
      stop(sessionId);
      return callback(error);
    }
    viewers[sessionId] = {
      webRtcEndpoint,
      ws,
    };

    if (presenter === null) {
      stop(sessionId);
      return callback(noPresenterMessage);
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
      if (presenter === null) {
        stop(sessionId);
        return callback(noPresenterMessage);
      }

      presenter.webRtcEndpoint.connect(webRtcEndpoint, (connectEndpointError) => {
        if (connectEndpointError) {
          stop(sessionId);
          return callback(connectEndpointError);
        }
        if (presenter === null) {
          stop(sessionId);
          return callback(noPresenterMessage);
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

function clearCandidatesQueue(sessionId) {
  if (candidatesQueue[sessionId]) {
    delete candidatesQueue[sessionId];
  }
}

function stop(sessionId) {
  if (presenter !== null && presenter.id === sessionId) {
    viewers.forEach((viewer) => {
      if (viewer.ws) {
        viewer.ws.send(JSON.stringify({
          id: 'stopCommunication',
        }));
      }
    });

    presenter.pipeline.release();
    presenter = null;
    viewers = [];
  } else if (viewers[sessionId]) {
    viewers[sessionId].webRtcEndpoint.release();
    delete viewers[sessionId];
  }

  clearCandidatesQueue(sessionId);
}

function onIceCandidate(sessionId, _candidate) {
  const candidate = kurento.getComplexType('IceCandidate')(_candidate);

  if (presenter && presenter.id === sessionId && presenter.webRtcEndpoint) {
    log('Sending presenter candidate');
    presenter.webRtcEndpoint.addIceCandidate(candidate);
  } else if (viewers[sessionId] && viewers[sessionId].webRtcEndpoint) {
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
