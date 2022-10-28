const pool = require('../utils/pool');
const request = require("request-promise");
const {search} = require("koa/lib/request");
let {refUrl} = require('../config.js')
const path = require("path");
refUrl = refUrl + '/api/rest'
const result = {
    msg: '', success: false
};
const CryptoJS = require('crypto-js');
const fs = require("fs");
const Docxtemplater = require("docxtemplater");
const PizZip = require("pizzip");

//获取表名
function getTableName(url) {
    let tableName = convertColumn(url.split('/')[1]);
    const strArr = tableName.split('')
    strArr.forEach(res => {
        if (/[A-Z]/.test(res)) {
            tableName = tableName.replace(res, `_${res.toLowerCase()}`)
        }
    })
    tableName = 'kb_' + tableName
    return tableName
}

//转化列名
function convertColumn(column) {
    let columnArr = column.split('')
    //xxx_id->xxxId
    if (column.indexOf('_') > -1) {
        columnArr.forEach((res, index) => {
            if (res === '_') {
                columnArr[index + 1] = (columnArr[index + 1]).toUpperCase()
                columnArr[index] = ""
            }
        })
        return columnArr.join('')
    }
    //xxxId->xxx_id
    columnArr.forEach(res => {
        if (/[A-Z]/.test(res)) {
            column = column.replace(res, `_${res.toLowerCase()}`)
        }
    })
    return column
}

//根据类型转换列名，返回对应的数据格式
function covertColumnByType(data, type = 1) {
    const list = []
    switch (type) {
        case 1:
            //data是一个数组
            data.map(res => {
                list.push(convertColumn(res))
            })
            return list
            break;
        case 2:
            //data是一个对象数组
            data.forEach(res => {
                const obj = {}
                for (const i in res) {
                    obj[convertColumn(i)] = res[i]
                }
                list.push(obj)
            })
            return list
            break;
    }
}

//登录验证
async function validLogin(loginObj) {
    // 连续登录五次错误就锁住这个帐号；登录错误就记录一次；
    const user = await pool.query('SELECT * FROM kb_user where username=$1', [loginObj.username]);
    // console.log('??????', loginObj, user.rows)
    const bytes = CryptoJS.AES.decrypt(user.rows[0].password, 'kb12315')
    const originalText = bytes.toString(CryptoJS.enc.Utf8)
    // const pass = await pool.query(`SELECT * FROM kb_user where username=$1 And password=$2`, [loginObj.username, loginObj.password]);

    const pass = originalText === loginObj.password
    if (user.rows.length === 0) {
        result.msg = '用户名错误！';
        result.success = false;
        // } else if (pass.rows.length !== 1 || user.rows[0].locked) {
    } else if (!pass || user.rows[0].locked) {
        if (user.rows[0]['error_num'] <= 1) {
            await pool.query(`update kb_user set error_num=$1,locked=$2 where id=$3`, [0, true, user.rows[0].id]);
        } else {
            await pool.query(`update kb_user set error_num=$1 where id=$2`, [user.rows[0]['error_num'] - 1, user.rows[0].id]);
        }
        result.msg = user.rows[0]['error_num'] <= 1 ? '密码错误五次，帐号已经被锁定，请联系管理员' : `密码错误,你还有${user.rows[0]['error_num'] - 1}次机会`
        result.success = false;
    } else {
        await pool.query(`update kb_user set error_num=$1, locked=$2 where id=$3`, [5, false, user.rows[0].id]);
        result.id = user.rows[0].id;
        result.success = true;
        result.msg = '登录成功！';
    }
    return result;
}

//查
async function getListByPage(ctx) {
    const obj = JSON.parse(JSON.stringify(ctx.request.query));
    delete obj.limit;
    delete obj.offset;
    delete obj.sort;
    const keys = Object.keys(obj);
    let sortKey = ctx.request.query.sort ? (ctx.request.query.sort + ((ctx.request.query.sort.indexOf('asc') > -1 || ctx.request.query.sort.indexOf('desc') > -1) ? '' : ' desc')) : 'created desc'
    const params = [];
    let sql = '';
    if (keys.length > 0) {
        sql += ' where';
    }
    let index = 1;
    for (const w in obj) {
        sql += (convertColumn(w).indexOf('id') > -1 || convertColumn(w).indexOf('status') > -1) ? ` ${convertColumn(w)}=$${index}` : ` ${convertColumn(w)} like $${index}`;
        params.push((convertColumn(w).indexOf('id') > -1 || convertColumn(w).indexOf('status') > -1) ? obj[w] : ('%' + obj[w] + '%'));
        if (index < keys.length) {
            sql += ` and`
        }
        index++;
    }
    const total = await pool.query(`SELECT count(id) FROM ${getTableName(ctx.request.url)}${sql}`, params);
    sql += ' order by ' + convertColumn(sortKey) + ' limit $' + (params.length + 1);
    params.push(ctx.request.query.limit || 20);
    sql += ' offset $' + (params.length + 1);
    params.push(ctx.request.query.offset || null);
    const data = await pool.query(`select * from ${getTableName(ctx.request.url)}${sql}`, params);
    const list = covertColumnByType(data.rows, 2)
    return {
        list, total: Number(total.rows[0].count)
    }
}

