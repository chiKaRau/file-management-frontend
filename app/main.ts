import { app, BrowserWindow, ipcMain, dialog, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as archiver from 'archiver';


let win: BrowserWindow | null = null;

const args = process.argv.slice(1),
  serve = args.some(val => val === '--serve');

function createWindow(): BrowserWindow {

  const size = screen.getPrimaryDisplay().workAreaSize;

  // Create the browser window.
  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      allowRunningInsecureContent: (serve),
      contextIsolation: false,
    },
  });

  if (serve) {
    const debug = require('electron-debug');
    debug();

    require('electron-reloader')(module);
    win.loadURL('http://localhost:4200');
  } else {
    // Path when running electron executable
    let pathIndex = './index.html';

    if (fs.existsSync(path.join(__dirname, '../dist/index.html'))) {
      // Path when running electron in local folder
      pathIndex = '../dist/index.html';
    }

    const url = new URL(path.join('file:', __dirname, pathIndex));
    win.loadURL(url.href);
  }

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  return win;
}

ipcMain.on('zip-files', (event, files: string[], outputZipPath: string) => {
  console.log('Received zip-files request');
  console.log('Files to zip:', files); // Debug log

  const output = fs.createWriteStream(outputZipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    // When zipping is complete, send a completion message.
    event.reply('zip-complete', { outputZipPath, total: archive.pointer() });
  });
  archive.on('error', (err: any) => {
    // On error, send an error message back.
    event.reply('zip-error', err);
  });
  archive.on('progress', (progressData: archiver.ProgressData) => {
    let percent = 0;
    if (progressData.fs && progressData.fs.totalBytes) {
      percent = Math.round((progressData.fs.processedBytes / progressData.fs.totalBytes) * 100);
    } else if (progressData.entries.total) {
      percent = Math.round((progressData.entries.processed / progressData.entries.total) * 100);
    }
    event.reply('zip-progress', percent);
  });
  archive.pipe(output);
  files.forEach(file => {
    archive.file(file, { name: path.basename(file) });
  });
  archive.finalize();
});

try {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  // Added 400 ms to fix the black background issue while using transparent window. More detais at https://github.com/electron/electron/issues/15947
  app.whenReady().then(() => {
    setTimeout(createWindow, 400);
  });

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });

  // IPC Handler for opening the directory selection dialog
  ipcMain.handle('open-directory-dialog', async () => {
    // Ensure mainWindow is available
    const focusedWindow = BrowserWindow.getFocusedWindow() || win;
    if (!focusedWindow) {
      return null; // or handle this gracefully
    }

    const result = await dialog.showOpenDialog(focusedWindow as BrowserWindow, {
      properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]; // Return the selected directory path
    } else {
      return null;
    }
  });

  ipcMain.handle('open-file-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(options);
    // Return filePaths (or an empty array if canceled)
    return result.filePaths || [];
  });

} catch (e) {
  console.error('Error in main process:', e);
}
