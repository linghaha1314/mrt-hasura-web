const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: '192.168.0.166',
    database: 'postgres',
    password: '1234',
    port: 5436,
  });
// the pool will emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
});
module.exports = pool;
