//基础接口
const {
    getListByPage,
    getMenuTree,
    create,
    deleteById,
    getList,
    updateById,
    getDataById,
    getBeforeNext,
    deleteMultiple,
    createUpdateById,
    deleteMultiCondition,
    refUrl,
    dictionaryDataByTypeCode,
    validLogin,
    createMultiple,
    verify,
    getUserByUsername,
    getApi,
    deconstructionData,
    DateToStr,
    invertCtxData
} = require("../server/user");
const request = require("request-promise");
const CryptoJS = require("crypto-js");
const jsonwebtoken = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const mime = require("mime-types");
const koaBody = require('koa-body')({
    multipart: true, uploadDir: '.', formidable: {
        maxFileSize: 2000000 * 1024 * 1024	// 设置上传文件大小最大限制，默认2M
    }
})
module.exports = (router) => {
    //基础接口
    router.post(`/create`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = await create(ctx, next);
        if (data && data.severity !== 'ERROR') {
            ctx.body = {
                id: data, success: true, msg: '添加成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '请确认字段是否重复！'
        }
    });

    router.post(`/createMultiple`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = await createMultiple(ctx, next);
        if (data && data.severity !== 'ERROR') {
            ctx.body = {
                id: data, success: true, msg: '添加成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '请确认字段是否重复！'
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
        const isNotSetList = ctx.request.query['isNotSetList'] ?? false
        delete ctx.request.query.isNotSetList;
        const data = await getList(ctx, next);
        let parentData = [];
        if (!isNotSetList) {
            parentData = data.list.filter(res => !res.parentId);
            const childData = data.list.filter(res => res.parentId);
            getMenuTree(parentData, childData); //如果存在父子关系，变成树状结构
        } else {
            parentData = data.list;
        }
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

    router.get(`/getListByPageNotTree`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl.replace(/NotTree/, '');
        const data = await getListByPage(ctx, next);
        ctx.body = {
            list: data.list, total: data.total, success: true, msg: '查询成功！'
        }
    });

    router.post(`/updateById`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = await updateById(ctx, next);
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
            console.log(data)
            ctx.body = {
                data: data[0], success: true, msg: '查询成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '查询失败！'
        }
    });

    router.post(`/getDataByIdMore`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = await getDataById(ctx, next);
        if (data) {
            ctx.body = {
                data: data, success: true, msg: '查询成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '查询失败！'
        }
    });

    router.post(`/getBeforeNext`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = await getBeforeNext(ctx, next);
        if (data) {
            ctx.body = {
                data: data, success: true, msg: '查询成功！'
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

    router.post(`/createUpdateById`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const sum = await createUpdateById(ctx, next);
        if (sum === ctx.request.body.list.length) {
            ctx.body = {
                data: sum, success: true, msg: '设置成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '失败！'
        }
    });

    router.post(`/createUpdateByList`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const tableName = ctx.request.realUrl.split('/')[1];
        const deleteKey = ctx.request.body.deleteKey || 'id'
        const list = ctx.request.body.list;
        console.log(deleteKey, tableName, ctx.request.body)
        if (ctx.request.body.id) {
            await deleteById(invertCtxData({[deleteKey]: ctx.request.body.id}, `/${tableName}/deleteById`));
        }
        for (const res of list) {
            await create(invertCtxData({staffId: res.staffId, courseId: res.courseId}, `/${tableName}/create`));
        }
        ctx.body = {
            success: true, msg: '设置成功！'
        }
    });

    //多条件删除
    router.post(`/deleteMultiCondition`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = await deleteMultiCondition(ctx, next);
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

    router.post(`/verify`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = ctx.request.body.list?.length > 0 ? await verify(ctx, next) : [];
        if (data) {
            ctx.body = {
                list: data, success: true, msg: '成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '失败！'
        }
    });

    //删除层级，多条件删除，包括and,or

    router.get(`/api`, async (ctx) => {
        // ctx.set('X-Response-Url', refUrl + ctx.request.url);
        const response = await request({
            method: ctx.request.url.indexOf('get') ? 'GET' : ctx.method,
            url: refUrl + ctx.request.realUrl.replace(/\/api\/rest/, ''),
            headers: {
                "content-type": ctx.header['content-type'],
            },
            body: ctx.request.body,
            json: true
        });
        if (response) {
            ctx.body = {
                data: [], success: true, msg: '成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '失败！'
        }
    });

    //批量导入
    router.post(`/import`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const uniqueKey = ctx.request.body.uniqueKey || 'name';
        const tableName = ctx.request.url.split('/')[1];
        const list = ctx.request.body.list;
        let data = {};
        //存在就修改，不存在就新增
        try {
            for (const res of list) {
                const isExistArr = await getDataById(invertCtxData({[uniqueKey]: res[uniqueKey]}, `/${tableName}/getListByPage`));
                if (isExistArr.length > 0) {
                    data = await updateById(invertCtxData({id: isExistArr[0].id, ...res}, `/${tableName}/updateById`));
                } else {
                    data = await create(invertCtxData(res, `/${tableName}/create`));
                }
            }
            ctx.body = {
                insertCount: list.length, success: true, msg: '导入成功！'
            }
        } catch (err) {
            ctx.body = {
                error: err?.detail, success: false, msg: err?.detail || '导入失败！'
            }
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
    router.post('/login', async (ctx) => {
        blockToken = {}
        const bytes = CryptoJS.AES.decrypt(ctx.request.body.password, 'kb12315')
        const originalText = bytes.toString(CryptoJS.enc.Utf8)
        ctx.request.body.password = originalText
        const result = await validLogin(ctx.request.body);
        ctx.body = result.success ? {
            ...result, token: jsonwebtoken.sign({
                data: {
                    id: result.id, name: ctx.request.body.username
                }, exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 60 seconds * 60 minutes = 1 hour
            }, 'kbds random secret'),
        } : result;
    });

    router.post('/dingLogin', async (ctx) => {
        const result = await request.post(`http://127.0.0.1:8090/login?authCode=${ctx.request.body.authCode}`);
        const r = JSON.parse(result);
        const username = r.result.job_number;
        const user = await getUserByUsername(username);
        if (user == null) {
            ctx.body = {success: false};
            return;
        }
        ctx.body = {
            id: user.id, msg: '钉钉免登录', success: true, token: jsonwebtoken.sign({
                data: {
                    id: user.id, name: r.result.job_number
                }, exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 60 seconds * 60 minutes = 1 hour
            }, 'kbds random secret')
        };
    });

    router.get(`/user/getAll`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = await getApi(ctx, next);
        if (data) {
            ctx.body = {
                list: data.list, success: true, msg: '查询成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '失败！'
        }
    });

    router.get('/getUserInfo', async (ctx, next) => {
        if (ctx.getUserId === undefined && ctx.session.user === undefined) {
            ctx.body = {
                Message: '未登录', status: 202, success: false, data: null
            }
            return;
        }
        let token = null;
        if (ctx.getUserId === undefined && ctx.session.user) {
            const casUser = ctx.session.user;
            const old = await getListByPage(invertCtxData({username: casUser.username}, '/user/getListByPage', 'get'), false);
            if (old.total == 0) {
                const result = await create(invertCtxData({
                    username: casUser.username,
                    password: CryptoJS.AES.encrypt(casUser.username, 'kb12315').toString(),
                    name: casUser.staffName,
                    jobNum: casUser.serialNo,
                    majorId: null,
                    sectionId: null,
                    mobile: casUser.mobile
                }, '/user/createUser', 'post', 'getApi'));
                ctx.request.query = {id: result.rows[0].id};
            } else {
                ctx.request.query = {id: old.list[0].id};
            }
            token = jsonwebtoken.sign({
                data: {
                    id: ctx.request.query.id, name: casUser.username
                }, exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 60 seconds * 60 minutes = 1 hour
            }, 'kbds random secret')
        }
        if (ctx.request.query.id === undefined) {
            ctx.request.query = {id: ctx.getUserId};
        }
        const data = await getApi(ctx, next);
        const rr = deconstructionData(data.data);
        rr.currentRole = rr.currentRole[0]
        //获取当前登录用户的个人信息
        ctx.body = {
            Message: '', status: 200, success: true, data: rr, token: token
        }
    });

    router.post(`/user/resetPass`, async (ctx, next) => {
        ctx.request.url = '/user/updateById'
        ctx.request.body.change = {password: CryptoJS.AES.encrypt('zzrm1111', 'kb12315').toString()}
        const data = await getApi(ctx, next);
        if (data) {
            ctx.body = {
                id: data, success: true, msg: '重置成功！'
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

    //读取图片
    router.get('/attachs/:name', ctx => {
        try {
            // const filePath = decodeURI(path.join(__dirname.split('/router')[0], ctx.url));
            const filePath = decodeURI(path.join(__dirname.split('router')[0], ctx.url));
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
            const nameString = name.replace(/([.][^.]+)$/, '') + '-' + DateToStr(new Date()) + '.' + ((name.match(/([^.]+)$/)) || [])[1]
            await fs.copyFileSync(path, `attachs/${nameString}`)
            ctx.body = {
                success: true, msg: '上传成功！', data: {
                    path: '/attachs/' + nameString, name: name
                }
            }
        } catch (err) {
            // console.log(`error ${err.message}`)
            // await ctx.render('error', {
            //     message: err.message
            // })
        }
    });

    // router.post('/public/removeFile', koaBody, async ctx => {
    //     try {
    //         const {name} = ctx.request.files.file;
    //         fs.unlinkSync(`attachs/${name}.txt`);
    //         ctx.body = {
    //             success: true, msg: '删除成功！', data: {
    //                 path: '/attachs/' + name, name: name
    //             }
    //         }
    //     } catch (err) {
    //         // console.log(`error ${err.message}`)
    //         // await ctx.render('error', {
    //         //     message: err.message
    //         // })
    //     }
    // });

    router.post('/public/uploadEditor', koaBody, async ctx => {
        try {
            const {
                path, name
            } = ctx.request.files.file;
            const nameString = name.replace(/([.][^.]+)$/, '') + DateToStr(new Date()) + '.' + ((name.match(/([^.]+)$/)) || [])[1]
            await fs.copyFileSync(path, `attachs/${nameString}`)
            ctx.body = {
                errno: 0, success: true, msg: '上传成功！', data: [{
                    url: '/attachs/' + nameString, alt: name, href: "", path: '/attachs/' + nameString, name: name
                },

                ]
            }
        } catch (err) {
            // console.log(`error ${err.message}`)
            // await ctx.render('error', {
            //     message: err.message
            // })
        }
    });

}
