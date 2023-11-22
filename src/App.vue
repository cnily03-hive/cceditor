<template>
    <div class="drag-overlay"></div>
    <TagBar>
        <TagPane v-for="(tag, index) in tags" :key="index" :active="index === currentActiveTagIndex" :changed="tag.changed"
            @activate="() => activateTag(index)" @close="() => closeTag(index, true)">
            {{ tag.name }}
        </TagPane>
    </TagBar>
    <div id="editor-window" class="main"></div>
</template>

<script>
import { setLocaleData } from "monaco-editor-nls"
import zh_CN from "monaco-editor-nls/locale/zh-hans"
setLocaleData(zh_CN)

const monaco = require("monaco-editor/esm/vs/editor/editor.api")

import { copyJSON } from "@/assets/utils"

import TagPane from '@/components/TagPane.vue';
import TagBar from './components/TagBar.vue';
import { toRaw } from 'vue';

import { LocalCache } from "@/assets/local-cache"

const MEM = {
    MonacoConf: new LocalCache('monaco-conf'),
    TagPane: new LocalCache('tag-pane-record')
}

const env = {
    /**
     * @type {monaco.editor.IStandaloneCodeEditor}
     */
    editor: null,
    DEFAULT_OPTIONS: {
        fontSize: 14,
        fontFamily: "Consolas, 'Courier New', monospace",
        lineNumbers: "on",
        mouseWheelZoom: true
    }
}


function loadFile(fp) {
    let res = window.eapi.readFile(fp)
    if (res.error) {
        window.eapi.showError({
            title: "错误",
            message: res.message,
        })
        return null
    }
    return res
}

