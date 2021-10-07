const iconv = require('iconv-lite');  //用于解决中文输出乱码
const fs = require('fs');  //用于调用本地读取文件的api
const axios = require('axios');  //用于异步请求
const exec = require('child_process').exec;  //用于执行cmd命令
const path = require('path'); //处理文件路径
const async = require('async');  //用来实现同步运行方法
const { resolve } = require('path');





//待删除
//////////////////////////////////////
var cmd = ''
//////////////////////////////////////

var port;  //端口
var username;  //用户名,默认riot
var password;  //密码
var protocol;  //协议,一般是https
//该cmd命令需要管理员权限才能保证获取到路径
var getRunStatusCMD = 'wmic process get name | find "LeagueClientUx.exe"';  //用于检测游戏是否运行
var getPathCMD = 'wmic process get executablepath | find "LeagueClientUx.exe"';  //用于获取游戏启动路径
var btn = document.getElementById("btn");
var p = document.getElementById("pdemo");
var auto_acceptance_run_status = false;  //这个作为自动接受功能是否开启的标志, 默认为false
var lol_run_status = false;  //这个作为游戏是否运行的标志
var is_parse_lockfile = false;  //这个是是否解析lockfile文件的标志
var lolpath = '';  //游戏启动目录路径
var searchState = 'Searching';  //这个是游戏对局状态


//打开该程序就检测游戏是否开启, 开启了就获取游戏启动路径并解析文件,如果没有开启就提示并结束该程序
progremInit();
async function progremInit() {
    if (lolpath != '') {
        //获取到了游戏启动目录路径,解析lockfile文件
        parseLockFile(lolpath + '\\lockfile');
        console.log('path:' + lolpath + '\\lockfile');
    } else {
        //未获取到了游戏启动目录路径
        if (await islolRunning()) {
            console.log('游戏已经启动');
            //获取游戏启动路径
            getlolRunPath();
        } else {
            console.log('游戏未启动,请先启动游戏,再启动本工具!');
        }
    }
}

//开启按钮
var openBtn = document.getElementById("openBtn");
openBtn.onclick = async () => {
    if (!auto_acceptance_run_status) {
        pmessage.innerHTML = '<font style = "color:red">自动接受已开启</font>';
        auto_acceptance_run_status = true;

        await cycleCall();
    }
}

//关闭按钮
var closeBtn = document.getElementById("closeBtn");
closeBtn.onclick = async () => {
    if (auto_acceptance_run_status) {
        pmessage.innerHTML = '<font style = "color:black">自动接受已关闭</font>';
        window.clearInterval(intervalID)
    }
}

function cycleCall() {
    return new Promise(resolve => {
    let intervalID2 = window.setInterval(async () => {
        var res = await callLOLApi('get', '/lol-lobby/v2/lobby/matchmaking/search-state');
        console.log(res.status);
        if (res.status == 200) {
            //请求成功
            console.log('正在判断是否当前正在寻找对局')
            if (res.data.searchState == 'Searching') { 
                //当前正在寻找对局
                searchState = 'Searching';
                window.clearInterval(intervalID2); //关闭当前循环调用

                let intervalID = window.setInterval(async () => {
                    var res = await callLOLApi('get', '/lol-lobby/v2/lobby/matchmaking/search-state');
                    console.log(res.status);
                    if (res.status == 200) {
                        //请求成功
                        if (res.data.searchState == 'Found' && res.data.searchState != searchState) {
                            //已经找到对局,并且上一次状态不是已找到对局,请点击接受
                            await callLOLApi('post', '/lol-matchmaking/v1/ready-check/accept');
                            searchState = 'Found';
                            window.clearInterval(intervalID); //关闭当前循环调用
                            await cycleCall();
                        } else if (res.data.searchState == 'Searching') {
                            //当前正在寻找对局
                            searchState = 'Searching';
                        }
                    }
                }, 1000);  //循环检测[是否找到对局], 1秒检测一次, 检测到了就点击接受并停止循环
            }
        }
    }, 1000);  //循环检测[是否正在寻找对局], 如果是就停止当前循环,并继续执行上面的[循环检测是否找到对局]
    resolve();
});
}





//以下是参考方法, 以上是正式方法
///////////////////////////////////////////////////////////////////

