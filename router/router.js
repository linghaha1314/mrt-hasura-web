const jsonwebtoken = require('jsonwebtoken')
const mime = require('mime-types')
const koaBody = require('koa-bodyparser')({
    multipart: true,
    uploadDir: '.'
})
const {getApi, validLogin, getMenuTree, changeDataTree} = require('../server/user');

module.exports = (router) => {
    //基础接口
    router.post(`/create`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = await getApi(ctx, next);
        if (data) {
            ctx.body = {
                id: data.data['returning'][0],
                success: true,
                msg: '添加成功！'
            }
            return;
        }
        ctx.body = {
            success: false,
            msg: '新增失败！'
        }
    });
    router.post(`/deleteById`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = await getApi(ctx, next);
        if (data) {
            ctx.body = {
                data,
                success: true,
                msg: '删除成功！'
            }
            return;
        }
        ctx.body = {
            success: false,
            msg: '删除失败!'
        }
    });
    router.get(`/getListByPage`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = await getApi(ctx, next);
        // const list = await changeDataTree(data.list, 'roles');
        ctx.body = {
            list: data.list,
            total: data.total['aggregate'].count,
            success: true,
            msg: '查询成功！'
        }
    });
    router.post(`/updateById`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        ctx.request.body = {change: ctx.request.body, id: ctx.request.body.id}
        const data = await getApi(ctx, next);
        // const list = await changeDataTree([{...data.data}], 'roles');
        if (data) {
            ctx.body = {
                data: data.data,
                success: true,
                msg: '更新成功！'
            }
            return;
        }
        ctx.body = {
            success: false,
            msg: '更新失败！'
        }
    });

    router.post('/login', async (ctx, next) => {
        const result = await validLogin(ctx.request.body);
        ctx.body = result.success ? {
            ...result, token: jsonwebtoken.sign({
                data: {
                    id: result.id,
                    name: ctx.request.body.username
                },
                exp: Math.floor(Date.now() / 1000) + (60 * 60), // 60 seconds * 60 minutes = 1 hour
            }, 'kbds random secret'),
        } : result;
    });
    router.get('/getUserInfo', async (ctx, next) => {
        ctx.body = {
            Message: '',
            status: 200,
            success: true,
            data: [{id: 1, name: 'hello'}]
        }
    });
    router.post(`/user/resetPass`, async (ctx, next) => {
        const data = await getApi(ctx, next);
        if (data) {
            ctx.body = {
                id: data.data['returning'][0].id,
                success: true,
                msg: '重置成功！'
            }
            return;
        }
        ctx.body = {
            success: false,
            msg: '重置失败！'
        }

    });
    router.post(`/video/deleteMultiples`, async (ctx, next) => {
        ctx.request.body = {list: ['']}   //不晓得该是什么类型！！！
        const data = await getApi(ctx, next);
        if (data) {
            ctx.body = {
                data,
                success: true,
                msg: '删除成功！'
            }
            return;
        }
        ctx.body = {
            success: false,
            msg: '删除失败！'
        }
    });

    router.get(`/menu/list`, async (ctx, next) => {
        const data = await getApi(ctx, next);
        const parentData = data.data.filter(res => !res.parentId);
        const childData = data.data.filter(res => res.parentId);
        getMenuTree(parentData, childData);
        ctx.body = {
            success: true, msg: '获取成功', data: parentData
        }
    });
    router.post('/public/upload', koaBody, async ctx => {
        try {
            const {
                path,
                name,
                type
            } = ctx.request.files.file;
            const fileExtension = mime.extension(type)
            console.log(`path: ${path}`)
            console.log(`filename: ${name}`)
            console.log(`type: ${type}`)
            console.log(`fileExtension: ${fileExtension}`)
            await fs.copy(path, `public/avatars/${name}`)
            ctx.redirect('/')
        } catch (err) {
            console.log(`error ${err.message}`)
            await ctx.render('error', {
                message: err.message
            })
        }
    });

    return router;
};
