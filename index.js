// electron-packager . --platform=win32 --arch=x64 --out=dist --overwrite

const { app, BrowserWindow, globalShortcut, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

let win;
let isExpanded = false;
let animation;
let opacity = 0;
let isAltPressed = false;
let cursorFollowInterval;

var targetWidth = 300;
var targetHeight = 220;


function createWindow () {
  win = new BrowserWindow({
    width: 1,
    height: 1,
    show: false,
    autoHideMenuBar: true,
    darkTheme: true,
    icon: "./resources/nothing.png",
    backgroundMaterial: 'tabbed',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
  win.setOpacity(0);
  win.setMenu(null);

  win.on('closed', () => {
    win = null;
  });
  
  win.on('blur', () => {
    isAltPressed = false;
    stopCursorFollow();
  });

  globalShortcut.register('Alt+X', () => {
    if (isExpanded) {
      minimizeWindow();
    } else {
      expandWindow();
    }
  });

  globalShortcut.register('Alt+I', () => {
    win.webContents.openDevTools();
  })

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Alt') {
      isAltPressed = true;
      startCursorFollow();
    } else if (input.type === 'keyUp' && input.key === 'Alt') {
      isAltPressed = false;
      stopCursorFollow();
    }
  });

  // win.webContents.openDevTools();

  win.webContents.on('dom-ready', () => {
    win.webContents.executeJavaScript(`
      document.getElementById('comp').addEventListener('click', compressOrStop);
      document.getElementById('novoice').addEventListener('click', noVoice);
      document.getElementById('lasttotemp').addEventListener('click', lastToTemp);
      document.getElementById('lastnov').addEventListener('click', lastNoVoice);
    `);
  });
}


function expandWindow() {
  if (animation) {
    clearInterval(animation);
  }

  let { width, height } = win.getBounds();

  win.show();
  startCursorFollow();
  isAltPressed = true;

  animation = setInterval(() => {
    width += (targetWidth - width) * 0.1;
    height += (targetHeight - height) * 0.1;
    opacity = Math.min(opacity + 0.05, 1);

    win.setOpacity(opacity);
    // win.center();

    win.setBounds({ width, height });

    if (Math.abs(width - targetWidth) < 1 && Math.abs(height - targetHeight) < 1) {
      clearInterval(animation);
      animation = null;
      isExpanded = true;
    }
  }, 5);
}


function minimizeWindow() {
  if (animation) {
    clearInterval(animation);
    animation = null;
  }

  let { width, height } = win.getBounds();

  animation = setInterval(() => {
    width -= width * 0.1;
    height -= height * 0.1;
    opacity = Math.max(opacity - opacity * 0.24, 0);

    win.setOpacity(opacity);
    // win.center();

    if ((width <= 1 && height <= 1) || opacity <= 0) {
      clearInterval(animation);
      animation = null;
      isExpanded = false;
      win.hide();
      // isAltPressed = false;
      stopCursorFollow();
    }

    // Resize the window
    win.setBounds({ width, height });
  }, 5); // Change the interval to adjust the speed of the animation
}


function followCursor() {
  const cursorPosition = screen.getCursorScreenPoint();
  const { width, height } = win.getBounds();

  // var newPosX = Math.floor(cursorPosition.x - width / 2);
  // var newPosY = Math.floor(cursorPosition.y - height / 2);

  let [ winX, winY ] = win.getPosition();

  var newPosX = Math.floor(((cursorPosition.x - width / 2) + 4 * winX) / 5);
  var newPosY = Math.floor(((cursorPosition.y - height / 2) + 4 * winY) / 5);


  win.setPosition(newPosX, newPosY)
}


app.whenReady().then(createWindow);


function startCursorFollow() {
  cursorFollowInterval = setInterval(() => {
    if (isAltPressed) {
      followCursor();
    }
  }, 10);
}


function stopCursorFollow() {
  clearInterval(cursorFollowInterval);
}


app.on('will-quit', () => {
  globalShortcut.unregister('Alt+X');
  globalShortcut.unregisterAll();
});
