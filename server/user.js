const pool = require('../utils/pool');
const request = require("request-promise");
const refUrl = "http://192.168.0.166:9090/api/rest";
const result = {
    msg: '',
    success: false
};

async function validLogin(loginObj) {
    const user = await pool.query('SELECT * FROM kb_user where username=$1', [loginObj.username]);
    const pass = await pool.query(`SELECT * FROM kb_user where username=$1 And password=$2`, [loginObj.username, loginObj.password]);
    console.log(user, pass);
    if (user.rows.length === 0) {
        result.msg = '用户名错误！';
    } else if (pass.rows.length !== 1) {
        result.msg = '密码错误';
    } else {
        result.id = user.rows[0].id;
        result.success = true;
        result.msg = '登录成功！';
    }
    return result;
}

async function getApi(ctx, next) {
    let url = ctx.request.url;
    if (url.indexOf('getListByPage') > -1) {
        ctx.request.query.limit = Number(ctx.request.query.limit || 20);
        ctx.request.query.offset = Number(ctx.request.query.offset || 0);
    }
    if (url.indexOf('search') > -1) {
        const arr = url.split('search=');
        url = arr[0] + `search=%${ctx.request.query.search}%` + arr[1].replace(/[^&]+/, '')
        console.log(arr, url);
    }
    ctx.set('X-Response-Url', url);
    console.log(ctx.request.body);
    const response = await request({
        method: ctx.method,
        url: refUrl + url,
        headers: {
            "content-type": ctx.header['content-type'],
        },
        body: ctx.request.body,
        json: true
    });
    console.log(response);
    return response;
}

async function changeDataTree(list, key) {
    const result = [];
    list.forEach(res => {
        console.log(key);
        const data = JSON.parse(JSON.stringify(res[key]));
        delete res[key];
        res = {...res, ...data}
        result.push(res);
    });
    return result;
}

function getMenuTree(parentList, childList) {
    for (let i = 0; i < parentList.length; i++) {
        parentList[i].children = [];
        for (let j = 0; j < childList.length; j++) {
            if (parentList[i].id === childList[j].parentId) {
                parentList[i].children.push(childList[j]);
                childList.splice(j, 1);
            }
        }
    }
    //一轮结束后，childList还存在，就再一次调用这个方法
    if (childList.length > 0) {
        for (let i = 0; i < parentList.length; i++) {
            getMenuTree(parentList[i].children, childList);
        }
    }
}

module.exports = {
    validLogin,
    getApi,
    getMenuTree,
    changeDataTree,
}
