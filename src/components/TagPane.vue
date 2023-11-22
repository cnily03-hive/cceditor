<template>
    <div :class="tagClasses">
        <span class="tag-content">
            <slot></slot>
        </span>
        <span :class="{ 'close-btn': true, 'show-dot': changed }">
            <i class="icon icon-cross"></i>
            <i class="icon icon-dot"></i>
        </span>
    </div>
</template>

<script>
export default {
    name: 'TagPane',
    props: {
        active: {
            type: Boolean,
            default: false
        },
        changed: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        // 使用计算属性来确定最终的 class 名称
        tagClasses() {
            return {
                'tag-pane': true,
                'active': this.active
            };
        }
    },
    mounted() {
        // 监听点击事件
        this.$el.addEventListener('click', (e) => {
            if (e.target === this.$el.querySelector('.close-btn') || e.target === this.$el.querySelector('.close-btn .icon')) {
                return
            }
            e.preventDefault();
            this.$emit('activate', e);
        });
        // 监听关闭事件
        this.$el.querySelector('.close-btn').addEventListener('click', (e) => {
            this.$emit('close', e);
        });
        this.$el.addEventListener('mouseup', (e) => {// 鼠标中键关闭
            if (e.button === 1) {
                this.$emit('close', e);
            }
        });
    },
};
</script>

<style lang="scss">
.tag-pane {
    min-width: calc(150px - 10px - 5px);
    width: max-content;
    height: calc(100% - 2px);
    // border-left: #282829 solid 1px;
    // border-right: #1c1b22 solid 1px;
    border-top: #282829 solid 1px;
    background-color: #282829;
    border-bottom: #282829 solid 1px;
    padding: 0 5px 0 10px;
    margin-right: 1px;

    display: block;

    cursor: pointer;

    &:hover,
    &:focus {
        border-top: #3e3e3f solid 1px;
        background-color: #3e3e3f !important;
        border-bottom: #3e3e3f solid 1px;
    }

    &.active {
        border-top: #343435 solid 1px;
        background-color: #343435;
        border-bottom: #b5b5b6 solid 1px;
    }

    .tag-content {
        display: inline-block;
        padding: 0 10px 0 0;
        line-height: 30px;
        height: 100%;
        color: #b5b5b6;
        font-size: 14px;
    }

    .close-btn {
        display: block;
        position: relative;
        float: right;
        line-height: 0;
    }

    .close-btn {
        transform: translateY(5px);
        width: .75rem;
        height: .75rem;
        padding: 3px;
        border-radius: 15%;

        .icon {
            position: absolute;
            top: 3px;
            left: 3px;
            width: .75rem;
            height: .75rem;
        }

        .icon.icon-cross {
            z-index: 99;
            opacity: 0;
        }

        .icon.icon-dot {
            z-index: 98;
            scale: 0.8;
            opacity: 0;
        }

        &.show-dot .icon.icon-dot {
            opacity: 1;
        }
    }


    // 只要悬停在标签上，显示叉叉 (not show-dot)
    &:hover,
    &:focus,
    &.active {
        .close-btn:not(.show-dot) .icon.icon-cross {
            opacity: 1;
        }
    }

    // 图标颜色
    .close-btn .icon,
    &:hover .close-btn .icon {
        color: #b5b5b6;
    }

    // 图标颜色 (active)
    &:focus .close-btn .icon,
    &.active .close-btn .icon {
        color: #e1e1e1;
    }

    // 悬停在叉叉上
    .close-btn:hover,
    .close-btn:focus {
        background-color: rgba(141, 139, 156, 30%) !important;

        .icon.icon-cross {
            opacity: 1;
        }

        .icon.icon-cross+.icon.icon-dot {
            opacity: 0;
        }

    }
}

.icon {
    box-sizing: border-box;
    display: inline-block;
    font-size: inherit;
    font-style: normal;
    position: relative;
    text-indent: -9999px;
    vertical-align: middle;
    height: .75rem;
    width: .75rem;

    &::before,
    &::after {
        content: "";
        display: block;
        left: 50%;
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
    }
}

.icon-cross {

    &::before,
    &::after {
        background: currentColor;
        height: 100%;
        width: .1rem;
    }

    &::before {
        transform: translate(-50%, -50%) rotate(45deg);
    }

    &::after {
        transform: translate(-50%, -50%) rotate(-45deg);
    }
}

.icon-dot {
    background: currentColor;
    border-radius: 50%;
}
</style>