//查
async function getList(ctx, next) {
    const obj = JSON.parse(JSON.stringify(ctx.request.query));
    delete obj.limit;
    delete obj.offset;
    delete obj.search;
    const keys = Object.keys(obj);
    let otherSql = ''
    keys.forEach((res, index) => {
        otherSql += 'and ' + convertColumn(res) + '=$' + (index + 4);
    })
    let data = {};
    if (otherSql) {
        data = await pool.query(`SELECT * FROM ${getTableName(ctx.request.url)} where name like $1 ${otherSql} order by id ;`, [`%${ctx.request.query.search || ''}%`]);
    } else {
        data = await pool.query(`SELECT * FROM ${getTableName(ctx.request.url)} where name like $1 order by id ;`, [`%${ctx.request.query.search || ''}%`]);
    }
    const total = await pool.query(`SELECT count(id) FROM ${getTableName(ctx.request.url)} where name like $1`, [`%${ctx.request.query.search || ''}%`]);
    const list = covertColumnByType(data.rows, 2)

    return {
        list, total: Number(total.rows[0].count)
    }
}

//查
async function getDataById(ctx) {
    let keys = Object.keys(ctx.request.body);
    const sort = keys.filter(rr => rr === 'sort') || [];
    keys = keys.filter(rr => rr !== 'sort');
    const idName = convertColumn(keys[0]);
    const sql = sort.length > 0 ? `SELECT * FROM ${getTableName(ctx.request.url)} where ${idName}=$1 order by sequence asc` : `SELECT * FROM ${getTableName(ctx.request.url)} where ${idName}=$1`
    const data = await pool.query(sql, sort.length > 0 ? [ctx.request.body[keys[0]]] : [ctx.request.body[keys[0]]]);
    return covertColumnByType(data.rows, 2)
}

//增
async function create(ctx) {
    const columns = Object.keys(ctx.request.body);
    const keyList = covertColumnByType(columns)
    const valueList = Object.values(ctx.request.body)
    const params = [];
    keyList.forEach((k, i) => params.push('$' + (i + 1)));
    const sql = `
    insert
    into  ${getTableName(ctx.request.url)}(${keyList.join(',')})
    VALUES(${params.join(',')}) returning *;
    `;
    return await pool.query(sql, valueList)
}

//删
async function deleteById(ctx, next) {
    const keys = Object.keys(ctx.request.body)
    const values = Object.values(ctx.request.body)
    const data = await pool.query(`
    delete from ${getTableName(ctx.request.url)} where ${convertColumn(keys[0])} = $1`, [values[0]]);
    return data
}

//批量删除
async function deleteMultiple(ctx, next) {
    let idStr = '';
    const list = ctx.request.body['id'].split(',')
    list.forEach((res, index) => {
        idStr += index === list.length - 1 ? "'" + res + "'" : "'" + res + "'" + ','
    })
    const data = await pool.query(`
    delete from ${getTableName(ctx.request.url)} where id IN (${idStr});`)
    return data
}

//多条件删除
async function deleteMultiCondition(ctx, next) {
    const type = ctx.request.body.type || 'or'
    delete ctx.request.body.type
    const valueList = Object.values(ctx.request.body)
    const columns = covertColumnByType(Object.keys(ctx.request.body));
    let whereSql = '';
    columns.forEach((res, index) => {
        const num = index + 1
        if (res.indexOf('id') > -1) {
            whereSql += (res + "=$" + num + (index === columns.length - 1 ? '' : ' ' + type + ' '))
        } else {
            whereSql += (res + ' like $' + num + (index === columns.length - 1 ? '' : ' ' + type + ' '))
        }

    })
    const data = await pool.query(`
    delete from ${getTableName(ctx.request.url)} where ${whereSql}`, valueList)
    return data
}

