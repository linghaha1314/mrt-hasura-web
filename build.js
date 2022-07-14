// 第一步，导入必要的模块
const fs = require('fs');
const path = require("path");
const archiver = require("archiver");
const targetPath = "hasura-dist"

console.log('准备...')
if (fs.existsSync(targetPath)) {
    deleteFiles(__dirname + '/' + targetPath)
}
fs.mkdirSync('./' + targetPath);
copyDir(__dirname, __dirname + '/' + targetPath)
console.log('打包中...')
toZip()

//拷贝文件和目录
function copyDir(srcDir, desDir) {
    const files = fs.readdirSync(srcDir, {withFileTypes: true})
    for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file.name === 'attachs' || file.name === targetPath || file.name === targetPath + '.zip' || file.name === 'build.js' || file.name === 'config.js' || file.name === '归档.zip' || file.name === '.git') {
            console.log('不拷贝')
        } else if (file.isDirectory()) {
            const dirS = path.resolve(srcDir, file.name);
            const dirD = path.resolve(desDir, file.name);
            //判断是否存在dirD文件夹
            if (!fs.existsSync(dirD)) {
                fs.mkdir(dirD, (err) => {
                    if (err) console.log(err);
                });
            }
            copyDir(dirS, dirD);
        } else {
            let srcFile = path.resolve(srcDir, file.name);
            let desFile = path.resolve(desDir, file.name);
            if (file.name === 'pro_config.js') {
                srcFile = path.resolve(srcDir, file.name);
                desFile = path.resolve(desDir, 'config.js');
            }
            try {
                fs.copyFileSync(srcFile, desFile);
            } catch (e) {
                console.error(e)
                fs.copyFileSync(srcFile, desFile);  //容易进入死循环!待定
                console.log('===>>???重新执行一次')
            }
            console.log(file.name + ' 拷贝成功');
        }
    }
}

//删除所有的文件
function deleteFiles(path) {
    let files = [];
    if (fs.existsSync(path)) {
        files = fs.readdirSync(path);
        files.forEach((file, index) => {
            let curPath = path + "/" + file;
            if (fs.statSync(curPath).isDirectory()) {
                deleteFiles(curPath); //递归删除文件夹
            } else {
                fs.unlinkSync(curPath); //删除文件
            }
        });
        fs.rmdirSync(path);
    }
}

//打包
function toZip() {
    // 第二步，创建可写流来写入数据
    const output = fs.createWriteStream(__dirname + "/hasura-dist.zip");// 将压缩包保存到当前项目的目录下，并且压缩包名为test.zip
    const archive = archiver('zip', {zlib: {level: 9}});// 设置压缩等级

    output.on('close', function () {
        console.log('压缩包大小:' + Math.floor(archive.pointer() / 1048576) + 'MB');
        //删除复制的文件夹
        if (fs.existsSync(targetPath)) {
            deleteFiles(__dirname + '/' + targetPath)
        }
        console.log('打包完成');
    });
    output.on('end', function () {
        console.log('Data has been drained');
    });

    // 第三步，建立管道连接
    archive.pipe(output);
    //第4步
    archive.directory(targetPath + '/', false);
    // 第五步，完成压缩
    archive.finalize().then();
}
