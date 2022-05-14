const Koa = require('koa');
const app = new Koa();
const path = require('path');
const static = require('koa-static');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const session = require('koa-session');
const jwt = require('koa-jwt');
const router = new Router();
const control = require('./router/router');
const request = require('request-promise');
const cors = require('koa2-cors');
const jsonwebtoken = require("jsonwebtoken");
//编译后静态路径
const staticPath = './frontend';
//crud服务
const refUrl = "http://zyk.mrtcloud.com:8888";

app.keys = ['kbds random secret'];
app.use(session(app));
// 添加单点登录
const CasClient = require('./utils/cas-client');
const cas = new CasClient({
    cas_url: 'http://localhost:8080',
    service_url: 'http://localhost:3001',
    cas_login: '/login',
    cas_logout: '/logout',
    cas_validate: '/serviceValidate'
});
app.use(cas.auth);
//应用静态资源
app.use(static(path.join(__dirname, staticPath)));
//数据处理
app.use(bodyParser());
app.use(cors());

//日志记录
app.use(async (ctx, next) => {
    ctx.getUserId = jsonwebtoken.decode(ctx.request.req.headers.authorization?.substring(7) || null)?.data.id;
    await next();
    const rt = ctx.response.get('X-Response-Time');
    const reUrl = ctx.response.get('X-Response-Url');
    // if (ctx.originalUrl.indexOf('attachs') > -1) {
    //     const filePath = path.join(__dirname, ctx.url);
    //     const file = fs.readFileSync(filePath); //读取文件
    //     let mimeType = mime.lookup(filePath); //读取图片文件类型
    //     ctx.set('content-type', mimeType); //设置返回类型
    //     ctx.body = file; //返回图片
    // }
    if (reUrl.length > 0) {
        console.log(`${ctx.method} ${ctx.url} redirect to ${reUrl} - ${rt}`);
    } else {
        console.log(`${ctx.method} ${ctx.url} - ${rt}`);
    }
});

//监听器
app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    ctx.set('X-Response-Time', `${ms}ms`);
});

//错误处理
app.use(function (ctx, next) {
    return next().catch((err) => {
        ctx.body = {
            success: false, msg: err.stack
        }
        ctx.error = err;
        console.error(err)
        throw err;
    });
});


// 不过滤的请求路径
const ignoreUrl = [/\/public/, /\/login/, /\/attachs/, /\/chapters.*$/, /\/ps.*$/, /\/api.*$/, /\/swiper\/getListByPage/, /\/getListByPage/, /\/getByTypeCode/, /\/getUserInfo/, /\/getBeforeNext/, /\/courses\/getDataById/, /\/comment.*$/, /\/courseType.*$/, /\/course.*$/, /\/homeColumns.*$/];
// Middleware below this line is only reached if JWT token is valid
app.use(jwt({
    secret: 'kbds random secret'
}).unless({
    path: ignoreUrl,   //引入文件
}));


//路由,跳转到基础接口
app.use(async (ctx, next) => {
    const url = (ctx.request.url.replace(/([?][^?]+)$/, ''))
    ctx.request.realUrl = ctx.request.url
    if (ctx.request.url.indexOf('/api') > -1) {
        ctx.set('X-Response-Url', url);
        const response = await request({
            method: ctx.method, url: refUrl + ctx.request.url, headers: {
                "content-type": ctx.header['content-type'],
            }, body: ctx.request.body, json: true
        });
        ctx.body = {
            data: response, success: true, msg: '查询成功！'
        }
    } else {
        switch (url.split('/')[2]) {
            case 'create':
                ctx.request.url = '/create'
                break;
            case 'deleteById':
                ctx.request.url = '/deleteById'
                break;
            case 'getList':
                ctx.request.url = '/getList'
                break;
            case 'getListByPage':
                ctx.request.url = '/getListByPage'
                break;
            case 'getDataById':
                ctx.request.url = '/getDataById'
                break;
            case 'getBeforeNext':
                ctx.request.url = '/getBeforeNext'
                break;
            case 'updateById':
                ctx.request.url = '/updateById'
                break;
            case 'deleteMultiple':
                ctx.request.url = '/deleteMultiple'
                break;
            case 'import':
                ctx.request.url = '/import'
                break;
            default:
                break;
        }
    }
    await next();
});

//接口
app
    .use(control(router).routes())
    .use(router.allowedMethods());
//启动端口
app.listen(3001);

console.log(`listening on port 3001, http://localhost:3001`);
