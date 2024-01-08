<script setup>
//@ts-check

const props = defineProps({
    title: String,
    content: String,
    type: String
});

</script>

<template>

    <div class="CornerMsg" :class="props.type">
        <header>
            <div class="icon">O</div>
            <div class="title">{{ props.title }}</div>
            <div class="close_btn">X</div>
        </header>
        <main>
            {{ props.content }}
        </main>
    </div>

</template>

<style scoped>


.CornerMsg {
    border-radius: 10px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    border: 2px solid black;
}

.CornerMsg.info     { background-color: #ccfcf9; border-color: #00ffee; }
.CornerMsg.warn     { background-color: #f9fccc; border-color: #eeff00; }
.CornerMsg.error    { background-color: #fccdcc; border-color: #ff0400; }
.CornerMsg.critical { background-color: #f7a9a9; border-color: #ff0000; }

.CornerMsg > * {
    width: 100%;
}
.CornerMsg > header {
    font-size: 1em;
    font-weight: bold;
    border-bottom: black 3px solid;
    display: flex;
    justify-content: space-between;
}

.CornerMsg > header > .icon {
    margin-right: 4px;
}
.CornerMsg > header > .close_btn {
    /* border-left: 2px solid black; */
    color: gray;
}
.CornerMsg > header > .title {
    text-overflow: ellipsis;
    text-wrap: nowrap;
    overflow: hidden;
}

.CornerMsg > main {
    font-size: 0.8em;
    max-height: 3.3em;
    line-height: 1.1em;
    /* overflow: hidden; */
    text-overflow: ellipsis;
    text-align: justify;
    position: relative;
}
.CornerMsg > main::after {
    font-weight: bold;
    content: "...";
    bottom: 0px;
    right: 0px;

}

</style>