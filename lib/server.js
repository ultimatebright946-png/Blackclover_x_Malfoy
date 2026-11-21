'use strict';

// Shared HTTP bootstrap: Website + API + WhatsApp.
// Discord integration temporarily disabled.

const mini = require('./mini');
const db = require('./db');

function start(opts) {
  opts = opts || {};

  const app = mini();

  // Platform-specific routes
  if (opts.routes) {
    opts.routes(app);
  }

  // Health check
  app.get('/health', (q, r) => r.send('ok'));

  // Website
  require('./web').mount(app);

  // Start HTTP server
  const PORT = process.env.PORT || 3000;

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(
      'HTTP on ' + PORT +
      ' | data dir ' + db.store.paths.DATA_DIR
    );
  });

  // WebSocket duels
  try {
    require('./duel').attach(
      server,
      require('./web').userFromReq
    );
  } catch (e) {
    console.log('[duel] websocket duels disabled: ' + e.message);
  }

  // Render keep-alive
  if (process.env.RENDER_EXTERNAL_URL) {
    setInterval(() => {
      fetch(process.env.RENDER_EXTERNAL_URL + '/health')
        .catch(() => {});
    }, 10 * 60 * 1000).unref();
  }

  // Error handling
  process.on('unhandledRejection', e => {
    console.log('UNHANDLED', e && e.message || e);
  });

  process.on('uncaughtException', e => {
    console.log('UNCAUGHT', e && e.message || e);
  });

  return { app, server };
}

module.exports = { start };
