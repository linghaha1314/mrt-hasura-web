const debug = require('debug')('koa-static')
const { resolve } = require('path')
const assert = require('assert')
const send = require('koa-send')

/**
 * Expose `serve()`.
 */

module.exports = serve

/**
 * Serve static files from `root`.
 *
 * @param {String} root
 * @param {Object} [opts]
 * @return {Function}
 * @api public
 */

function serve (root, opts) {
    opts = Object.assign({}, opts)

    assert(root, 'root directory is required to serve files')

    // options
    debug('static "%s" %j', root, opts)
    opts.pc = resolve(root)
    opts.mobile = resolve(opts.mobile)
    if (opts.index !== false) opts.index = opts.index || 'index.html'

    if (!opts.defer) {
        return async function serve (ctx, next) {
            let done = false

            if (ctx.method === 'HEAD' || ctx.method === 'GET') {
                try {
                    if (ctx.headers['user-agent'].indexOf('Mobile') > -1) {
                        opts.root = opts.mobile
                    } else {
                        if (ctx.host == '117.159.24.46:3002') {
                            opts.root = "./portal"
                        } else {
                            opts.root = opts.pc
                        }
                    }
                    done = await send(ctx, ctx.path, opts)
                } catch (err) {
                    if (err.status !== 404) {
                        throw err
                    }
                }
            }

            if (!done) {
                await next()
            }
        }
    }

    return async function serve (ctx, next) {
        await next()

        if (ctx.method !== 'HEAD' && ctx.method !== 'GET') return
        // response is already handled
        if (ctx.body != null || ctx.status !== 404) return // eslint-disable-line

        try {
            await send(ctx, ctx.path, opts)
        } catch (err) {
            if (err.status !== 404) {
                throw err
            }
        }
    }
}

