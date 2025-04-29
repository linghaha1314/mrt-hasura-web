const config = {
    // refUrl: "http://zyk.mrtcloud.com:8888", //crud服务
    // poolObj: {
    //     user: 'postgres', host: '116.63.181.221', database: 'postgres', password: '1234', port: 51436,
    // }
    refUrl: "http://172.25.255.54:8080", //crud服务
    poolObj: {
        user: 'postgres', host: '172.25.255.54', database: 'postgres', password: 'kbds1234', port: 5432
    }
    // refUrl: "http://192.168.1.60:5800", //crud服务
    // poolObj: {
    //     user: 'postgres', host: '192.168.1.60', database: 'postgres', password: '1234', port: 5432,
    //     idleTimeoutMillis: 300000, // 设置空闲超时时间
    //     connectionTimeoutMillis: 300000 // 设置连接超时时间
    // }
}
module.exports = config;
