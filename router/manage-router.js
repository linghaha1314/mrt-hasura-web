const request = require("request");
const {updateById, invertCtxData, deleteById} = require("../server/user");
module.exports = (router) => {
    router.post(`/courses/deleteAllById`, async (ctx, next) => {
        await deleteById(invertCtxData({courseId: ctx.request.body.id}, '/courseClass/deleteById'))
        await deleteById(invertCtxData({courseId: ctx.request.body.id}, '/courseColumn/deleteById'))
        await deleteById(invertCtxData({courseId: ctx.request.body.id}, '/courseFiles/deleteById'))
        const step3 = await deleteById(invertCtxData({id: ctx.request.body.id}, '/courses/deleteById'))
        // const step4 = await deleteById(invertCtxData({courseId: ctx.request.body.id}, '/courses/deleteById'))
        // const step5 = await deleteById(invertCtxData({courseId: ctx.request.body.id}, '/courses/deleteById'))
        ctx.body = {
            success: true, msg: '删除成功！'
        }
    });
}


