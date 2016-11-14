/* routes.es6 */
/**
 * @author Sean Wood (WoodyWoodsta)
 */

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

/**
 * Return the configured router middleware instance
 */
export default function () {
  return router.middleware();
}