//改
async function updateById(ctx, next) {
    let columns = ""
    for (const key in ctx.request.body) {
        if (key !== 'id') {
            columns += (convertColumn(key) + "=" + stringToNull(ctx.request.body[key]) + ",")
        }
    }
    columns = columns.slice(0, columns.length - 1)
    await pool.query(`
    update  ${getTableName(ctx.request.url)}
    set ${columns}
    where id = $1`, [ctx.request.body.id]);
    const currentRow = await pool.query(`
    select * from  ${getTableName(ctx.request.url)}
    where id = $1`, [ctx.request.body.id]);
    return covertColumnByType(currentRow.fields, 2)
}

async function createUpdateById(ctx, next) {
    const tableName = ctx.request.url.split('/')[1];
    const {id, idKey, list} = ctx.request.body
    //删除数据库原有的数据
    const deleteCtx = {
        request: {
            body: {
                [idKey]: id
            }, url: `/${tableName}/deleteById`
        }
    }
    await deleteById(deleteCtx);
    let sum = 0;
    for (const res of list) {
        const newCtx = {
            request: {
                body: {
                    ...res, [idKey]: id
                }, url: `/${tableName}/create`
            }
        }
        const data = await create(newCtx, next);
        sum += data.rowCount
    }
    return sum
}

//根据字典typeCode获取所有的data
async function dictionaryDataByTypeCode(ctx, next) {
    //合并两张表
    const result = await pool.query(`select d.* from kb_dictionary_type t join kb_dictionary_data d on t.id=d.type_id where t.code=$1 order by d.sequence`, [ctx.request.body['typeCode']])
    return covertColumnByType(result.rows, 2)
}

//查
async function getBeforeNext(ctx, next) {
    const idName = ctx.request.body.id;
    const typeId = ctx.request.body.typeId;
    const sql = `(SELECT a.* FROM ${getTableName(ctx.request.url)} a WHERE a.type_id = '${typeId}' AND a.sequence < ${idName} order by a.sequence desc LIMIT 1) UNION (SELECT a.* FROM ${getTableName(ctx.request.url)} a WHERE a.type_id = '${typeId}' AND a.sequence > ${idName} order by a.sequence LIMIT 1)`
    const data = await pool.query(sql)
    return covertColumnByType(data.rows, 2)
}

//转发请求
async function getApi(ctx, next) {
    let url = ctx.request.url;
    if (url.indexOf('getListByPage') > -1) {
        ctx.request.query.limit = Number(ctx.request.query.limit || 20);
        ctx.request.query.offset = Number(ctx.request.query.offset || 0);
    }
    if (url.indexOf('search') > -1) {
        const arr = url.split('search=');
        url = arr[0] + `
    search =
    %${ctx.request.query.search}
    %
    ` + arr[1].replace(/[^&]+/, '')
    }
    try {
        ctx.set('X-Response-Url', url);
    } catch (e) {
    }
    const response = await request({
        method: ctx.method, url: refUrl + url, headers: {
            "content-type": ctx.header['content-type'],
        }, body: ctx.request.body, json: true
    });
    return response;
}

//改变tree结构
async function changeDataTree(list, key) {
    const result = [];
    list.forEach(res => {
        const data = JSON.parse(JSON.stringify(res[key]));
        delete res[key];
        res = {...res, ...data}
        result.push(res);
    });
    return result;
}

async function newCert(renderObj = {}, pathName) {
    const originPath = await getListByPage(invertCtxData({
        sort: 'sequence desc, status desc'
    }, '/cert/getListByPage', 'get'))
    console.log('---originPath: ', originPath)
    const content = fs.readFileSync(path.resolve(__dirname, `..${originPath.list[0].path}`), "binary");

    const zip = new PizZip(content);

    const doc = new Docxtemplater(zip, {
        paragraphLoop: true, linebreaks: true,
    });

    doc.render(renderObj);

    const buf = doc.getZip().generate({
        type: "nodebuffer", compression: "DEFLATE",
    });
    fs.writeFileSync(path.resolve(__dirname, `../attachs/${pathName}`), buf);
}

//菜单tree结构设置
function getMenuTree(parentList, childList) {
    for (let i = 0; i < parentList.length; i++) {
        parentList[i].children = [];
        for (let j = 0; j < childList.length; j++) {
            if (parentList[i].id === childList[j].parentId) {
                childList[j].parentName = parentList[i].name
                childList[j].hasParent = true;
                parentList[i].children.push(childList[j]);
            }
        }
    }
    childList = childList.filter(res => !res.hasParent)
    //一轮结束后，childList还存在，就再一次调用这个方法
    if (childList.length > 0) {
        for (let i = 0; i < parentList.length; i++) {
            getMenuTree(parentList[i].children, childList);
        }
    }
}