export default {
    name: 'CCEditorApp',
    components: {
        TagBar, TagPane
    },
    data() {
        return {
            /**
             * @type {HTMLElement}
             */
            container: null,
            currentActiveTagIndex: -1,
            tags: [
                // {
                //     name: "",
                //     filepath: "",
                //     changed: false,
                //     editorInfo: {
                //         cursor: {
                //             lineNumber: 1,
                //             column: 1
                //         },
                //         model: undefined (content is stored in the model)
                //     }
                // }
            ]
        }
    },
    methods: {
        initEditor() {
            this.container = document.getElementById('editor-window');
            env.editor = monaco.editor.create(this.container, {
                // value: "",
                // language: 'plaintext',
                model: null,
                theme: 'vs-dark',
                automaticLayout: true,
                ...env.DEFAULT_OPTIONS
            });
        },
        restoreEditorOption() {
            env.editor.updateOptions(copyJSON(MEM.MonacoConf.data()))
        },
        restoreTagPane() {
            let tags = MEM.TagPane.get('tags').map(v => {
                let res = window.eapi.readFile(v.filepath)
                if (res.error) return null
                return {
                    name: v.name,
                    filepath: v.filepath,
                    changed: false,
                    editorInfo: {
                        cursor: {
                            lineNumber: v.editorInfo.cursor.lineNumber,
                            column: v.editorInfo.cursor.column
                        },
                        model: monaco.editor.createModel(res.content, v.editorInfo.languageId)
                    }
                }
            }).filter(v => v !== null)
            this.tags = tags

            let activeIndex = MEM.TagPane.get('active-index')
            if (activeIndex < 0 || activeIndex >= this.tags.length) activeIndex = this.tags.length - 1
            this.activateTag(activeIndex, true)
        },
        addNewUntitledTab(newIndex = -1) {
            if (newIndex === -1) newIndex = this.tags.length

            let nameNum = 1, existNumList = []
            for (let tag of this.tags) {
                let res = /^Untitled-(\d+)$/.exec(tag.name)
                if (res) existNumList.push(parseInt(res[1]))
            }
            existNumList.sort((a, b) => a - b)
            for (let n of existNumList) {
                if (nameNum < n) break
                nameNum++
            }

            this.tags.splice(newIndex, 0, {
                name: `Untitled-${nameNum}`,
                filepath: undefined,
                changed: true,
                editorInfo: {
                    cursor: {
                        lineNumber: 1,
                        column: 1
                    },
                    model: monaco.editor.createModel("", "plaintext")
                }
            })

            // env.editor.setModel(toRaw(this.tags[newIndex].editorInfo.model))
            this.activateTag(newIndex)
        },
        async closeTag(index, ask = false) {
            if (ask) {
                if (this.tags[index].changed) {
                    let choice = await new Promise((resolve, reject) => {
                        window.eapi.alert({
                            type: "question",
                            title: "关闭文件",
                            message: "文件已修改，是否保存？",
                            buttons: ["保存", "不保存", "取消"],
                            defaultId: 0,
                            cancelId: 2,
                            press(index, value) {
                                resolve(index)
                            }
                        })
                    })
                    if (choice === 0) {
                        window.eapi.emit("save-current-file")
                    } else if (choice === 2) return
                }
            }

            let isCloseCurrentTarget = this.currentActiveTagIndex === index

            let model = isCloseCurrentTarget ? env.editor.getModel() : this.tags[index].editorInfo.model
            // delete the tag
            this.tags.splice(index, 1)
            // dispose the model
            model.dispose()
            if (this.tags.length === 0) {
                // this.clearEditor()
                this.currentActiveTagIndex = -1
                this.addNewUntitledTab();
            } else {
                if (isCloseCurrentTarget) this.activateTag(Math.min(index, this.tags.length - 1), true)
                else if (index < this.currentActiveTagIndex) --this.currentActiveTagIndex
            }
        },
        activateTag(index, forceLoad = false) {
            if (index < 0 || index >= this.tags.length) return
            let next = index, prev = toRaw(this.currentActiveTagIndex)
            if (prev !== next) {
                this.currentActiveTagIndex = next
                // store the previous tag's editor info
                if (prev >= 0 && prev < this.tags.length) {
                    this.tags[prev].editorInfo = {
                        cursor: env.editor.getPosition(),
                        model: env.editor.getModel()
                    }
                }
            }
            if (forceLoad || prev !== next) {
                // restore the editor info
                let { cursor, model } = toRaw(this.tags[next].editorInfo)
                // set the model
                env.editor.setModel(model)
                // set the cursor
                env.editor.setPosition(cursor)
            }

            // focus the editor
            env.editor.focus()
        },
        /**
         * If the content is not edited but actually changed by other way, update the content
         */
        checkAndUpdateContent(index) {
            if (index < 0 || index >= this.tags.length) return
            if (this.tags[index].filepath === undefined) return

            let isPreviouslyChanged = this.tags[index].changed
            if (isPreviouslyChanged) return
            let newerChanged = this.updateChangeStatus(index, true, true)

            if (isPreviouslyChanged === false && newerChanged === true) {
                let res = window.eapi.readFile(this.tags[index].filepath)
                if (res.error) return
                // 更新值，但是保留光标位置、保留操作历史
                let model = env.editor.getModel()
                let cursor = env.editor.getPosition()
                env.editor.executeEdits("", [{
                    range: model.getFullModelRange(),
                    text: res.content
                }])
                env.editor.setPosition(cursor)
                // update the change status
                this.tags[index].changed = false
            } else this.tags[index].changed = newerChanged
        },
        clearEditor(clearHistory = false) {
            if (clearHistory) {
                env.editor.setValue("")
            } else {
                env.editor.executeEdits("", [{
                    range: env.editor.getModel().getFullModelRange(),
                    text: ""
                }])
            }
        },
        getLanguageByExtMime(ext, mime) {
            let map = monaco.languages.getLanguages()

            for (let lang in map) {
                const language = map[lang]
                if (language.extensions && language.extensions.includes(ext)) return language.id
                if (language.mimetypes && language.mimetypes.includes(mime)) return language.id
            }

            return "plaintext"
        },
        updateChangeStatus(index, noCache = false, dryRun = false) {
            if (index < 0 || index >= this.tags.length) return
            let res;
            if (this.tags[index].filepath === undefined) res = { error: 0, equal: false }
            else res = window.eapi.compareFileBufer(this.tags[index].filepath, env.editor.getValue(), noCache)
            if (res.error) console.log(res.message)
            else if (!dryRun) this.tags[index].changed = !res.equal
            return !res.equal
        }
    },
    mounted() {
        this.initEditor();
        try { this.restoreEditorOption() } catch (e) { console.error(e) }
        try { this.restoreTagPane() } catch (e) { console.error(e) }
        // compare the file buffer with the editor content
        env.editor.onDidChangeModelContent((e) => {
            if (this.currentActiveTagIndex < 0) return
            let index = toRaw(this.currentActiveTagIndex)
            this.updateChangeStatus(index)
        })

        /** event */

        window.eapi.on("ask-quit", () => {
            let unsaved = this.tags.filter(v => {
                if (v.filepath === undefined) return !(toRaw(v.editorInfo.model).getValue() === "");
                return v.changed
            }).map(v => {
                return {
                    name: v.name,
                    filepath: v.filepath
                }
            })
            if (unsaved.length === 0) return window.eapi.quit()
            else {
                try {
                    window.eapi.alert({
                        type: "question",
                        title: "未保存的更改",
                        message: "仍有更改未保存，是否继续退出？",
                        buttons: ["不保存并退出", "取消"],
                        defaultId: 0,
                        cancelId: 1,
                        press(index, value) {
                            if (index === 0) window.eapi.quit()
                        }
                    })
                } catch (e) {
                    console.error(e)
                    window.eapi.quit()
                }
            }
        })

        window.eapi.on("open-file", (fp) => {
            if (!fp) return
            // find if the file is already opened
            let isOpened = this.tags.some((tag, index) => {
                if (tag.filepath === fp) {
                    this.activateTag(index)
                    return true
                }
            })
            if (isOpened) return

            // open the file
            let res = loadFile(fp)
            if (res === null) return
            this.tags.push({
                name: window.eapi.path.basename(fp),
                filepath: fp,
                changed: false,
                editorInfo: {
                    cursor: {
                        lineNumber: 1,
                        column: 1,
                    },
                    model: monaco.editor.createModel(res.content, this.getLanguageByExtMime(window.eapi.path.extname(fp), res.mime))
                }
            })
            this.activateTag(this.tags.length - 1)
        })

        window.eapi.on("new-file", () => {
            this.addNewUntitledTab(this.currentActiveTagIndex + 1)
        })

        window.eapi.on("save-current-file", () => {
            let activeTag = this.tags[this.currentActiveTagIndex]
            if (!activeTag) return

            if (activeTag.filepath === undefined) {
                window.eapi.emit("save-file-as")
                return
            }

            let res = window.eapi.saveFile(activeTag.filepath, env.editor.getValue())
            if (res.error === 0) activeTag.changed = false
        })

        window.eapi.on("save-file-as", async () => {
            let activeTag = this.tags[this.currentActiveTagIndex]
            if (!activeTag) return

            let fp = await window.eapi.getSavePath(activeTag.filepath || activeTag.name)

            let res = window.eapi.saveFile(fp, env.editor.getValue())
            if (res.error === 0) {
                for (let i = 0; i < this.tags.length; ++i) {
                    if (this.tags[i].filepath === fp && i !== this.currentActiveTagIndex) {
                        this.closeTag(i)
                        break
                    }
                }
                activeTag.filepath = fp
                activeTag.name = window.eapi.path.basename(fp)
                activeTag.changed = false
            }
        })

        window.eapi.on("close-current-tag", () => {
            if (this.currentActiveTagIndex === -1) return
            this.closeTag(this.currentActiveTagIndex)
        })

        window.eapi.on("editor-undo", () => {
            env.editor.trigger("", "undo", null)
        })

        window.eapi.on("editor-redo", () => {
            env.editor.trigger("", "redo", null)
        })

        window.eapi.on("editor-select-all", () => {
            env.editor.trigger("", "editor.action.selectAll", null)
        })

        window.eapi.on("editor-cut", () => {
            env.editor.trigger("", "editor.action.clipboardCutAction", null)
        })

        window.eapi.on("editor-copy", () => {
            env.editor.trigger("", "editor.action.clipboardCopyAction", null)
        })

        window.eapi.on("editor-paste", () => {
            env.editor.trigger("", "editor.action.clipboardPasteAction", null)
        })

        // 检测焦点重新回到编辑器
        env.editor.onDidFocusEditorText(() => {
            this.checkAndUpdateContent(this.currentActiveTagIndex)
        })

        // key bindings
        this.container.addEventListener("keydown", (e) => {
            if (e.ctrlKey && !e.shiftKey) {
                switch (e.code) {
                    case "KeyS":
                        e.preventDefault()
                        window.eapi.emit("save-current-file")
                        break
                    case "KeyN":
                        e.preventDefault()
                        this.addNewUntitledTab(this.currentActiveTagIndex + 1)
                        // window.eapi.emit("new-file")
                        break
                    case "KeyO":
                        e.preventDefault()
                        window.eapi.selectFilePath().then(fp => {
                            window.eapi.emit("open-file", fp)
                        })
                        break
                    case "KeyW":
                        e.preventDefault()
                        this.closeTag(this.currentActiveTagIndex, true)
                        // window.eapi.emit("close-current-tag")
                        break
                    // case "KeyZ":
                    //     e.preventDefault()
                    //     window.eapi.emit("editor-undo")
                    //     break
                    // case "KeyY":
                    //     e.preventDefault()
                    //     window.eapi.emit("editor-redo")
                    //     break
                }
            }
        })

        // drag file
        const DragOverlay = {
            $el: document.querySelector(".drag-overlay"),
            onOver: false,
            onWatch: false,
            show() {
                DragOverlay.onOver = true
                this.$el.classList.add("display", "over")
                this.$el.classList.add()
                DragOverlay.watch()
            },
            hide() {
                DragOverlay.onOver = false
                this.$el.classList.remove("over")
            },
            // watch 防止以外的情况导致遮罩不消失
            watch() {
                if (DragOverlay.onWatch) return
                let itv = setInterval(() => {
                    DragOverlay.onWatch = true
                    let opacity = parseFloat(getComputedStyle(this.$el).opacity)
                    if (opacity <= 0) {
                        this.$el.classList.remove("display")
                        DragOverlay.onWatch = false
                        clearInterval(itv)
                    }
                }, 500)
            }
        }

        window.addEventListener('dragover', (event) => {
            event.preventDefault();
            if (DragOverlay.onOver) return
            DragOverlay.show();
        });

        window.addEventListener('dragleave', (event) => {
            event.preventDefault();
            DragOverlay.hide();
        });

        window.addEventListener('drop', (event) => {
            event.preventDefault();
            DragOverlay.hide();
            const files = event.dataTransfer.files;
            for (let i = 0; i < files.length; i++) {
                window.eapi.emit("open-file", files[i].path)
            }
        });

        // add action
        env.editor.addAction({
            id: 'clear-cache',
            label: '清除缓存',
            keybindings: null,
            run: (ed) => {
                MEM.MonacoConf.clear()
                MEM.TagPane.clear()
            }
        })

        env.editor.addAction({
            id: 'reset-options',
            label: '重置设置',
            keybindings: null,
            run: (ed) => {
                ed.trigger("", "editor.action.fontZoomReset")
                ed.updateOptions(copyJSON(env.DEFAULT_OPTIONS))
            }
        })

        window.env = env

        // add a new untitled tab
        if (this.tags.length === 0) this.addNewUntitledTab()


        // sync cache
        setInterval(() => {
            // sync monaco config
            MEM.MonacoConf.set('fontSize', env.editor.getOption(monaco.editor.EditorOption.fontSize))
            MEM.MonacoConf.save()

            // sync tag pane
            let tag_states = this.tags.map(v => {
                return {
                    name: v.name,
                    filepath: v.filepath,
                    changed: v.changed,
                    editorInfo: {
                        cursor: {
                            lineNumber: v.editorInfo.cursor.lineNumber,
                            column: v.editorInfo.cursor.column
                        },
                        languageId: v.editorInfo.model.getLanguageId()
                    }
                }
            })

            MEM.TagPane.set('tags', tag_states)
            MEM.TagPane.set('active-index', this.currentActiveTagIndex)
            MEM.TagPane.save()
        }, 1000)

        // emit load complete
        window.eapi.emitFrontEndLoadComplete()
    },
}

</script>

<style lang="scss">
body {
    margin: 0;
    padding: 0;
}

#app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #2c3e50;
    width: 100vw;
    height: 100vh;
    overflow: hidden;

    * {
        user-select: none;
    }
}

.main {
    width: 100%;
    height: 100%;

    .monaco-editor {
        padding-top: 5px;
        background-color: var(--vscode-editor-background);
    }
}

.drag-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(255, 255, 255);
    z-index: 1000;
    // align-items: center;
    // justify-content: center;
    // text-align: center;
    transition: opacity 0.2s ease-in-out;

    opacity: 0;

    &.display {
        display: flex;
    }

    $max-opacity: 0.5;

    &.over {
        opacity: $max-opacity;
        animation: fade-in 0.2s ease-in-out;
    }

    @keyframes fade-in {
        from {
            opacity: 0;
        }

        to {
            opacity: $max-opacity;
        }
    }
}
</style>
