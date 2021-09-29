const iconv = require('iconv-lite');  //用于解决中文输出乱码
const fs = require('fs');  //用于调用本地读取文件的api
const axios = require('axios');  //用于异步请求
const exec = require('child_process').exec;  //用于执行cmd命令


var cmd = 'wmic process get executablepath | find "WeChatApp.exe"';
var btn = document.getElementById("btn");
var p = document.getElementById("pdemo");

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
        });
    } catch (err) {
        console.log(err)
    }
}



var openBtn = document.getElementById("openBtn");
var pmessage = document.getElementById("pmessage");
var run_status = pmessage.textContent;

//开启按钮
openBtn.onclick = () => {
    if (run_status == 'close') {
        pmessage.innerHTML = '<font style = "color:red">open</font>';
        run_status = pmessage.textContent;
        console.log(run_status);
        parseLockFile();
        testHttps();
        callLOLApi('get','/testroute');
    }
}

//关闭按钮
var closeBtn = document.getElementById("closeBtn");
closeBtn.onclick = () => {
    if (run_status == 'open') {
        pmessage.innerHTML = '<font style = "color:black">close</font>';
        run_status = pmessage.textContent;
        console.log(run_status);
    }
}

var port;
var username;
var password;
var protocol;

//读取lockfile文件: LeagueClient:16408:51892:H60XiFdnlzAiR9xlJDuCwQ:https
function parseLockFile() {
    let temp = fs.readFileSync('src/demo/lockfile');  //这个相对位置是从项目根目录开始
    let mess = iconv.decode(temp, 'cp936'); //输出中文用这个编码
    var messList = mess.split(':');

    port = messList [2];
    username = 'riot';
    password = messList [3];
    protocol = messList [4];
    

    console.log(messList);
    console.log('port:' + port);
    console.log('username:' + username);
    console.log('password:' + password);
    console.log('protocol:' + protocol);
}

//https请求
function testHttps() {
    var testStr = Buffer.from(username + ':' + password);
    axios({
        method:'get',
        url:'http://www.alenc.cn',
        headers:{'Authorization':'Basic '+testStr.toString('base64')},
    }).then(res => {
        console.log(iconv.decode(testStr, 'base64'));
    })
    .catch(err => {
        console.log(err);
    })
}

//拼接并异步调用lolapi
function callLOLApi(method,route) {
    var testStr = Buffer.from(username + ':' + password);
    axios({
        method:method,
        url:protocol+'://127.0.0.1:' + port + route,
        headers:{'Authorization':'Basic '+testStr.toString('base64')},
    }).then(res => {
        console.log(iconv.decode(testStr, 'base64'));
    })
    .catch(err => {
        console.log(err);
    })
}