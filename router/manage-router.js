const request = require("request");
const {
    updateById,
    invertCtxData,
    deleteById,
    getListByPage,
    covertColumnByType,
    create,
    getApi,
    deconstructionData,
    getMenuTree
} = require("../server/user");
module.exports = (router) => {

    router.post(`/courses/deleteAllById`, async (ctx, next) => {
        await deleteById(invertCtxData({courseId: ctx.request.body.id}, '/courseClass/deleteById'))
        await deleteById(invertCtxData({courseId: ctx.request.body.id}, '/courseColumn/deleteById'))
        await deleteById(invertCtxData({courseId: ctx.request.body.id}, '/courseFiles/deleteById'))
        await deleteById(invertCtxData({objectId: ctx.request.body.id}, '/processDetail/deleteById'))
        await deleteById(invertCtxData({objectId: ctx.request.body.id}, '/workflowStart/deleteById'))
        const step3 = await deleteById(invertCtxData({id: ctx.request.body.id}, '/courses/deleteById'))
        // const step4 = await deleteById(invertCtxData({courseId: ctx.request.body.id}, '/courses/deleteById'))
        // const step5 = await deleteById(invertCtxData({courseId: ctx.request.body.id}, '/courses/deleteById'))
        ctx.body = {
            success: true, msg: '删除成功！'
        }
    });

    router.post(`/approvalProcessSet/createUpdateData`, async (ctx) => {
        let data;
        if (ctx.request.body.id) {
            const deleteCtx = {
                request: {
                    body: {parentId: ctx.request.body.id}, url: '/approvalProcessSet/deleteById'
                }
            }
            data = await deleteById(deleteCtx);
            await updateById(invertCtxData({
                id: ctx.request.body.id,
                name: ctx.request.body.name || null,
                typeId: ctx.request.body.typeId,
                assignedRoleId: ctx.request.body.assignedRoleId
            }, '/approvalProcessSet/updateById'))
        } else {
            const newCtx = {
                request: {
                    body: {
                        name: ctx.request.body.name || null,
                        typeId: ctx.request.body.typeId,
                        assignedRoleId: ctx.request.body.assignedRoleId
                    }, url: '/approvalProcessSet/create'
                },
            }
            data = await create(newCtx)
        }
        for (const res of ctx.request.body.list) {
            const createCtx = {
                request: {
                    body: {
                        roleId: res.roleId || null, parentId: ctx.request.body.id || data.rows[0].id
                    }, url: '/approvalProcessSet/create'
                }
            }
            if (res.roleId) {
                await create(createCtx)
            }
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
        const resultList = [];
        parentData.forEach(res => {
            resultList.push(deconstructionData(res));
        })
        if (true) {
            ctx.body = {
                list: resultList, total: data['totalData']['aggregate'].count, success: true, msg: '提交成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '提交失败！'
        }
    });

    router.post(`/approvalProcess/delete`, async (ctx) => {
        const deleteCtx = {
            request: {
                body: {id: ctx.request.body.id}, url: '/approvalProcessSet/deleteById'
            }
        }
        const data1 = await deleteById(deleteCtx);
        deleteCtx.request.body = {parentId: ctx.request.body.id};
        const data2 = await deleteById(deleteCtx);
        if (true) {
            ctx.body = {
                list: data2, success: true, msg: '提交成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '提交失败！'
        }
    });

    //创建工作流
    router.post(`/workflow/createProcess`, async (ctx) => {
        const tableName = ctx.request.body.tableName ? ctx.request.body.tableName : 'courses'
        //创建工作流;默认查询审批流程的list，根据流程id获取当前的
        const getApprovalListData = await getApi(invertCtxData({
            parentId: ctx.request.body.approvalProcessId
        }, '/approvalProcess/getApprovalListById', 'get', 'getApi'))
        delete ctx.request.body.tableName
        const data = await create(invertCtxData({
            ...ctx.request.body, currentRoleId: getApprovalListData.list[0]['roleData']['roleId']
        }, '/workflowStart/create'))
        //设置课程的状态
        const changeCourseData = await updateById(invertCtxData({
            id: ctx.request.body.objectId,
            status: 11,
            workflowId: data.rows[0]?.id || null,
            approvalProcessId: ctx.request.body.approvalProcessId
        }, `/${tableName}/updateById`))
        ctx.body = {
            list: changeCourseData, success: true, msg: '提交成功！'
        }
    });

    //获取工作流详情;相关角色怎么查看该自己审核的工作呢？根据自己的code查找currentStep为当前的角色
    router.post(`/workflowStart/getStepDetailList`, async (ctx) => {
        const data = await getApi(invertCtxData({
            approvalProcessId: ctx.request.body.approvalProcessId, workflowId: ctx.request.body.workflowId
        }, '/approvalSet/getProcessDetailByApprovalProcessId', 'post', 'getApi'))
        // console.log('===>>???list', data)
        const list = [];
        (data.list || []).forEach(res => {
            res = deconstructionData(res)
            res.status = 11
            if (res['approvalDetail'].length > 0) {
                res.status = res['approvalDetail'][0].status
                res.remark = res['approvalDetail'][0].remark
            }
            list.push(res)
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

    //根据roleId获取当前可以审批的课程
    router.post(`/process/getCourseByRoleId`, async (ctx, next) => {
        ctx.request.url = ctx.request.realUrl
        ctx.request.body.status = Number(ctx.request.body.status)
        const courseName = ctx.request.body.name !== undefined && ctx.request.body.name ? ctx.request.body.name : '';
        // const tableName = ctx.request.body.table !== undefined && ctx.request.body.table ? ctx.request.body.table : '';
        delete ctx.request.body.name;
        // delete ctx.request.body.table;
        const data = await getApi(ctx)
        console.log('===>>???', data, ctx.request.body)
        let list = [];
        let total = 0;
        if (ctx.request.body.status === 11) {
            list = data.toList
            total = deconstructionData(data.toTotalData).total || 0
        } else {
            list = data.alreadyList
            total = deconstructionData(data.alreadyTotalData).total || 0
        }
        console.log(list, 888)
        for (const res of list) {
            //根据对应的res.objectId获取对应的数据表数据
            let objectData = {};
            console.log(list, 999)
            switch (ctx.request.body.typeCode) {
                case 'course_approval': {

                    const courseData = await getApi(invertCtxData({
                        where: {
                            id: {_eq: res.objectId}, name: {_like: '%' + courseName + '%'}
                        }
                    }, '/course/getCourseDetailAll', 'post', 'getApi'))
                    const resultData = courseData.list[0];
                    if (resultData) {
                        resultData.typeData = resultData.courseTypeList?.length > 0 ? resultData.courseTypeList[0] : null;
                        resultData.columnId = resultData.courseColumnList?.length > 0 ? resultData.courseColumnList[0].columnId : null
                        resultData.columnData = resultData.courseColumnList?.length > 0 ? resultData.courseColumnList[0].homeColumnData : null
                        delete resultData.courseTypeList
                        delete resultData.courseColumnList
                        objectData = deconstructionData(resultData)
                    }
                    break;
                }
                case 'common_approval': {

                    const messageData = await getApi(invertCtxData({
                        where: {
                            id: {_eq: res.objectId}, name: {_like: '%' + courseName + '%'}
                        }
                    }, `/message/getMessageDetailAll`, 'post', 'getApi'))

                    const resultData = messageData.list[0];
                    if (resultData) {
                        objectData = resultData
                    }
                    break;
                }
                case 'regulations': {

                    const messageData = await getApi(invertCtxData({
                        where: {
                            id: {_eq: res.objectId}, name: {_like: '%' + courseName + '%'}
                        }
                    }, `/regulations/getMessageDetailAll`, 'post', 'getApi'))

                    const resultData = messageData.list[0];
                    if (resultData) {
                        objectData = resultData
                    }
                    break;
                }
                case 'file': {

                    const messageData = await getApi(invertCtxData({
                        where: {
                            id: {_eq: res.objectId}, name: {_like: '%' + courseName + '%'}
                        }
                    }, `/file/getMessageDetailAll`, 'post', 'getApi'))

                    const resultData = messageData.list[0];
                    if (resultData) {
                        objectData = resultData
                    }
                    break;
                }
                case 'training': {

                    const messageData = await getApi(invertCtxData({
                        where: {
                            id: {_eq: res.objectId}, name: {_like: '%' + courseName + '%'}
                        }
                    }, `/training/getMessageDetailAll`, 'post', 'getApi'))

                    const resultData = messageData.list[0];
                    if (resultData) {
                        objectData = resultData
                    }
                    break;
                }
                case 'teacher_style': {

                    const messageData = await getApi(invertCtxData({
                        where: {
                            id: {_eq: res.objectId}, name: {_like: '%' + courseName + '%'}
                        }
                    }, `/teacher_style/getMessageDetailAll`, 'post', 'getApi'))

                    const resultData = messageData.list[0];
                    if (resultData) {
                        objectData = resultData
                    }
                    break;
                }
                case 'teaching': {

                    const messageData = await getApi(invertCtxData({
                        where: {
                            id: {_eq: res.objectId}, name: {_like: '%' + courseName + '%'}
                        }
                    }, `/teaching/getMessageDetailAll`, 'post', 'getApi'))

                    const resultData = messageData.list[0];
                    if (resultData) {
                        objectData = resultData
                    }
                    break;
                }
            }
            res.objectData = objectData
            res.objectName = objectData?.name || ''
        }
        if (list) {
            ctx.body = {
                list, total, success: true, msg: '查询成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '查询失败！'
        }
    });

    //工作流审批
    router.post(`/process/agree`, async (ctx, next) => {
        const tableName = ctx.request.body.tableName ? ctx.request.body.tableName : 'courses'
        ctx.request.url = ctx.request.realUrl
        delete ctx.request.body.tableName
        //查询流程列表,获取下一级审批人roleId
        const getApprovalListData = await getApi(invertCtxData({
            parentId: ctx.request.body.approvalProcessId
        }, '/approvalProcess/getApprovalListById', 'get', 'getApi'))
        const approvalList = getApprovalListData.list || [];
        let currentRoleId = null
        let approvalDetailId = null   //进度进程id
        let isEnd = false
        let status = ctx.request.body.status
        approvalList.forEach((res, index) => {
            if (res['roleData'].roleId === ctx.request.body.roleId) {
                approvalDetailId = res.id
                if (index === approvalList.length - 1 || ctx.request.body.status === 0) {
                    currentRoleId = null
                    isEnd = true
                } else {
                    currentRoleId = approvalList[index + 1].roleData.roleId
                    status = ctx.request.body.status === 1 ? 11 : ctx.request.body.status
                }
            }
        })
        console.log('===>>>???currentRoleId', approvalDetailId, currentRoleId, status)
        //记录这次审批过程
        await create(invertCtxData({
            ...ctx.request.body, approvalDetailId
        }, '/processDetail/create'))
        //改变当前currentRoleId
        const data = await updateById(invertCtxData({
            id: ctx.request.body.workflowId, currentRoleId, status
        }, '/workflowStart/updateById'))

        //改变课程的状态
        if (isEnd) {
            await updateById(invertCtxData({
                id: ctx.request.body.objectId, status
            }, `/${tableName}/updateById`))
        }
        if (true) {
            ctx.body = {
                data, success: true, msg: '提交成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '提交失败！'
        }
    });
}


