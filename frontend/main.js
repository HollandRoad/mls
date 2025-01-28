const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Environment detection
const isDev = !app.isPackaged;
const waitOn = isDev ? require('wait-on') : null;

let mainWindow;
let djangoProcess;

function getResourcePath(relativePath) {
    return isDev 
        ? path.join(__dirname, '..', relativePath)
        : path.join(process.resourcesPath, relativePath);
}

async function startDjangoServer() {
    return new Promise(async (resolve, reject) => {
        try {
            const pythonPath = getResourcePath(path.join('.venv', 'bin', 'python3'));
            const djangoPath = getResourcePath('backend');

            console.log('Environment:', isDev ? 'Development' : 'Production');
            console.log('Python path:', pythonPath);
            console.log('Django path:', djangoPath);

            djangoProcess = spawn(pythonPath, ['manage.py', 'runserver'], {
                cwd: djangoPath,
                stdio: 'inherit',
                env: {
                    ...process.env,
                    PYTHONUNBUFFERED: '1'
                }
            });

            djangoProcess.on('error', (err) => {
                console.error('Failed to start Django server:', err);
                reject(err);
            });

            if (isDev && waitOn) {
                await waitOn({
                    resources: ['http://localhost:8000/api/'],
                    timeout: 30000,
                    interval: 100,
                });
            } else {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
            console.log('Django server is ready');
            resolve();
        } catch (error) {
            console.error('Error starting Django server:', error);
            reject(error);
        }
    });
}

async function createWindow() {
    try {
        await startDjangoServer();

        mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            show: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
        });

        if (isDev) {
            await mainWindow.loadURL('http://localhost:3000');
        } else {
            const indexPath = path.join(__dirname, 'build', 'index.html');
            console.log('Loading from:', indexPath);
            await mainWindow.loadFile(indexPath);
        }

        mainWindow.once('ready-to-show', () => {
            mainWindow.show();
            if (isDev) {
                mainWindow.webContents.openDevTools();
            }
        });

        mainWindow.on('closed', () => {
            mainWindow = null;
        });

    } catch (error) {
        console.error('Error starting application:', error);
        cleanup();
        app.quit();
    }
}

function cleanup() {
    if (djangoProcess) {
        djangoProcess.kill();
    }
}

app.on('ready', createWindow);
app.on('window-all-closed', () => {
    cleanup();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
app.on('before-quit', cleanup);

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    cleanup();
    app.quit();
}); 