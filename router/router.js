const jsonwebtoken = require('jsonwebtoken')
const mime = require('mime-types')
const koaBody = require('koa-body')({
    multipart: true, uploadDir: '.'
})
const {
    getApi,
    validLogin,
    getMenuTree,
    updateById,
    create,
    deleteById,
    changeDataTree,
    covertColumnByType,
    dictionaryDataByTypeCode,
    getList,
    getListByPage,
    getDataById,
    deleteMultiple
} = require('../server/user');
const fs = require("fs");
const path = require("path");
const pool = require("../utils/pool");

module.exports = (router) => {
    //基础接口
    router.post(`/create`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = await create(ctx, next);
        if (data) {
            ctx.body = {
                id: data, success: true, msg: '添加成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '新增失败！'
        }
    });
    router.post(`/deleteById`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = await deleteById(ctx, next);
        if (data) {
            ctx.body = {
                data, success: true, msg: '删除成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '删除失败!'
        }
    });
    router.get(`/getList`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = await getList(ctx, next);
        const parentData = data.list.filter(res => !res.parentId);
        const childData = data.list.filter(res => res.parentId);
        getMenuTree(parentData, childData); //如果存在父子关系，变成树状结构
        ctx.body = {
            list: parentData, total: data.total, success: true, msg: '查询成功！'
        }
    });
    router.get(`/getListByPage`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = await getListByPage(ctx, next);
        const parentData = data.list.filter(res => !res.parentId);
        const childData = data.list.filter(res => res.parentId);
        getMenuTree(parentData, childData); //如果存在父子关系，变成树状结构
        ctx.body = {
            list: parentData, total: data.total, success: true, msg: '查询成功！'
        }
    });
    router.post(`/updateById`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = await updateById(ctx, next);
        console.log('===>>>', data);
        if (data) {
            ctx.body = {
                data: data, success: true, msg: '更新成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '更新失败！'
        }
    });
    router.post(`/getDataById`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = await getDataById(ctx, next);
        if (data) {
            console.log('???', data)
            ctx.body = {
                data: data[0], success: true, msg: '查询成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '查询失败！'
        }
    });
    router.post(`/deleteMultiple`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = await deleteMultiple(ctx, next);
        if (data) {
            ctx.body = {
                data: data, success: true, msg: '删除成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '删除失败！'
        }
    });
    //字典数据获取
    router.post(`/dictionaryData/getByTypeCode`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = await dictionaryDataByTypeCode(ctx, next);
        if (data) {
            ctx.body = {
                list: data, success: true, msg: '查询成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '失败！'
        }
    });

    //自定义接口
    router.post('/login', async (ctx, next) => {
        const result = await validLogin(ctx.request.body);
        ctx.body = result.success ? {
            ...result, token: jsonwebtoken.sign({
                data: {
                    id: result.id, name: ctx.request.body.username
                }, exp: Math.floor(Date.now() / 1000) + (60 * 60 * 10), // 60 seconds * 60 minutes = 1 hour
            }, 'kbds random secret'),
        } : result;
    });
    router.get('/getUserInfo', async (ctx, next) => {
        const data = await getApi(ctx, next);
        //获取当前登录用户的个人信息
        ctx.body = {
            Message: '', status: 200, success: true, data: data.data
        }
    });
    router.post(`/user/resetPass`, async (ctx, next) => {
        const data = await getApi(ctx, next);
        if (data) {
            ctx.body = {
                id: data.data['returning'][0].id, success: true, msg: '重置成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '重置失败！'
        }

    });
    router.get(`/menu/list`, async (ctx, next) => {
        const data = await getApi(ctx, next);
        const parentData = data.list.filter(res => !res.parentId);
        const childData = data.list.filter(res => res.parentId);
        getMenuTree(parentData, childData);
        ctx.body = {
            success: true, msg: '获取成功', list: parentData
        }
    });
    router.post(`/user/createUser`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const roles = ctx.request.body['roles']
        delete ctx.request.body['roles']
        const data = await create(ctx, next);
        roles.forEach(res => {
            pool.query(`insert into  kb_user_role (user_id,role_id) VALUES($1,$2);`, [data.rows[0].id, res]);
        })
        if (data) {
            ctx.body = {
                id: data, success: true, msg: '添加成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '新增失败！'
        }
    });
    router.get(`/user/getUserListByPage`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = await getApi(ctx, next);
        data.list.forEach(res => {
            res['roles'] = [];
            (res['roleList'] || []).forEach(rr => {
                res['roles'].push(rr['roleId'])
            })
            delete data.list['roleList']
        })
        ctx.body = {
            list: data.list, total: data.total, success: true, msg: '查询成功！'
        }
    });
    router.post(`/user/deleteUserById`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        await pool.query(`delete from kb_user_role where user_id = $1`, [ctx.request.body.id]);
        const data = await deleteById(ctx, next);
        //根据userId；删除
        ctx.body = {
            list: data.list, total: data.total, success: true, msg: '查询成功！'
        }
    });
    router.post(`/user/updateUserById`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const roles = ctx.request.body['roles']
        delete ctx.request.body['roles']
        const data = await updateById(ctx, next);
        //先价差有没有，没有在
        roles.forEach(res => {
            pool.query(`insert into  kb_user_role (user_id,role_id) VALUES($1,$2);`, [ctx.request.body.id, res]);
        })
        if (data) {
            ctx.body = {
                data: data, success: true, msg: '更新成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '更新失败！'
        }
    });

    //client接口
    router.post('/client/login', async (ctx) => {
        const result = await validLogin(ctx.request.body);
        ctx.body = result.success ? {
            ...result, token: jsonwebtoken.sign({
                data: {
                    id: result.id, name: ctx.request.body.username
                }, exp: Math.floor(Date.now() / 1000) + (60 * 60), // 60 seconds * 60 minutes = 1 hour
            }, 'kbds random secret'),
        } : result;
    });
    router.get(`/chapters/getListByCourseId`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = (await getApi(ctx, next)).data;
        const parentData = data.list.filter(res => !res.parentId);
        const childData = data.list.filter(res => res.parentId);
        getMenuTree(parentData, childData); //如果存在父子关系，变成树状结构
        ctx.body = {
            list: parentData, total: data.total.count, success: true, msg: '查询成功！'
        }
    });

    //读取图片
    router.get('/attachs/:name', ctx => {
        console.log(ctx, ctx.url)
        try {
            const filePath = path.join(__dirname.split('/router')[0], ctx.url);
            const file = fs.readFileSync(filePath);
            let mimeType = mime.lookup(filePath);
            ctx.set('content-type', mimeType);
            ctx.body = file;
        } catch (err) {
            console.log(`error ${err.message}`)
        }
    });
    router.post('/public/upload', koaBody, async ctx => {
        try {
            const {
                path, name
            } = ctx.request.files.file;
            await fs.copyFileSync(path, `attachs/${name}`)
            ctx.body = {
                success: true, msg: '上传成功！', data: {
                    path: '/attachs/' + name, name: name
                }
            }
        } catch (err) {
            console.log(`error ${err.message}`)
            // await ctx.render('error', {
            //     message: err.message
            // })
        }
    });
    return router;
};
