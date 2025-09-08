import { app, BrowserWindow, ipcMain, dialog, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as archiver from 'archiver';


let win: BrowserWindow | null = null;

const args = process.argv.slice(1),
  serve = args.some(val => val === '--serve');

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1850,
    height: 900,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      allowRunningInsecureContent: serve,
      contextIsolation: false,
    },
  });

  // keep your global ref if you want it elsewhere
  win = mainWindow;

  // load your URL
  if (serve) {
    const debug = require('electron-debug');
    debug();
    require('electron-reloader')(module);
    mainWindow.loadURL('http://localhost:4200');
  } else {
    let pathIndex = './index.html';
    if (fs.existsSync(path.join(__dirname, '../dist/index.html'))) {
      pathIndex = '../dist/index.html';
    }
    const url = new URL(path.join('file:', __dirname, pathIndex));
    mainWindow.loadURL(url.href);
  }

  // center + show safely (no “possibly null”)
  mainWindow.once('ready-to-show', () => {
    mainWindow.center();
    mainWindow.show();
  });

  mainWindow.on('closed', () => { win = null; });

  return mainWindow;
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
    console.log('Zip progress:', percent, '%');
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
