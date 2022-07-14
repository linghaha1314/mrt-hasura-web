const {Pool} = require('pg');
const {poolObj} = require('../config')
const pool = new Pool(poolObj);
// // the pool will emit an error on behalf of any idle clients
// // it contains if a backend error or network partition happens
// pool.on('error', (err, client) => {
//     console.error('Unexpected error on idle client', err)
//     process.exit(-1)
// });
// const pool = new Pool({
//     user: 'postgres',
//     host: '127.0.0.1',
//     database: 'postgres',
//     password: '1234',
//     port: 5433,
// });
// the pool will emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err)
    process.exit(-1)
});
module.exports = pool;
