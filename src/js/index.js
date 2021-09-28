const exec = require('child_process').exec;


var cmd = 'wmic process get executablepath | find "WeChatApp.exe"';
var btn = document.getElementById("btn");
var p = document.getElementById("pdemo");

btn.onclick = () => {
  console.log("haha")
  try {
    exec(cmd, function (err, stdout, stderr) {
        // 获取命令行执行的输出
        console.log(stdout);
        var arr = stdout.split("\r\r\n");
        let newArr = arr.filter(i=>i && i.trim()).filter(i=>i.trim());
        console.log(newArr);
        p.innerHTML = newArr;
      });
  } catch (err) {
      console.log(err)
  }
}