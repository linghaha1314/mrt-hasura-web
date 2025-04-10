const config = {
    // refUrl: "http://zyk.mrtcloud.com:8888", //crud服务
    // poolObj: {
    //     user: 'postgres', host: '116.63.181.221', database: 'postgres', password: '1234', port: 51436,
    // }
    refUrl: "http://172.25.255.54:8080", //crud服务
    poolObj: {
        user: 'postgres', host: '172.25.255.54', database: 'postgres', password: 'kbds1234', port: 5432
    }
    // refUrl: "http://192.168.11.28:9090", //crud服务
    // poolObj: {
    //     user: 'postgres', host: '192.168.11.28', database: 'postgres', password: '1234', port: 5436,
    // }
    // refUrl: "http://192.168.11.11:6004", //crud服务
    // poolObj: {
    //     user: 'postgres', host: '116.63.181.221', database: 'postgres', password: '1234', port: 51436,
    // }
}
module.exports = config;
