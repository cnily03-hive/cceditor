<template>
    <div id="tag-bar" class="tag-bar">
        <slot></slot>
    </div>
</template>

<script>
export default {
    name: 'TagBar'
};
</script>

<style lang="scss">
.tag-bar {
    width: 100%;
    height: 30px;
    display: flex;
    flex-direction: row;
    background-color: #1c1b22;
}
</style>