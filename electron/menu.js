const { Menu, MenuItem, dialog, ipcRenderer } = require('electron');
const { openFileSelection, askQuit } = require('./event.js')

const FileMenu = new MenuItem({
    label: '文件',
    submenu: [
        { label: '新建', click: () => { global.win.webContents.send('new-file') } },
        { label: '打开', click: async () => { global.win.webContents.send('open-file', openFileSelection()) } },
        { label: '保存', click: () => { global.win.webContents.send('save-current-file') } },
        { label: '另存为', click: async () => { global.win.webContents.send('save-file-as') } },
        { label: '关闭当前标签页', click: () => { global.win.webContents.send('close-current-tag') } },
        { label: '退出', click: () => { askQuit() } }
    ]
});

const EditMenu = new MenuItem({
    label: '编辑',
    submenu: [
        { label: '撤销', click: () => { global.win.webContents.send('editor-undo') } },
        { label: '重做', click: () => { global.win.webContents.send('editor-redo') } },
    ]
});

const SelectMenu = new MenuItem({
    label: '选择',
    submenu: [
        { label: '全选', click: () => { global.win.webContents.send('editor-select-all') } },
        { label: '复制', click: () => { global.win.webContents.send('editor-copy') } },
        { label: '剪切', click: () => { global.win.webContents.send('editor-cut') } },
        { label: '粘贴', click: () => { global.win.webContents.send('editor-paste') } },
    ]
});

const menu = new Menu();
menu.append(FileMenu);
menu.append(EditMenu);
menu.append(SelectMenu);

module.exports = { menu };