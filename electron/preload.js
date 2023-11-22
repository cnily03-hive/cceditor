const { contextBridge, ipcRenderer, dialog } = require('electron')
const fs = require('fs')
const path = require('path')
const mime = require('mime')

let bufCache = {}

contextBridge.exposeInMainWorld('eapi', {
    emitFrontEndLoadComplete: () => {
        return ipcRenderer.invoke('front-end-load-complete')
    },
    on: (channel, callback) => {
        ipcRenderer.on(channel, (event, ...args) => callback(...args))
    },
    emit: (channel, ...args) => {
        ipcRenderer.invoke('send-web-contents', {
            channel, data: args
        })
    },
    path: {
        basename: path.basename,
        dirname: path.dirname,
        extname: path.extname,
    },
    readFile: (fp) => {
        try {
            let content = fs.readFileSync(fp, 'utf-8');
            let stat = fs.statSync(fp);
            return {
                error: 0,
                content: content,
                size: stat.size,
                mime: mime.getType(fp)
            }
        } catch (e) {
            return {
                error: 1,
                message: e.message
            }
        }
    },
    saveFile(fp, content) {
        try {
            fs.writeFileSync(fp, content);
            if (Object.hasOwnProperty.call(bufCache, fp)) { bufCache[fp].buf = Buffer.from(content); bufCache[fp].time = Date.now() }
            return {
                error: 0
            }
        } catch (e) {
            return {
                error: 1,
                message: e.message
            }
        }
    },
    selectFilePath() {
        return ipcRenderer.invoke("open-file")
    },
    getSavePath(defaultPath) {
        return ipcRenderer.invoke("open-save-path-selection", {
            defaultPath: defaultPath || null
        })
    },
    compareFileBufer(fp, content, noCache = false) {
        try {
            let buf, now = Date.now()
            if (!noCache && Object.hasOwnProperty.call(bufCache, fp)) { buf = bufCache[fp].buf; bufCache[fp].time = now }
            else { buf = fs.readFileSync(fp); bufCache[fp] = { buf, time: now } }
            // clean cache
            if (Object.keys(bufCache).length > 1)
                for (let key in bufCache) {
                    if (now - bufCache[key].time > 60 * 60 * 1000) delete bufCache[key]
                }
            return {
                error: 0,
                equal: buf.equals(Buffer.from(content))
            }
        } catch (e) {
            return {
                error: 1,
                message: e.message
            }
        }

    },
    alert({ type, title, message, buttons, defaultId, cancelId, press = (index, value) => { } }) {
        ipcRenderer.invoke('alert', JSON.stringify({
            type, title, message, buttons, defaultId, cancelId
        })).then(result => {
            // console.log(result)
            press(result.index, result.value)
            return result.index
        }).catch(err => {
            console.log(err)
        })
    },
    showError({ title, message }) {
        ipcRenderer.invoke('show-error', JSON.stringify({
            title, message
        })).then(result => {
            // console.log(result)
        }).catch(err => {
            console.log(err)
        })
    },
    quit() {
        ipcRenderer.invoke('quit')
    }
})