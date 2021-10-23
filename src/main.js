const { app, Menu, BrowserWindow } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
    app.quit();
}

const createWindow = () => {
    Menu.setApplicationMenu(null);
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 630,
        height: 180,
        //resizable: false,  //限制用户调整窗口大小
        webPreferences: {
            nodeIntegration: true, //渲染进程调用nodejs
            contextIsolation: false, //渲染进程调用nodejs
            webSecurity: false, //跨域问题
        }
    });

    //只能打开一个electron程序
    const gotTheLock = app.requestSingleInstanceLock()
    if (!gotTheLock) {
        app.quit()
    } else {
        app.on('second-instance', (event) => {
            if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore()
                mainWindow.focus()
            }
        })
        app.on('ready', () => {
            createWindow()
            const { Menu } = require('electron')
            Menu.setApplicationMenu(null) // 隐藏菜单栏
        })
    }

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Open the DevTools.
    mainWindow.webContents.openDevTools(); //打包时记得注释
};

app.commandLine.appendSwitch('--ignore-certificate-errors', 'true') //跨域问题

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.