const jsonwebtoken = require('jsonwebtoken')
const mime = require('mime-types')
const koaBody = require('koa-body')({
    multipart: true, uploadDir: '.', formidable: {
        maxFileSize: 2000000 * 1024 * 1024	// 设置上传文件大小最大限制，默认2M
    }
})
const CryptoJS = require('crypto-js');
const svgCaptcha = require('svg-captcha')
const {
    getApi,
    validLogin,
    getMenuTree,
    updateById,
    create,
    deleteById,
    getBeforeNext,
    refUrl,
    DateToStr,
    changeDataTree,
    deleteMultiCondition,
    covertColumnByType,
    deconstructionData,
    dictionaryDataByTypeCode,
    getList,
    getListByPage,
    getDataById,
    createUpdateById,
    getDataByIdMore,
    deleteMultiple
} = require('../server/user');
const fs = require("fs");
const path = require("path");
const pool = require("../utils/pool");
const request = require("request");

// const {default: xlsx} = require("node-xlsx");
async function createUpdateCourses(ctx, next = {}) {
    const typeIds = ctx.request.body.typeId
    const columnIds = ctx.request.body.columnId
    delete ctx.request.body.typeId
    delete ctx.request.body.columnId
    let result = {}
    delete ctx.request.body.id
    result = await create(ctx, next);
    let sum = 0;
    //typeId-课程类型存在
    for (const res of typeIds) {
        const newCtx = {
            request: {
                body: {
                    typeId: res, courseId: ctx.request.body.id || result.rows[0].id
                }, url: '/courseClass/create'
            }
        }
        const data = await create(newCtx, next);
        sum += data.rowCount
    }
    let sumColumn = 0;
    //columnId-课程栏目存在
    for (const res of columnIds) {
        const newCtx = {
            request: {
                body: {
                    columnId: res, courseId: ctx.request.body.id || result.rows[0].id
                }, url: '/courseColumn/create'
            }
        }
        const data = await create(newCtx, next);
        sumColumn += data.rowCount
    }
    return {courseData: result.rows[0]}
}

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
        const newCtx = ctx;
        let count = 0;
        for (const res of ctx.request.body) {
            newCtx.request.body = res
            const data = await create(newCtx, next);
            if (data.rowCount > 0) {
                count += data.rowCount
            }
        }
        if (count > 0) {
            ctx.body = {
                insertCount: count, success: true, msg: '添加成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '新增失败！'
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

    //菜单授权
    router.post(`/roleAuthority/update`, async (ctx, next) => {
        const newCtx = {
            request: {
                url: '/roleAuthority/deleteById', body: {
                    roleId: ctx.request.body.roleId
                }
            }
        }
        await deleteById(newCtx, next);
        const menuIds = ctx.request.body['menuIds'] || []
        let data = {};
        for (const res of menuIds) {
            const createNewCtx = {
                request: {
                    url: '/roleAuthority/create', body: {
                        roleId: ctx.request.body.roleId, menuId: res
                    }
                }
            }
            data = await create(createNewCtx, next);
        }
        if (data) {
            ctx.body = {
                success: true, msg: '授权成功！'
            }
        }
    });

    //栏目授权
    router.post(`/roleColumn/update`, async (ctx, next) => {
        const newCtx = {
            request: {
                url: '/roleColumn/deleteById', body: {
                    roleId: ctx.request.body.roleId
                }
            }
        }
        await deleteById(newCtx, next);
        const menuIds = ctx.request.body['menuIds'] || []
        for (const res of menuIds) {
            const createNewCtx = {
                request: {
                    url: '/roleColumn/create', body: {
                        roleId: ctx.request.body.roleId, menuId: res
                    }
                }
            }
            data = await create(createNewCtx, next);
        }
        if (data) {
            ctx.body = {
                data, success: true, msg: '授权成功！'
            }
        }
    });

    router.post(`/moreTable`, async (ctx, next) => {
        ctx.body = {
            success: true, msg: '授权成功！'
        }
    });

    //自定义接口
    router.post('/login', async (ctx) => {
        console.log(ctx.request.body.password, 88)
        const bytes = CryptoJS.AES.decrypt(ctx.request.body.password, 'kb12315')
        const originalText = bytes.toString(CryptoJS.enc.Utf8)
        ctx.request.body.password = originalText
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
        const rr = deconstructionData(data.data);
        rr.currentRole = rr.currentRole[0]
        //获取当前登录用户的个人信息
        ctx.body = {
            Message: '', status: 200, success: true, data: rr
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

    router.post(`/roleAuthority/getMenusByRoleId`, async (ctx, next) => {
        const data = await getApi(ctx, next);
        const list = [];
        data.list.forEach(res => {
            list.push(res['menuData'])
        })
        const parentData = list.filter(res => !res.parentId);
        const childData = list.filter(res => res.parentId);
        getMenuTree(parentData, childData);
        ctx.body = {
            success: true, msg: '获取成功', list: parentData
        }
    });

    router.post(`/roleColumn/getColumnByRoleId`, async (ctx, next) => {
        const data = await getApi(ctx, next);
        const list = [];
        data.list.forEach(res => {
            list.push(res['menuData'])
        })
        const parentData = list.filter(res => !res.parentId);
        const childData = list.filter(res => res.parentId);
        getMenuTree(parentData, childData);
        ctx.body = {
            success: true, msg: '获取成功', list: parentData
        }
    });

    router.post(`/user/createUser`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const roles = ctx.request.body['roles']
        console.log(roles, 89898)
        delete ctx.request.body['roles']
        const data = await create(ctx, next);
        if (roles) {
            roles.forEach(res => {
                pool.query(`insert into  kb_user_role (user_id,role_id) VALUES($1,$2);`, [data.rows[0].id, res]);
            })
        }
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
        data.list.forEach((res, index) => {
            res['roles'] = [];
            const roleList = [];
            (res['roleList'] || []).forEach(rr => {
                const obj = deconstructionData(rr);
                res['roles'].push(obj.roleId)
                roleList.push(obj)
            })
            data.list[index]['roleList'] = roleList
        })
        ctx.body = {
            list: data.list, total: data.total['aggregate'].count, success: true, msg: '查询成功！'
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
        const roles = ctx.request.body['roles'] || []
        delete ctx.request.body['roles']
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

    router.post('/userRole/createUpdate', async (ctx) => {
        const deleteCtx = {
            request: {
                body: {
                    userId: ctx.request.body.id
                }, url: '/userRole/deleteById'
            }
        }
        const deleteData = await deleteById(deleteCtx)
        const roles = ctx.request.body.roles
        for (const res of roles) {
            const index = roles.indexOf(res);
            const createCtx = {
                request: {
                    body: {
                        roleId: res, userId: ctx.request.body.id, isCurrentRole: index === 1 ? true : false
                    }, url: '/userRole/create'
                }
            }
            await create(createCtx)
        }
        if (deleteData) {
            ctx.body = {
                data: deleteData, success: true, msg: '更新成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '更新失败！'
        }
    })

    router.post('/userRole/updateCurrentRole', async (ctx) => {
        const getUserRoleCtx = {
            request: {
                method: 'GET', query: {
                    limit: 1000, offset: 0, userId: ctx.request.body.staffId
                }, url: '/userRole/getListByPage'
            }
        }
        const getData = await getListByPage(getUserRoleCtx)
        for (const res of getData.list) {
            const objCtx = {
                request: {
                    body: {
                        id: res.id, isCurrentRole: false
                    }, url: '/userRole/updateById'
                }
            }
            objCtx.request.body.isCurrentRole = res.roleId === ctx.request.body.currentRoleId ? true : false
            await updateById(objCtx)
        }
        ctx.body = {
            data: 1, success: true, msg: '更新成功！'
        }
    })

    router.post(`/exam/insert`, async (ctx) => {
        //先创建试卷；
        const examPaper = {
            request: {
                url: '/examPaper/create', body: {
                    name: ctx.request.body.name,
                    totalScore: ctx.request.body.totalScore,
                    number: ctx.request.body.number
                },
            }
        }
        const paperResult = await create(examPaper);
        //再创建题目；
        for (const res of ctx.request.body['questionList']) {
            const examTitle = {
                request: {
                    url: '/examTitle/create', body: {
                        name: res.name, type: res.type, score: res.score, sequence: res.sequence,
                    },
                }
            }
            const titleResult = await create(examTitle);
            //创建题目后，要创建试卷和试题的联合表
            const examPaperTitle = {
                request: {
                    url: '/examPaperTitle/create', body: {
                        paperId: paperResult.rows[0].id,
                        titleId: titleResult.rows[0].id,
                        score: res.score,
                        sequence: res.sequence
                    },
                }
            }
            const paperTitleResult = await create(examPaperTitle);
            //在创建选项；
            for (const dd of res.options) {
                const index = res.options.indexOf(dd);
                const examOptions = {
                    request: {
                        url: '/examOptions/create', body: {
                            name: dd.name, titleId: titleResult.rows[0].id, isRight: dd.isRight, sequence: index + 1
                        },
                    }
                }
                const optionResult = await create(examOptions);
            }
        }
    });

    router.post(`/exam/getQuestionList`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = await getApi(ctx, next);
        const list = []
        data.list.forEach(res => {
            res = {...res, ...res['titleData']}
            const resultOption = []
            res.options.forEach(r => {
                if (r.isRight) {
                    resultOption.push(r.id)
                }
            })
            res.resultOption = res.type === 'radio' ? resultOption[0] : resultOption
            delete res['titleData']
            list.push(res)
        })
        if (data) {
            ctx.body = {
                list: list, success: true, msg: '查询成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '失败！'
        }
    });

    router.get(`/lecturer/getLecturerListByPage`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = await getApi(ctx, next);
        const list = [];
        data.list.forEach(res => {
            let obj = {...res['userData'], ...res}
            //如果存在才替换，否则不替换；
            delete obj['userData']
            obj = {...obj, ...obj['sectionData'], ...obj['majorName']}
            delete obj['sectionData']
            delete obj['majorData']
            list.push(obj)
        })
        if (data) {
            ctx.body = {
                list: list, total: data['totalData']['aggregate'].count, success: true, msg: '查询成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '失败！'
        }
    });

    router.post(`/courseVerify/update`, async (ctx, next) => {
        const deleteCtx = {
            request: {
                body: {
                    courseId: ctx.request.body.courseId
                }, url: '/courseVerify/deleteById'
            }
        }
        await deleteById(deleteCtx, next);
        let sum = 0;
        for (const res of ctx.request.body['verifyList']) {
            const newCtx = {
                request: {
                    body: {
                        time: res.time, typeId: res.typeId, courseId: ctx.request.body.courseId
                    }, url: '/courseVerify/create'
                }
            }
            const data = await create(newCtx, next);
            console.log(data)
            sum += data.rowCount
        }
        if (sum === ctx.request.body['verifyList'].length) {
            ctx.body = {
                data: sum, success: true, msg: '设置成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '失败！'
        }
    });

    router.post(`/courseFiles/update`, async (ctx, next) => {
        const deleteCtx = {
            request: {
                body: {
                    courseId: ctx.request.body.courseId
                }, url: '/courseFiles/deleteById'
            }
        }
        await deleteById(deleteCtx, next);
        let sum = 0;
        for (const res of ctx.request.body['verifyList']) {
            const newCtx = {
                request: {
                    body: {
                        time: res.time, typeId: res.typeId, courseId: ctx.request.body.courseId
                    }, url: '/courseFiles/create'
                }
            }
            const data = await create(newCtx, next);
            console.log(data)
            sum += data.rowCount
        }
        if (sum === ctx.request.body['verifyList'].length) {
            ctx.body = {
                data: sum, success: true, msg: '设置成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '失败！'
        }
    });

    //创建工作流
    router.post(`/workflow/createProcess`, async (ctx) => {
        //创建工作流
        ctx.request.url = '/workflowStart/create'
        const approvalCtx = {
            request: {
                method: 'GET', query: {
                    limit: 1000, offset: 0, parentId: ctx.request.body['approvalProcessId'], sort: 'created asc'
                }, url: '/approvalProcessSet/getListByPage'
            }
        }
        const approvalData = await getListByPage(approvalCtx)
        ctx.request.body.steps = approvalData.list.length || 0
        ctx.request.body.currentRoleId = approvalData.list[0].roleId
        //设置当前工作流的步骤数
        const workData = covertColumnByType((await create(ctx)).rows, 2)
        //查询approvalId的具体流程
        for (const res of approvalData.list) {
            const index = approvalData.list.indexOf(res);
            const processDetailCtx = {
                request: {
                    body: {
                        workflowId: workData[0].id,
                        status: 11,
                        objectId: ctx.request.body.objectId,
                        roleId: res.roleId,
                        approvalProcessId: ctx.request.body['approvalProcessId'],
                        sequence: index + 1
                    }, url: '/processDetail/create'
                }

            }
            await create(processDetailCtx)
        }
        //设置课程的状态
        const updateCourseCtx = {
            request: {
                body: {
                    id: ctx.request.body.objectId, status: 11
                }, url: '/courses/updateById'
            }
        }
        const data = await updateById(updateCourseCtx)
        ctx.body = {
            list: data, success: true, msg: '提交成功！'
        }
    });

    //获取工作流详情
    router.post(`/workflowStart/getStepDetailList`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = await getApi(ctx)
        const list = data.list.length > 0 ? data.list[0].approvalList : [];
        const approvalList = [];
        list.forEach(res => {
            const obj = deconstructionData(res)
            approvalList.push(obj)
        })
        if (list) {
            ctx.body = {
                list: approvalList, success: true, msg: '查询成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '查询失败！'
        }
    });

    //工作流审批
    router.post(`/process/agree`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        //更新当前的审批步骤详情
        const updateCurrentCtx = {
            request: {
                body: {
                    id: ctx.request.body.id,
                    status: ctx.request.body.status,
                    remark: ctx.request.body.remark || null,
                    approvalDate: new Date().toISOString().replace(/Z/, "+00")
                }, url: '/processDetail/update'
            }
        }
        await updateById(updateCurrentCtx)
        console.log(111);
        /**/
        const workflowCtx = {
            request: {
                body: {
                    id: ctx.request.body.workflowId, status: 11, currentRoleId: null,
                }, url: '/workflowStart/updateById'
            }
        }
        /**/
        if (ctx.request.body.status === 0) {
            workflowCtx.request.body.status = 0;
        } else {
            //查询审批流程详情列表
            const approvalDetailListCtx = {
                request: {
                    method: 'GET', query: {
                        limit: 1000, offset: 0, workflowId: ctx.request.body['workflowId'], sort: 'sequence asc'
                    }, url: '/processDetail/getListByPage'
                }
            }
            const list = (await getListByPage(approvalDetailListCtx)).list || []
            //更新workflow
            list.forEach((rr, index) => {
                if (rr.id === ctx.request.body.id) {
                    if (index !== list.length - 1) {
                        workflowCtx.request.body.currentRoleId = (list[index + 1]).roleId
                    }
                }
            })
        }
        console.log(222)
        const courseUpdateCtx = {
            request: {
                body: {
                    id: ctx.request.body.objectId, status: 1
                }, url: '/courses/updateById'
            }
        }
        if (!workflowCtx.request.body.currentRoleId) {
            workflowCtx.request.body.status = ctx.request.body.status;  //审批完了状态变成1，驳回状态变成0
            courseUpdateCtx.request.body.status = ctx.request.body.status;
            await updateById(courseUpdateCtx)
            //已经是最后一个人审批；改变workflow的status状态，并且改变课程状态
        }
        /*设置课程状态*/
        const result = await updateById(workflowCtx)
        console.log('====>>workflowCtx>', workflowCtx, '====zzz', result)
        if (result) {
            ctx.body = {
                list: result, success: true, msg: '查询成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '查询失败！'
        }
    });

    //根据roleId获取当前可以审批的课程
    router.get(`/process/getCourseByRoleId`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = await getApi(ctx)
        const list = [];
        data.list.forEach(res => {
            const obj = deconstructionData(res)
            const approvalList = [];
            res['approvalList'].forEach(rr => {
                approvalList.push(deconstructionData(rr));
            })
            obj.approvalList = approvalList
            list.push(obj)
        })
        if (list) {
            ctx.body = {
                list: list, total: deconstructionData(data['totalData']).total, success: true, msg: '查询成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '查询失败！'
        }
    });

    //课程创建和更新都是一个接口
    router.post(`/courses/createUpdate`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const typeIds = ctx.request.body.typeId
        const columnIds = ctx.request.body.columnId
        delete ctx.request.body.typeId
        delete ctx.request.body.columnId
        let result = {}
        if (!ctx.request.body.id) {
            delete ctx.request.body.id
            result = await create(ctx, next);
        } else {
            result = await updateById(ctx, next);
            //删除课程分类
            const deleteCtx = {
                request: {
                    body: {
                        courseId: ctx.request.body.id || result.id
                    }, url: '/courseClass/deleteById'
                }
            }
            await deleteById(deleteCtx, next);
            //删除课程栏目
            const deleteColumnIdCtx = {
                request: {
                    body: {
                        courseId: ctx.request.body.id || result.id
                    }, url: '/courseColumn/deleteById'
                }
            }
            await deleteById(deleteColumnIdCtx, next);
        }
        let sum = 0;
        //typeId-课程类型存在
        for (const res of typeIds) {
            const newCtx = {
                request: {
                    body: {
                        typeId: res, courseId: ctx.request.body.id || result.rows[0].id
                    }, url: '/courseClass/create'
                }
            }
            const data = await create(newCtx, next);
            sum += data.rowCount
        }
        let sumColumn = 0;
        //columnId-课程栏目存在
        for (const res of columnIds) {
            const newCtx = {
                request: {
                    body: {
                        columnId: res, courseId: ctx.request.body.id || result.rows[0].id
                    }, url: '/courseColumn/create'
                }
            }
            const data = await create(newCtx, next);
            sumColumn += data.rowCount
        }
        if (sum === typeIds.length) {
            ctx.body = {
                data: sum, success: true, msg: '提交成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '提交失败！'
        }
    });

    //批量导入课程！
    router.post(`/courses/multiImport`, async (ctx) => {
        const list = JSON.parse(JSON.stringify(ctx.request.body));
        //先导入课程
        let courseCreateResult;
        let chapterCreateResult;
        let index;
        for (const res of list) {
            index = list.indexOf(res);
            const chapters = res.children;
            delete res.children;
            const createCourseCtx = {
                request: {
                    body: res, url: '/courses/createUpdate'
                }
            }
            courseCreateResult = await createUpdateCourses(createCourseCtx);
            //创建对应章节
            for (const res1 of chapters) {
                const dd = chapters.indexOf(res1);
                const chapterCreateCtx = {
                    request: {
                        body: {
                            courseId: courseCreateResult.courseData.id,
                            name: res1.name,
                            parentId: null,
                            path: res1.path,
                            sequence: dd + 1,
                            video: null
                        }, url: "/chapters/create"
                    }
                }
                chapterCreateResult = await create(chapterCreateCtx);
            }
        }
        //再导入章节
        if (courseCreateResult && chapterCreateResult) {
            ctx.body = {
                data: {courseCreateResult, chapterCreateResult}, total: index, success: true, msg: '提交成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '提交失败！'
        }
    });

    router.post(`/courses/getDataListByPage`, async (ctx) => {
        ctx.request.url = ctx.request.realUrl
        const data = await getApi(ctx)
        const list = []
        data.list.forEach(res => {
            const obj = {
                ...res, typeId: [], columnId: []
            }
            delete obj['courseClass']
            res['courseClass'].forEach(rr => {
                obj.typeId.push(rr.typeId)
            })
            res['courseColumnData'].forEach(rr => {
                obj.columnId.push(rr.columnId)
            })
            list.push(deconstructionData(obj))
        })
        if (list) {
            ctx.body = {
                list: list, total: data.total.aggregate.count, success: true, msg: '提交成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '提交失败！'
        }
    });

    router.post(`/course/getListPageByWhere`, async (ctx) => {
        ctx.request.url = ctx.request.realUrl
        const data = await getApi(ctx)
        const list = [];
        data.list.forEach(res => {
            list.push(deconstructionData(res))
        })
        if (list) {
            ctx.body = {
                list: list, total: deconstructionData(data['totalData']).total, success: true, msg: '提交成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '提交失败！'
        }
    });

    router.post(`/approvalProcessSet/createData`, async (ctx) => {
        const newCtx = {
            request: {
                body: {
                    name: ctx.request.body['approval'].name || null,
                }, url: '/approvalProcessSet/create'
            },
        }
        const data = await create(newCtx)
        for (const res of ctx.request.body['approval'].list) {
            const createCtx = {
                request: {
                    body: {
                        roleId: res.roleId || null, parentId: data.rows[0].id
                    }, url: '/approvalProcessSet/create'
                }
            }
            await create(createCtx)
        }
        if (true) {
            ctx.body = {
                total: 0, success: true, msg: '提交成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '提交失败！'
        }
    });

    router.get(`/approvalProcessSet/getDataListByPage`, async (ctx) => {
        ctx.request.url = ctx.request.realUrl
        const data = await getApi(ctx);
        const list = [];
        data.list.forEach(res => {
            const obj = {...res, ...res['roleData']}
            delete obj['roleData']
            list.push(obj)
        })
        const parentData = list.filter(res => !res.parentId);
        const childData = list.filter(res => res.parentId);
        getMenuTree(parentData, childData);
        if (true) {
            ctx.body = {
                list: parentData, total: data['totalData']['aggregate'].count, success: true, msg: '提交成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '提交失败！'
        }
    });

    router.post(`/note/getDataListByPage`, async (ctx) => {
        ctx.request.url = ctx.request.realUrl
        const data = await getApi(ctx);
        const list = [];
        data.list.forEach(res => {
            const obj = deconstructionData(res);
            list.push(obj);
        })
        if (true) {
            ctx.body = {
                list: list, total: deconstructionData(data['totalData']), success: true, msg: '提交成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '提交失败！'
        }
    });

    router.get(`/staff/getStudyListByPage`, async (ctx) => {
        ctx.request.url = ctx.request.realUrl
        const data = await getApi(ctx);
        const list = [];
        data.list.forEach(res => {
            const obj = deconstructionData(res);
            obj.studyTime = Math.floor(obj.studyTime / 60)
            obj.credits = obj.credits || 0
            list.push(obj);
        })
        if (list) {
            ctx.body = {
                list: list, total: deconstructionData(data['totalData']).total, success: true, msg: '查询成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '查询失败！'
        }
    });

    router.get(`/staffCredits/getCreditsRecordByStaffId`, async (ctx) => {
        ctx.request.url = ctx.request.realUrl
        const data = await getApi(ctx);
        const list = [];
        data.list.forEach(res => {
            const obj = deconstructionData(res);
            list.push(obj);
        })
        if (list) {
            ctx.body = {
                list: list, total: deconstructionData(data['totalData']).total, success: true, msg: '查询成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '查询失败！'
        }
    });

    router.get(`/courseStatistic/getCourseStatistic`, async (ctx) => {
        ctx.request.url = ctx.request.realUrl
        const data = await getApi(ctx);
        const list = [];
        (data.list || []).forEach(res => {
            const obj = deconstructionData(res);
            obj.score = obj.score ? Number((obj.score * 2).toFixed(1)) : 0   //转化成十分制
            list.push(obj);
        })
        if (list) {
            ctx.body = {
                list: list, total: deconstructionData(data['totalData']).total, success: true, msg: '查询成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '查询失败！'
        }
    });

    router.get(`/homeColumns/getDataList`, async (ctx) => {
        ctx.request.url = ctx.request.realUrl
        const data = await getApi(ctx);
        const parentData = data.list.filter(res => !res.parentId);
        const childData = data.list.filter(res => res.parentId);
        getMenuTree(parentData, childData); //如果存在父子关系，变成树状结构
        const list = [];
        console.log(parentData);
        if (list) {
            ctx.body = {
                list: parentData, success: true, msg: '查询成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '查询失败！'
        }
    });

    router.post(`/homeColumns/getCourseByColumnCode`, async (ctx) => {
        ctx.request.url = ctx.request.realUrl
        ctx.request.body.code = ctx.request.body.code + '%'
        const data = await getApi(ctx);
        const list = [];
        data.list.forEach(res => {
            const obj = deconstructionData(res)
            list.push(obj)
        })
        if (data) {
            ctx.body = {
                list: list, success: true, msg: '查询成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '查询失败！'
        }
    });

    router.get(`/public/getCode`, async (ctx) => {
        const c = svgCaptcha.create({
            size: 4, // 验证码长度
            ignoreChars: '0o1i', // 验证码字符中排除 0o1i
            color: true, // 验证码是否有彩色
            noise: 1, //干扰线
            background: '#666' // 背景颜色
        })
        ctx.body = {
            data: c.data, text: c.text, success: true, msg: '查询成功！'
        }
    });

    //client接口
    // router.post('/client/login', async (ctx) => {
    //     const result = await validLogin(ctx.request.body);
    //     ctx.body = result.success ? {
    //         ...result, token: jsonwebtoken.sign({
    //             data: {
    //                 id: result.id, name: ctx.request.body.username
    //             }, exp: Math.floor(Date.now() / 1000) + (60 * 60), // 60 seconds * 60 minutes = 1 hour
    //         }, 'kbds random secret'),
    //     } : result;
    // });

    router.post(`/chapters/getListByCourseId`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        const data = (await getApi(ctx, next)).data;
        if (ctx.request.body['where']) {  //登录才会查询播放记录
            data.list.forEach(res => {
                res['recordChapter'].forEach(rr => {
                    if (rr.completed) {
                        res.completed = true;
                    } else {
                        res.studyTime = rr.studyTime
                    }
                })
            })
        }
        const parentData = data.list.filter(res => !res.parentId);
        const childData = data.list.filter(res => res.parentId);
        getMenuTree(parentData, childData); //如果存在父子关系，变成树状结构
        ctx.body = {
            list: parentData, total: data.total.count, success: true, msg: '查询成功！'
        }
    });

    router.post(`/watchRecord/record`, async (ctx, next) => {
        const selectIsHasCtx = {
            request: {
                query: {
                    staffId: ctx.request.body['staffId'],
                    courseId: ctx.request.body['courseId'],
                    chapterId: ctx.request.body['chapterId'],
                    sort: 'sequence desc',
                    limit: 1
                }, url: ctx.request.realUrl
            }
        }
        const data = await getListByPage(selectIsHasCtx);
        if (data.list.length === 0) {  //没有观看记录
            await create(ctx, next);
        } else if (data.list[0].completed) {  //有观看记录，但是已经看完了，需要新增一次看课记录
            const res = data.list[0]
            if (res.studyTime + 5 >= res['totalTime'] && ctx.request.body.studyTime === 1) {
                ctx.request.body.courseCompleted = res.courseCompleted
                ctx.request.body.isRealCompleted = true    //改变所有的有关章节数据！
                ctx.request.body.maxTime = res.totalTime    //改变所有的有关章节数据！
                await create(ctx, next);
            }
        } else {
            const res = data.list[0]
            ctx.request.body.id = res.id
            ctx.request.body.endDate = (new Date).toISOString().replace(/Z/, "+00");
            if (!res.isRealCompleted && res.studyTime > ctx.request.body.studyTime) {
                ctx.request.body.studyTime = res.studyTime
            }
            ctx.request.body.maxTime = res.maxTime < ctx.request.body.studyTime ? ctx.request.body.studyTime : res.maxTime;
            //获取当前播放的studyTime;传入的studyTime>才记录；否则不记录；因为只执行一次，所以应该有try,catch防止错误，数据改变！必须一步一步都正确，分级！！！
            if (res.studyTime + 5 >= res['totalTime']) {  //章节结束
                ctx.request.body.completed = true
                ctx.request.body.isRealCompleted = true    //改变所有的有关章节数据！
                ctx.request.body.studyTime = res['totalTime']
                ctx.request.body.maxTime = res['totalTime'];
                await updateById(ctx, next);
                //获取当前人员当前课程完成情况；可能会出错，一旦出错数据就不对！！
                const cc = {
                    request: {
                        method: 'GET',
                        url: `/watchRecord/getCompletedByStaffIdCourseId?courseId=${ctx.request.body['courseId']}&staffId=${ctx.request.body['staffId']}`,
                        query: {
                            limit: 1000, offset: 0
                        }
                    }, header: ctx.header

                }
                const result = await getApi(cc);
                if (result['completedChapterList'].length === result['chapterList'].length) {
                    //修改观看课程的状态；
                    await pool.query(`update kb_watch_record set course_completed=true where course_id = $1`, [ctx.request.body['courseId']]);
                    //学分记录;应该避免重复录入数据！
                    const createStaffCreditsCtx = {
                        request: {
                            body: {
                                staffId: ctx.request.body.staffId,
                                courseId: ctx.request.body.courseId,
                                credits: result['courseData'][0].credits
                            }, url: '/staffCredits/create'
                        }
                    }
                    const staffCredits = await create(createStaffCreditsCtx);
                }
            } else {
                await updateById(ctx, next);
            }
        }
        if (data) {
            ctx.body = {
                id: data, success: true, msg: '记录成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '记录失败！'
        }
    })

    router.get(`/collectCourse/getDataListByPage`, async (ctx, next) => {
        const data = await getApi(ctx, next);
        ctx.body = {
            list: data.list, total: data.total['aggregate'].count, success: true, msg: '查询成功！'
        }
    });

    router.post(`/comment/getCommentListByPage`, async (ctx, next) => {
        const data = await getApi(ctx, next);
        const listData = [];
        (data.data.list || []).forEach((res) => {
            let obj = res;
            obj = {...obj, ...res['courseData'], ...res['userData']}
            delete obj['courseData'];
            delete obj['userData'];
            listData.push(obj)
        })
        ctx.body = {
            list: listData, total: data.data.total.count, success: true, msg: '查询成功！'
        }
    });

    router.get(`/course/getCourseById`, async (ctx, next) => {
        const studyCtx = {
            request: {
                method: 'GET', url: `/watchRecord/getStaffNumberByCourseId?courseId=${ctx.request.query.id}`, json: true
            }, header: {
                "content-type": 'text/plain; charset=utf-8',
            },
        }
        const studyStaffNumber = (await getApi(studyCtx)).studyStaffNumber.total.count;
        const data = await getApi(ctx, next);
        const result = data.data[0];
        // result.typeName = result.courseType?.name
        // result.studyStaffNumber = studyStaffNumber
        // delete result.courseType
        const rr = deconstructionData(result);
        ctx.body = {
            data: rr, total: data.total, success: true, msg: '查询成功！'
        }
    });

    router.post(`/cert/download`, async (ctx) => {
        // const PizZip = require('pizzip');
        // const Docxtemplater = require('docxtemplater');
        // const fs = require('fs');
        // const path = require('path');
        // // 读取文件,以二进制文件形式保存
        // const content = fs.readFileSync(path.resolve('/Users/mac/wzr/资源库/hasura-web/attachs/test.docx'), 'binary');
        // // 压缩数据
        // const zip = new PizZip(content);
        // // 生成模板文档
        // const doc = new Docxtemplater(zip);
        // // 设置填充数据
        // doc.setData({
        //     name: ctx.request.body['staffName'],
        //     title: ctx.request.body.name,
        //     typeName: ctx.request.body.name,
        //     date: ctx.request.body['date']
        // });
        // //渲染数据生成文档
        // doc.render()
        // // 将文档转换文nodejs能使用的buf
        // const buf = doc.getZip().generate({type: 'nodebuffer'});
        // // 输出文件
        // fs.writeFileSync(path.resolve(__dirname, ctx.request.body['staffName'] + '-' + ctx.request.body.name + '.docx'), buf);
        // ctx.body = {
        //     success: true, msg: '查询成功！'
        // }
    });

    //读取图片
    router.get('/attachs/:name', ctx => {
        try {
            const filePath = decodeURI(path.join(__dirname.split('/router')[0], ctx.url));
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
    return router;
};
