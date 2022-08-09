const request = require('request-promise');
const convert = require('xml-js');
const cache = require('memory-cache');
/**
 * cas 单点登录koa验证处理
 * @author Onion
 * @type {CasClient}
 */
module.exports = (function () {
    function isEmpty(val) {
        if (val !== undefined && val != null && (val + '').trim() !== '') {
            return false;
        } else {
            return true;
        }
    }

    function CasClient(options) {
        CasClient.prototype.options = options;
    }

    CasClient.prototype.auth = async function (ctx, next) {
        const options = CasClient.prototype.options;
        const tgc = ctx.cookies.get('TGC');
        if (isEmpty(ctx.session.user) && isEmpty(tgc)) {
            ctx.session.validate = false;
            const ticket = ctx.request.query['ticket'];
            if (isEmpty(ticket)) {
                await CasClient.prototype.login(ctx, options, next);
            } else {
                await CasClient.prototype.validate(ctx, options, next);
            }
        } else {
            if (ctx.session.user == null) {
                ctx.session.validate = false;
            }
            await CasClient.prototype.validate(ctx, options, next);
        }
        await CasClient.prototype.logout(ctx, options, next);
        await CasClient.prototype.validateTgc(ctx, options, next);
        await next();
    };

    CasClient.prototype.login = async function (ctx, options, next) {
        ctx.session.validate = false;
        // ctx.redirect(`${options.cas_url}${options.cas_login}?service=${options.service_url}`);
    };

    CasClient.prototype.validateTgc = async function (ctx, options, next) {
        const tgc = ctx.cookies.get('TGC');
        const ticket = ctx.request.query['ticket'];
        if ((!isEmpty(tgc) || isEmpty(ticket)) && !ctx.session.validate) {
            ctx.redirect(`${options.cas_url}${options.cas_login}?service=${options.service_url}`);
        }
    };

    CasClient.prototype.logout = async function (ctx, options, next) {
        if (ctx.request.path === options.cas_logout) {
            ctx.redirect(`${options.cas_url}${options.cas_logout}?service=${options.service_url}`);
        }
    };

    CasClient.prototype.validate = async function (ctx, options, next) {
        if (!ctx.session.validate) {
            const ticket = ctx.query['ticket'];
            if (!isEmpty(ticket)) {
                const response = await request({
                    method: 'GET',
                    url: `${options.cas_url}${options.cas_validate}?ticket=${ticket}&service=${options.service_url}`,
                    headers: {
                        "content-type": 'text/html'
                    }
                });
                const result = convert.xml2json(response, {
                    compact: true,
                    ignoreDeclaration: true,
                    ignoreInstruction: true,
                    ignoreAttributes: true,
                    ignoreComment: true,
                    ignoreCdata: true,
                    ignoreDoctype: true
                });
                const data = JSON.parse(result)['cas:serviceResponse'];
                if (data['cas:authenticationSuccess']) {
                    const user = data['cas:authenticationSuccess']['cas:attributes'];
                    const d = {};
                    for (const key in user) {
                        if (user.hasOwnProperty(key)) {
                            const element = user[key];
                            d[key.split(':')[1]] = element['_text'];
                        }
                    }
                    ctx.session.user = d;
                    ctx.session.validate = true;
                    const tgc = ctx.cookies.get('TGC');
                    cache.put(tgc, d.id);
                } else {
                    await CasClient.prototype.login(ctx, options, next);
                }
            }
        }
        if (ctx.session.user === undefined) {
            await CasClient.prototype.login(ctx, options, next);
        }
    };
    return CasClient;
}());
