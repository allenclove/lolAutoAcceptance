const iconv = require('iconv-lite'); //用于解决中文输出乱码
const fs = require('fs'); //用于调用本地读取文件的api
const axios = require('axios'); //用于异步请求
const exec = require('child_process').exec; //用于执行cmd命令
const path = require('path'); //处理文件路径
const async = require('async'); //用来实现同步运行方法
const { resolve } = require('path');



var port; //端口
var username; //用户名,默认riot
var password; //密码
var protocol; //协议,一般是https
//该cmd命令需要管理员权限才能保证获取到路径
var getRunStatusCMD = 'wmic process get name | find "LeagueClientUx.exe"'; //用于检测游戏是否运行
var getPathCMD = 'wmic process get executablepath | find "LeagueClientUx.exe"'; //用于获取游戏启动路径
var getGameLaunchInfo = 'WMIC PROCESS WHERE name="LeagueClientUx.exe" GET commandline';
var auto_acceptance_run_status = false; //这个作为自动接受功能是否开启的标志, 默认为false
var lol_run_status = false; //这个作为游戏是否运行的标志
var is_parse_lockfile = false; //这个是是否解析lockfile文件的标志
var lolpath = ''; //游戏启动目录路径
var intervalID; //存储自动接受循环的id


//用于获取端口号和密码用于调用api
async function progremInit() {
    getPortAndPassword();
}

//开启按钮
var openBtn = document.getElementById("openBtn");
openBtn.onclick = async () => {
    //开启自动接受
    pmessage.innerHTML = '<font style = "color:blue">自动接受已开启</font>';
    // 修改按钮dom的class名
    openBtn.className = 'button leftButton active';
    closeBtn.className = 'button rightButton ';
    auto_acceptance_run_status = true;

    await progremInit();

    await cycleCall();
}

//关闭按钮
var closeBtn = document.getElementById("closeBtn");
closeBtn.onclick = async () => {
    //关闭自动接受
    pmessage.innerHTML = '<font style = "color:red">自动接受已关闭</font>';
    // 修改按钮dom的class名
    closeBtn.className = 'button rightButton active';
    openBtn.className = 'button leftButton';
    window.clearInterval(intervalID);
    auto_acceptance_run_status = false;
}

function cycleCall() {
    return new Promise(resolve => {
        intervalID = window.setInterval(async () => {
            //这个api是查询当前状态，当找到对局和进入选人界面状态都是Found，所以需要下面那个api辅助判断是否正好在找到对局状态
            var res = await callLOLApi('get', '/lol-lobby/v2/lobby/matchmaking/search-state');
            console.log('res:' + res);

            //选择界面的时候请求状态是200，其他情况是404
            var res2 = await callLOLApi('get', '/lol-champ-select/v1/session');
            console.log('res2:' + res2);

            if (res.status !== 200) {
                console.log('正在判断是否当前正在寻找对局');
            } else if (res.data.searchState == 'Found' && res2.status == 404) {
                //已经找到对局,并且获取当前队伍信息请求404，表示正好是找到对局状态，等待接受游戏
                await callLOLApi('post', '/lol-matchmaking/v1/ready-check/accept');
                console.log('已经找到对局，点击接受');
            }
        }, 500)
    })
}

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

                if (typeof (lolAppName) != 'undefined' && lolAppName.trim() != '') { //这里需要利用短路功能
                    //游戏启动了,进行下一步获取游戏路径
                    console.log(lolAppName);
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

//弃用的方法-----2021.11.30 by allenc
//////////////////////////////////////////////////////////////////////////////////////////////////////
//由于获取游戏启动路径就是为了去解析Lockfile文件，现在不需要解析该文件了，该方法也就不需要了（顺便提一下其实也有api可以获得游戏安装路径的）
//GET https://127.0.0.1:61823/data-store/v1/install-dir
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

//大概2021年11月左右，这一次更新导致Lockfile文件不会再实时更新响应的端口号和密码，所以这个解析文件的方法被弃用
//读取lockfile文件: LeagueClient:16408:51892:H60XiFdnlzAiR9xlJDuCwQ:https
function parseLockFile(dirPath, flag) { //这里第二个参数是:是否强制重新读取lockfile
    console.log('dirPath:' + dirPath);
    if (flag || !is_parse_lockfile) {
        //当is_parse_lockfile标志为flase说明是第一次解析,或者强制重新读取标志为true
        let temp = fs.readFileSync(dirPath); //这个相对位置是从项目根目录开始
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

    var authStr = Buffer.from(username + ':' + password);
    console.log('authStr:' + 'Basic ' + authStr.toString('base64'));
}

// async function progremInit() {
//         if (lolpath != '') {
//             //获取到了游戏启动目录路径,解析lockfile文件
//             parseLockFile(lolpath + '\\lockfile');
//             console.log('path:' + lolpath + '\\lockfile');
//         } else {
//             //未获取到了游戏启动目录路径
//             if (await islolRunning()) {
//                 console.log('游戏已经启动');
//                 //获取游戏启动路径
//                 getlolRunPath();
//             } else {
//                 console.log('游戏未启动,请先启动游戏,再启动本工具!');
//             }
//         }
// }
///////////////////////////////////////////////////////////////////////////////////////////////////////

//用于替代解析Lockfile文件的方法来获取端口号和密码， 原理：通过获取游戏启动参数来获取信息
function getPortAndPassword() { //这里第二个参数是:是否强制重新读取lockfile
    try {
        exec(getGameLaunchInfo, { encoding: 'buffer' }, function (err, stdout, stderr) {
            var stdoutStr = iconv.decode(stdout, 'cp936');
            // 通过正则表达式解析游戏启动参数
            let protReg = new RegExp('--app-port=([0-9]*)');
            let authTokenReg = new RegExp('--remoting-auth-token=([\\w-]*)');
            
            port = stdoutStr.match(protReg)[1];
            username = 'riot';
            password = stdoutStr.match(authTokenReg)[1];
            protocol = 'https';

            console.log('port: ' + port);
            console.log('auth-token: ' + password);

            var authStr = Buffer.from(username + ':' + password);
            console.log('authStr:' + 'Basic ' + authStr.toString('base64'));
        })
    } catch (err) {
        console.log('游戏未启动，无法获取游戏启动参数！');
        console.log(err);
    }
}

//拼接并异步调用lolapi
function callLOLApi(method, route) {
    return new Promise(resolve => {
        try {
            var authStr = Buffer.from(username + ':' + password);
            console.log('当前请求地址：' + protocol + '://127.0.0.1:' + port + route);
            console.log('当前请求类型' + method);

            axios({
                method: method,
                url: protocol + '://127.0.0.1:' + port + route,
                headers: { 'Authorization': 'Basic ' + authStr.toString('base64') },
            }).then(res => {
                console.log(res);
                resolve(res);
            }).catch(err => {
                const result = err.response;
                resolve(result);
            })
        } catch (err) {
            console.log('调用lolapi发生异常!');
            console.log(err);
        }
    })
}