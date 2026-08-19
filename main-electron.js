const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: "pulseAI - Options Conviction Terminal",
  });

  // In development, load Next.js dev server
  const devUrl = "http://localhost:3000";
  mainWindow.loadURL(devUrl).catch(() => {
    // In production, fallback to build output
    mainWindow.loadFile(path.join(__dirname, "out", "index.html"));
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
