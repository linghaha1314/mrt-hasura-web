const config = {
    // refUrl: "http://192.168.11.35:9090", //crud服务
    refUrl: "http://zyk.mrtcloud.com:8888", //crud服务
    // poolObj: {
    //     user: 'postgres', host: '192.168.11.35', database: 'postgres', password: '1234', port: 5436
    // }
    poolObj: {
        user: 'postgres', host: '116.63.181.221', database: 'postgres', password: '1234', port: 51436,
    }
}


// const config = {
//     refUrl: "http://127.0.0.1:8080", //crud服务
//     poolObj: {
//         user: 'postgres', host: '127.0.0.1', database: 'postgres', password: '1234', port: 5433
//     }
// }
module.exports = config;