function stringToNull(val) {
    return val === null ? val : "'" + val + "'"
}

//解构含有xxxData的数据
function deconstructionData(data) {
    if (!data) {
        return;
    }
    const keys = Object.keys(data);
    let result = {};
    keys.forEach(res => {
        if (res.indexOf('Data') > -1 && data[res] && data[res] !== null) {
            result = {...result, ...deconstructionData(data[res])}
        } else {
            result[res] = data[res]
        }
    })
    return result
}

function deconstructionArr(arr) {
    const list = [];
    arr.forEach(res => {
        list.push(deconstructionData(res));
    })
    return list;
}

function convertRate(val, num = 2) {
    return (val || 0).toFixed(num) * 100 + '%'
}

//生成年月日
function formatTime(date, format = 'YY-MM-DD') {
    if (typeof date === 'string') {
        date = date.replace(/\s+/, 'T');  //Ios
    }
    date = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
    const dateObj = {};
    dateObj.YY = date.getFullYear();
    dateObj.MM = date.getMonth() + 1;
    dateObj.DD = date.getDate();
    dateObj.hh = date.getHours();
    dateObj.mm = date.getMinutes();
    dateObj.ss = date.getSeconds();
    const arr = aryJoinAry(format.match(/[a-zA-Z]{2}/g), format.match(/[^a-zA-Z]/g) || []);
    let result = '';
    arr.forEach(res => {
        result += /[a-zA-Z]/g.test(res) ? addZero(dateObj[res]) : res;
    });
    return result;
}

function timeToDay(date = new Date(), day = 30) {
    const time = date.getTime()
    return formatTime(new Date(time + 30 * 24 * 60 * 60 * 1000))
}

function addZero(num) {
    if (num > 9) {
        return num;
    } else {
        return `0${num}`;
    }
}

function aryJoinAry(ary, ary2) {
    const itemAry = [];
    let minLength;
    if (ary.length > ary2.length) {
        minLength = ary2.length;
    } else {
        minLength = ary.length;
    }
    const longAry = arguments[0].length > arguments[1].length ? arguments[0] : arguments[1];
    for (let i = 0; i < minLength; i++) {
        itemAry.push(ary[i]);
        itemAry.push(ary2[i]);
    }
    return itemAry.concat(longAry.slice(minLength));
};

//秒转化成时分秒的结构-生成时间随机数
function DateToStr(date, isToMill = false) {
    const year = date.getFullYear();//年
    const month = date.getMonth();//月
    const day = date.getDate();//日
    const hours = date.getHours();//时
    const min = date.getMinutes();//分
    const second = date.getSeconds();//秒
    const milliseconds = date.getMilliseconds();//秒
    let result = year.toString() + ((month + 1) > 9 ? (month + 1) : "0" + (month + 1)).toString() + (day > 9 ? day : ("0" + day)).toString() + (hours > 9 ? hours : ("0" + hours)).toString() + (min > 9 ? min : ("0" + min)).toString() + (second > 9 ? second : ("0" + second)).toString();
    if (isToMill) {
        result += milliseconds.toString()

    }
    return result
}

/**
 * @name invertCtxData
 * @desc 重新转换创建请求数据ctx
 * @param body 请求时要传入的参数
 * @param url  请求地址
 * @param http 请求方式
 * @param type 是getApi就传入'getApi',否则不传
 * */
function invertCtxData(body, url, http = 'post', type = null) {
    let ctx = {
        request: {
            url
        }
    }
    if (http === 'get') {
        ctx.request.query = body
    } else {
        ctx.request.body = body
    }
    if (type === 'getApi') {
        ctx = {
            request: {
                body, url
            }, header: {
                'content-type': http === 'post' ? 'application/json' : 'text/plain; charset=utf-8'
            }
        }
    }
    return ctx
}

module.exports = {
    refUrl,
    deleteById,
    validLogin,
    getApi,
    getList,
    getListByPage,
    getMenuTree,
    formatTime,
    timeToDay,
    newCert,
    convertColumn,
    changeDataTree,
    invertCtxData,
    convertRate,
    create,
    DateToStr,
    updateById,
    getDataById,
    getBeforeNext,
    createUpdateById,
    deleteMultiCondition,
    deleteMultiple,
    covertColumnByType,
    deconstructionData,
    deconstructionArr,
    dictionaryDataByTypeCode
}
