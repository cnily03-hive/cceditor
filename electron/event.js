const { dialog } = require('electron')

function openFileSelection() {
    let resp = dialog.showOpenDialogSync(global.win, {
        properties: ['openFile']
    })
    if (Array.isArray(resp)) resp = resp[0]
    return resp // filepath
}

function openSavePathSelection({ defaultPath = null }) {
    let resp = dialog.showSaveDialogSync(global.win, {
        properties: ['createDirectory'],
        defaultPath: typeof defaultPath === 'string' ? defaultPath : undefined
    })
    return resp // filepath
}

function askQuit() {
    try {
        global.win.webContents.send('ask-quit')
    } catch (e) {
        global.quit = false
        global.app.quit()
    }
}

module.exports = { openFileSelection, openSavePathSelection, askQuit }