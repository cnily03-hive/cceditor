const { ipcMain, dialog } = require('electron');
const { openFileSelection, openSavePathSelection } = require('./event.js')


ipcMain.handle('send-web-contents', (event, arg) => {
    global.win.webContents.send(arg.channel, ...arg.data)
})

ipcMain.handle('alert', (event, arg) => {
    let { type, title, message, buttons, defaultId, cancelId } = JSON.parse(arg)
    let resp = dialog.showMessageBoxSync(global.win, { title, message, type, buttons, defaultId, cancelId })
    let value = buttons[resp]
    return { index: resp, value }
})

ipcMain.handle('show-error', (event, arg) => {
    let { title, message } = JSON.parse(arg)
    dialog.showErrorBox(title || "Error", message)
})

ipcMain.handle('open-file', (event, arg) => {
    return openFileSelection()
})

ipcMain.handle('open-save-path-selection', (event, arg) => {
    return openSavePathSelection(arg)
})

ipcMain.handle('quit', (event, arg) => {
    global.quit = true
    global.app.quit()
})

ipcMain.handle('front-end-load-complete', (event, arg) => {
    global.quit = false
})