//判断游戏是否运行
function islolRunning() {
    return new Promise(resolve => {
        try {
            exec(getRunStatusCMD, { encoding: 'buffer' }, function (err, stdout, stderr) {
                // 获取命令行执行的输出并解析
                var stdoutStr = iconv.decode(stdout, 'cp936');
                var arr = stdoutStr.split("\r\r\n");
                let newArr = arr.filter(i => i && i.trim()).filter(i => i.trim()); //过滤为空的字符串
                var lolAppName = newArr[0]; //获取到了进程名则说明游戏正在运行

                if (typeof (lolAppName) != 'undefined' && lolAppName.trim() != '') {  //这里需要利用短路功能
                    //游戏启动了,进行下一步获取游戏路径
                    console.log(lolAppName);
                    p.innerHTML = newArr;
                    resolve(true);
                } else {
                    console.log('游戏未启动, 请启动游戏!');
                    resolve(false);
                }
            });
        } catch (err) {
            console.log(err)
        }
    })
}

//获取游戏启动路径
function getlolRunPath() {
    try {
        exec(getPathCMD, { encoding: 'buffer' }, function (err, stdout, stderr) {
            // 获取命令行执行的输出并解析
            var stdoutStr = iconv.decode(stdout, 'cp936');
            var arr = stdoutStr.split("\r\r\n");
            let newArr = arr.filter(i => i && i.trim()).filter(i => i.trim()); //过滤为空的字符串
            console.log(arr);
            lolpath = path.dirname(newArr[0]) //获取到游戏启动目录路径
            console.log(lolpath);
            parseLockFile(lolpath + '\\lockfile')
        })
    } catch (err) {
        console.log(err)
    }
}

btn.onclick = () => {
    console.log("haha")
    try {
        exec(cmd, { encoding: 'buffer' }, function (err, stdout, stderr) {
            // 获取命令行执行的输出
            var stdoutStr = iconv.decode(stdout, 'cp936');
            console.log(stdoutStr);
            var arr = stdoutStr.split("\r\r\n");
            let newArr = arr.filter(i => i && i.trim()).filter(i => i.trim());
            console.log(newArr);
            p.innerHTML = newArr;
            console.log(path.dirname(newArr[0]));
            console.log(path.basename(newArr[0]));
            console.log(path.extname(newArr[0]));
        });
    } catch (err) {
        console.log(err)
    }
}

//开启按钮
function testHttps() {
    if (run_status == 'close') {
        pmessage.innerHTML = '<font style = "color:red">open</font>';
        run_status = pmessage.textContent;
        console.log(run_status);
        parseLockFile();
        testHttps();
        callLOLApi('get', '/testroute');
    }
}




//读取lockfile文件: LeagueClient:16408:51892:H60XiFdnlzAiR9xlJDuCwQ:https
function parseLockFile(dirPath, flag) {  //这里第二个参数是:是否强制重新读取lockfile
    console.log('dirPath:' + dirPath);
    if (flag || !is_parse_lockfile) {
        //当is_parse_lockfile标志为flase说明是第一次解析,或者强制重新读取标志为true
        let temp = fs.readFileSync(dirPath);  //这个相对位置是从项目根目录开始
        let mess = iconv.decode(temp, 'cp936'); //输出中文用这个编码
        var messList = mess.split(':');

        port = messList[2];
        username = 'riot';
        password = messList[3];
        protocol = messList[4];
        is_parse_lockfile = true;
    }

    console.log(messList);
    console.log('port:' + port);
    console.log('username:' + username);
    console.log('password:' + password);
    console.log('protocol:' + protocol);
    //callLOLApi('post', '/lol-matchmaking/v1/ready-check/accept');
}

//拼接并异步调用lolapi
function callLOLApi(method, route) {
    return new Promise(resolve => {
        try {
            var authStr = Buffer.from(username + ':' + password);
            console.log(protocol + '://127.0.0.1:' + port + route);
            console.log(method);

            axios({
                method: method,
                url: protocol + '://127.0.0.1:' + port + route,
                headers: { 'Authorization': 'Basic ' + authStr.toString('base64') },
            }).then(res => {
                console.log(res);
                resolve(res);
            })
        } catch (err) {
            console.log('调用lolapi发生异常!');
            console.log(err);
        }
    })

    // axios({
    //     method: 'get',
    //     url: 'https://127.0.0.1:63026/lol-champions/v1/owned-champions-minimal',
    //     headers: { 'Authorization': 'Basic ' + authStr.toString('base64') },
    // }).then(res => {
    //     console.log(iconv.decode(authStr, 'base64'));
    // })
}