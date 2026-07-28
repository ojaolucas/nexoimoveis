const session = require('express-session');
const db = require('./database');
require('dotenv').config();

// Custom Store to persist sessions in PostgreSQL (Supabase)
// This prevents user logout when the NodeJS server restarts during watch mode updates.
class PostgresStore extends session.Store {
  constructor() {
    super();
    // Create the session table asynchronously if it does not exist
    db.query(`
      CREATE TABLE IF NOT EXISTS session (
        sid varchar PRIMARY KEY,
        sess json NOT NULL,
        expire timestamp(6) NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON session ("expire");
    `).catch(err => console.error('[Session] Error creating session table:', err.message));

    // Clear expired sessions periodically (every 1 hour)
    setInterval(() => {
      db.query('DELETE FROM session WHERE expire < NOW()')
        .catch(err => console.error('[Session] Error clearing expired sessions:', err.message));
    }, 60 * 60 * 1000);
  }

  get(sid, callback) {
    db.query('SELECT sess FROM session WHERE sid = $1 AND expire >= NOW()', [sid])
      .then(res => {
        if (res.rows.length === 0) {
          return callback(null, null);
        }
        callback(null, res.rows[0].sess);
      })
      .catch(err => callback(err));
  }

  set(sid, sess, callback) {
    const expire = new Date(Date.now() + (sess.cookie.maxAge || 24 * 60 * 60 * 1000));
    db.query(
      `INSERT INTO session (sid, sess, expire) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (sid) 
       DO UPDATE SET sess = $2, expire = $3`,
      [sid, JSON.stringify(sess), expire]
    )
      .then(() => callback(null))
      .catch(err => callback(err));
  }

  destroy(sid, callback) {
    db.query('DELETE FROM session WHERE sid = $1', [sid])
      .then(() => callback(null))
      .catch(err => callback(err));
  }
}

const sessionMiddleware = session({
  store: new PostgresStore(),
  secret: process.env.SESSION_SECRET || 'nexomoveis_default_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
  },
});

module.exports = sessionMiddleware;
