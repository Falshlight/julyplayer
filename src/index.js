import { app, BrowserWindow, Menu, Tray, globalShortcut } from 'electron';
const electronLocalshortcut = require('electron-localshortcut');
const path = require('path');
const electron = require('electron');
const { autoUpdater } = require("electron-updater");

autoUpdater.checkForUpdatesAndNotify()

const assetsDirectory = path.join(__dirname, 'img');

if (require('electron-squirrel-startup')) { 
  app.quit();
}

let mainWindow;
let tray;
let trayTemplate = [{ label: 'Развернуть', click: restoreFromTray },
  {label: 'Сейчас играет:'},
  {label: 'Ничего не играет'},
  {label: 'Продолжить', click: function () {mainWindow.webContents.executeJavaScript(`toggle_audio()`);}},
  {type: "separator"},
  { label: 'Выйти',
    click: () => {
      app.isQuiting = true;
      app.quit();
    } },
];

function restoreFromTray() {
  mainWindow.show();
  mainWindow.focus();
}

const createWindow = () => {
  const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width, height,
    icon: path.join(assetsDirectory, 'tray.png'),
    webPreferences: {
            nodeIntegration: true
        }
  });

  mainWindow.loadURL(`file://${__dirname}/index.html`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }

    return false;
  });
};


app.on('ready', createWindow);
app.on('ready', () => {
  tray = new Tray(path.join(assetsDirectory, 'tray.png'));
  const contextMenu = Menu.buildFromTemplate(trayTemplate);
  tray.setToolTip('JulyPlayer');
  tray.setContextMenu(contextMenu);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('ready', () => {
  const mappings = {
    "CommandOrControl+Alt+Right": "forward()",
    "CommandOrControl+Alt+Left": "backward()",
    "CommandOrControl+Alt+Down": "toggle_audio()",
    "CommandOrControl+Alt+Up": "queue_clear(true)",
    "MediaNextTrack": "forward()",
    "MediaPreviousTrack": "backward()",
    "MediaPlayPause": "toggle_audio()",
    "MediaStop": "queue_clear(true)",
    "CommandOrControl+Shift+Right": "forward()",
    "CommandOrControl+Shift+Left": "backward()",
    "CommandOrControl+Shift+Down": "toggle_audio()",
    "CommandOrControl+Shift+Up": "queue_clear(true)",
  };

  for (let key in mappings) {
    globalShortcut.register(key, () => {
      mainWindow.webContents.executeJavaScript(mappings[key]);
    });
  }

  electronLocalshortcut.register(mainWindow, 'Ctrl+Shift+I', () => {
        mainWindow.webContents.openDevTools();
    });

globalShortcut.register('CommandOrControl+Shift+1', () => {
      restoreFromTray();
    });
});

app.on('will-quit', () => {
  // Отменяем регистрацию сочетания клавиш.

  globalShortcut.unregisterAll();
  electronLocalshortcut.unregisterAll(mainWindow);
});

function check_tray_value(value, index) {
	if (value !== trayTemplate[index].label) {
			trayTemplate[index].label = value;
			const contextMenu = Menu.buildFromTemplate(trayTemplate);
  			tray.setContextMenu(contextMenu);
		}
}

function check_tray() {
	if (!mainWindow) return;
	mainWindow.webContents.executeJavaScript(`[$("#cs-title").text(), $("#audio-control i").hasClass('fa-play')]`, function (result) {
  		var track = result[0];
		check_tray_value(track, 2);
		var is_playing = !result[1];
		var l = is_playing ? 'Пауза' : 'Продолжить';
		check_tray_value(l, 3);
		setTimeout(check_tray, 1000);
	});
}

app.on('ready', () => {
setTimeout(check_tray, 1500);
});


