/* routes.es6 */
import debug from 'debug';

import Router from 'koa-router';

const log = debug('rsvp-server:router');
const router = new Router();

// === Routes ===
router.post('/test', ctx => {
  ctx.body = {
    message: 'Test POST received',
    requestBody: ctx.request.body,
  };
  ctx.status = 200;
  log('Test POST received');
});

export default function () {
  return router.middleware();
}
