const route = require('../route-api.cjs');
module.exports = (request, response) => {
  if (request.body !== undefined) {
    const body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
    const adapter = { method: request.method, async *[Symbol.asyncIterator]() { yield body; } };
    return route(adapter, response);
  }
  return route(request, response);
};
