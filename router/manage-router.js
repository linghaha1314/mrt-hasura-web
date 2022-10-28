const request = require("request");
const {
    updateById,
    invertCtxData,
    deleteById,
    getListByPage,
    convertColumn,
    covertColumnByType,
    create,
    getApi,
    deconstructionData,
    getMenuTree,
    formatTime,
    timeToDay,
    DateToStr,
    getList
} = require("../server/user");
const pool = require("../utils/pool");
module.exports = (router) => {

    router.post(`/recommend/createUpdate`, async (ctx) => {
        const oldList = (await getApi(invertCtxData({where: {is_recommend: {_eq: true}}}, '/courses/getDataListByPage', 'post', 'getApi'))).list || []
        const newList = ctx.request.body.list || []
        for (const res of oldList) {
            await updateById(invertCtxData({id: res.id, isRecommend: false}, '/courses/updateById', 'post'))
        }
        for (const res of newList) {
            await updateById(invertCtxData({id: res, isRecommend: true}, '/courses/updateById', 'post'))
        }
        ctx.body = {
            success: true, msg: '设置成功！'
        }
    });

    router.post(`/feedback/getDataListByPage`, async (ctx) => {
        const data = await getApi(ctx)
        const list = [];
        data.list.forEach(res => {
            list.push(deconstructionData(res))
        })
        ctx.body = {
            list, total: data['totalData']['aggregate'].count, success: true, msg: '设置成功！'
        }
    });

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

    router.post(`/approvalProcessSet/getDataListByPage`, async (ctx) => {
        ctx.request.url = ctx.request.realUrl
        const data = await getApi(ctx);
        const list = [];
        data.list.forEach(res => {
            const children = [];
            if (res.children && res.children.length > 0) {
                res.children.forEach(rr => {
                    children.push(deconstructionData(rr));
                })
            }
            res.children = children;
            list.push(deconstructionData(res))
        })
        if (true) {
            ctx.body = {
                list, total: data['totalData']['aggregate'].count, success: true, msg: '提交成功！'
            }
            return;
        }
        ctx.body = {
            success: false, msg: '提交失败！'
        }
    });

    router.post(`/approvalProcess/delete`, async (ctx) => {
        //先删除子元素->再删除父元素
        const data1 = await deleteById(invertCtxData({
            parentId: ctx.request.body.id
        }, '/approvalProcessSet/deleteById'));
        const data2 = await deleteById(invertCtxData({
            id: ctx.request.body.id
        }, '/approvalProcessSet/deleteById'));
        ctx.body = {
            list: [data1, data2], success: true, msg: '提交成功！'
        }
    });

    //创建工作流
    router.post(`/workflow/createProcess`, async (ctx) => {
        const tableName = ctx.request.body.tableName ? ctx.request.body.tableName : 'courses'
        const typeCode = ctx.request.body.typeCode
        delete ctx.request.body.typeCode
        //创建工作流;默认查询审批流程的list，根据流程id获取当前的
        const getApprovalListData = await getApi(invertCtxData({
            parentId: ctx.request.body.approvalProcessId
        }, '/approvalProcess/getApprovalListById', 'get', 'getApi'))
        delete ctx.request.body.tableName
        let changeCourseData = {}
        const data = await create(invertCtxData({
            ...ctx.request.body, currentRoleId: getApprovalListData.list[0]['roleData']['roleId']
        }, '/workflowStart/create'))
        if (typeCode === 'home_recommend') {
            //首页课程推荐审批流，-1----不是推荐课程,0---驳回，1---申请同意
            changeCourseData = await updateById(invertCtxData({
                id: ctx.request.body.objectId,
                recommendStatus: 11,
                recommendWorkflowId: data.rows[0]?.id || null,
                recommendApprovalProcessId: ctx.request.body.approvalProcessId
            }, `/${tableName}/updateById`))
        } else {
            //设置课程的状态
            changeCourseData = await updateById(invertCtxData({
                id: ctx.request.body.objectId,
                status: 11,
                workflowId: data.rows[0]?.id || null,
                approvalProcessId: ctx.request.body.approvalProcessId
            }, `/${tableName}/updateById`))
        }
        ctx.body = {
            list: changeCourseData, success: true, msg: '提交成功！'
        }
    });

    //获取工作流详情;相关角色怎么查看该自己审核的工作呢？根据自己的code查找currentStep为当前的角色
    router.post(`/workflowStart/getStepDetailList`, async (ctx) => {
        const data = await getApi(invertCtxData({
            approvalProcessId: ctx.request.body.approvalProcessId, workflowId: ctx.request.body.workflowId
        }, '/approvalSet/getProcessDetailByApprovalProcessId', 'post', 'getApi'))
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
        console.log('data', data);
        let list = [];
        let total = 0;
        if (ctx.request.body.status === 11) {
            list = data.toList
            total = deconstructionData(data.toTotalData).total || 0
        } else {
            list = data.alreadyList
            total = deconstructionData(data.alreadyTotalData).total || 0
        }
        for (const res of list) {
            //根据对应的res.objectId获取对应的数据表数据
            let objectData = {};
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
                case 'home_recommend': {
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
            }
            res.objectData = objectData
            res.objectName = objectData?.name || ''
        }
        let arr = []
        list.forEach(item => {
            if (item.objectName !== '') {
                arr.push(item)
            }
        })
        list = arr
        total = list.length
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
        const typeCode = ctx.request.body.typeCode
        delete ctx.request.body.typeCode
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
            if (typeCode === 'home_recommend') {
                console.log('==>>??home_recommend')
                await updateById(invertCtxData({
                    id: ctx.request.body.objectId, recommendStatus: status, recommendDeadline: timeToDay()
                }, `/${tableName}/updateById`))
                //还要设置一个时间
            } else {
                await updateById(invertCtxData({
                    id: ctx.request.body.objectId, status
                }, `/${tableName}/updateById`))
            }
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

    router.get('/staff/getStatistic', async (ctx) => {
        const result = await getApi(ctx)
        const byCredits = []
        const byStudyTime = [];
        result.byCredits.forEach(r => {
            byCredits.push(deconstructionData(r))
        })
        result.byStudyTime.forEach(r => {
            byStudyTime.push(deconstructionData(r))
        })
        ctx.body = {
            byCredits, byStudyTime, success: true, msg: '查询成功！'
        }
    })

    //新增主讲人
    router.post('/user/createNewLecturer', async (ctx) => {
        const username = (ctx.request.body.username && ctx.request.body.username !== undefined) ? ctx.request.body.username : null
        const getRoleIdByName = await getList(invertCtxData({search: '讲师'}, '/roles/getList', 'get'))
        const createUserResult = await create(invertCtxData({
            name: ctx.request.body.name, username: username || DateToStr(new Date(), true)
        }, '/user/create'))
        const createRoleResult = await create(invertCtxData({
            roleId: getRoleIdByName.list[0].id,  //讲师id
            userId: createUserResult.rows[0].id
        }, '/userRole/create'))
        //判断这个人已经存在而且是讲师！
        ctx.body = {
            data: covertColumnByType(createRoleResult.rows, 2)[0], success: true, msg: '设置成功！'
        }
    })

    router.post('/staffCompulsoryCourses/getCourseByStaffId', async (ctx) => {
        const result = await getApi(ctx)
        const list = []
        result.list.forEach(res => {
            const data = deconstructionData(res);
            data.courseCompleted = data.watchList.length > 0 ? data.watchList[0].courseCompleted : false
            if (!data.courseCompleted) {
                list.push(data)
            }
        })
        ctx.body = {
            list, success: true, msg: '查询成功！'
        }
    })
    // 统计
    router.post('/section/getSectionStatistic', async (ctx) => {
        const sql = `select a.name, b.section_num, c.course_num, c.course_staff, c.study_time_num, c.credits_num
         from kb_section a
         left join (select b1.section_id, count(b1.id) as section_num from kb_user b1 group by b1.section_id) b
                   on a.id = b.section_id
         left join (select c1.section_id,
                           count(distinct c2.course_id)                      as course_num,
                           sum(c3.credits)                                   as credits_num,
                           sum(c2.study_time)                                as study_time_num,
                           array_to_string(array_agg(distinct c1.name), ',') as course_staff
                    from kb_user c1
                             inner join kb_watch_record c2 on c1.id = c2.staff_id
                             left join kb_courses c3 on c2.course_id = c3.id and c2.course_completed is true
                    where c2.start_date >= '2022-05-06'
                      and c2.end_date <= '2022-08-10'
                    group by c1.section_id) c on a.id = c.section_id;
`;
        const resultData = await pool.query(sql)
        const totalData = {staffTotal: 0, timeTotal: 0, courseTotal: 0}
        const list = covertColumnByType(resultData.rows, 2)
        const staffTotal = new Set([])
        list.forEach(res => {
            staffTotal.add(res.courseStaff)
            totalData.timeTotal += res.studyTimeNum
            totalData.courseTotal += Number(res.courseNum)
        });
        ctx.body = {
            data: {
                totalData: {
                    staffTotal: staffTotal.size || 0,
                    timeTotal: Math.ceil(totalData.timeTotal / 60),
                    courseTotal: totalData.courseTotal
                }, list
            }, success: true, msg: '查询成功！'
        }
    })

    //设置指定课程人员必看
    router.get('/staffCompulsoryCourses/createByList', async (ctx) => {
        const result = await getApi(ctx)
        const list = []
        result.list.forEach(res => {
            const obj = {...res, studyTime: 12, credits: 5, courseNum: 12, staffNum: 24}
            list.push(obj)
        })
        ctx.body = {
            list, success: true, msg: '查询成功！'
        }
    })

    router.post('/staffCompulsoryCourses/getDatalistByPage', async (ctx) => {
        const result = await getApi(ctx)
        const list = []
        result.list.forEach(res => {
            const obj = deconstructionData(res)
            list.push(obj)
        })
        ctx.body = {
            list, total: deconstructionData(result.totalData).count, success: true, msg: '查询成功！'
        }
    })

    router.post('/sectionStatistic/getTableList', async (ctx) => {
        const startDate = ctx.request.body.startDate || '1997-01-01'
        const endDate = ctx.request.body.endDate || formatTime()
        const sectionId = ctx.request.body.sectionId || null
        const name = ctx.request.body.name || '%%'
        let whereSql = ` where name like '%${name}%'`
        if (sectionId) {
            whereSql += ` and a.id = '${sectionId}'`
        }
        const sql = `select a.name, b.section_staff_num, c.course_num, c.course_staff, c.study_time_num, c.credits_num
         from kb_section a
         left join (select b1.section_id, count(b1.id) as section_staff_num from kb_user b1 group by b1.section_id) b
                   on a.id = b.section_id
         left join (select c1.section_id,
                           count(distinct c2.course_id)                      as course_num,
                           sum(c3.credits)                                   as credits_num,
                           sum(c2.study_time)                                as study_time_num,
                           array_to_string(array_agg(distinct c1.name), ',') as course_staff
                    from kb_user c1
                             inner join kb_watch_record c2 on c1.id = c2.staff_id
                             left join kb_courses c3 on c2.course_id = c3.id and c2.course_completed is true
                    where c2.start_date >= $1
                      and c2.end_date <= $2
                    group by c1.section_id) c on a.id = c.section_id${whereSql};
`;
        const resultData = await pool.query(sql, [startDate, endDate])
        const list = covertColumnByType(resultData.rows, 2)
        list.forEach(res => {
            res.studyTimeNum = Math.round(res.studyTimeNum / 60);
            res.sectionStaffNum = res.sectionStaffNum ?? 0
            res.courseNum = res.courseNum ?? 0
            res.studyTimeNum = res.studyTimeNum ?? 0
            res.creditsNum = res.creditsNum ?? 0
            res.completedRate = 0;
        });
        ctx.body = {
            list, success: true, msg: '查询成功！'
        }
    })

    router.post('/sectionStatistic/getTotalData', async (ctx) => {
        const startDate = ctx.request.body.startDate || '1997-01-01'
        const endDate = ctx.request.body.endDate || formatTime()
        const sectionId = ctx.request.body.sectionId || null
        const name = ctx.request.body.name || '%%'
        let whereSql = ` where name like '%${name}%'`
        if (sectionId) {
            whereSql += ` and a.id = '${sectionId}'`
        }
        const sql = `select a.name, b.section_staff_num, c.course_num, c.course_staff, c.study_time_num, c.credits_num
         from kb_section a
         left join (select b1.section_id, count(b1.id) as section_staff_num from kb_user b1 group by b1.section_id) b
                   on a.id = b.section_id
         left join (select c1.section_id,
                           count(distinct c2.course_id)                      as course_num,
                           sum(c3.credits)                                   as credits_num,
                           sum(c2.study_time)                                as study_time_num,
                           array_to_string(array_agg(distinct c1.name), ',') as course_staff
                    from kb_user c1
                             inner join kb_watch_record c2 on c1.id = c2.staff_id
                             left join kb_courses c3 on c2.course_id = c3.id and c2.course_completed is true
                    where c2.start_date >= $1
                      and c2.end_date <= $2
                    group by c1.section_id) c on a.id = c.section_id${whereSql};
`;
        const resultData = await pool.query(sql, [startDate, endDate])
        const list = covertColumnByType(resultData.rows, 2)
        const staffTotal = new Set([])
        let timeTotal = 0;
        let courseTotal = 0;
        list.forEach(res => {
            res.studyTimeNum = Math.round(res.studyTimeNum / 60);
            if (res.courseStaff) {
                staffTotal.add(res.courseStaff)
            }
            timeTotal += res.studyTimeNum
            courseTotal += Number(res.courseNum)
        });
        ctx.body = {
            data: {
                staffTotal: staffTotal.size, timeTotal, courseTotal
            }, success: true, msg: '查询成功！'
        }
    })
}


