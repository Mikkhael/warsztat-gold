<script setup>
//@ts-check

import { shallowRef, shallowReactive, ref } from 'vue';
import { DataGraphNodeBase } from '../Dataset/DataGraph';

let updated_cnt = 0;

class TestNode extends DataGraphNodeBase {
    /**
     * @param {string} name
     */
    constructor(name){
        super();
        this.name = name;
        this.was_updated = ref(0);
        this.expired_self.value = false;
    }

    check_changed_impl() {console.log("CHECK CHANGED ", this.name); return false;}
    check_expired_impl() {console.log("CHECK EXPIRED ", this.name); return false;}
    update_impl() {console.log('UPDATING ', this.name); this.was_updated.value = ++updated_cnt; return Promise.resolve()};
}


const all_nodes = {};
/**@type {(TestNode | null)[][]} */
const nodes_to_display = [[]];
/**
 * @param {string} name 
 * @param {string[]} deps 
 */
function new_node(name, deps = []) {
    if(all_nodes[name]) {
        console.error("JEST JUŻ NODE", name);
        return;
    }
    const node = new TestNode(name);
    all_nodes[name] = node;
    nodes_to_display[nodes_to_display.length - 1].push(node);
    for(const dep of deps) {
        const dep_node = all_nodes[dep];
        if(!dep_node) {
            console.error("NIE MA NODE'A", dep, all_nodes);
            return
        }
        node.add_dep(dep_node);
    }
}

function next_line() {
    nodes_to_display.push([]);
}
function blank(){
    nodes_to_display[nodes_to_display.length - 1].push(null);
}

function clear_updated() {
    for(const node of Object.values(all_nodes)) {
        node.was_updated.value = 0;
        updated_cnt = 0;
    }
}
function clear_expired() {
    for(const node of Object.values(all_nodes)) {
        node.expired_self.value = false;
    }
}

/**
 * @param {TestNode | null} node 
 */
function clicked(node, ctrl, shift) {
    console.log('CLICKED', node);
    if(node) {
        if(shift) {
            node.update_complete();
        } else if(ctrl) {
            node.changed_self.value = !node.changed_self.value;
        } else {
            node.expired_self.value = !node.expired_self.value;
        }
    }
}


blank();
blank();
blank();
new_node( 'DB' );

next_line();

blank();
new_node( 'TAB1', ['DB'] );
new_node( 'TAB2', ['DB'] );
blank();
new_node( 'TAB3', ['DB'] );
blank();
new_node( 'TAB_unused', ['DB'] );

next_line();

new_node( 'Q1_1',  ['TAB1'] );
new_node( 'Q1_2',  ['TAB1'] );

new_node( 'Q2',    ['TAB1', 'TAB2'] );

blank();
new_node( 'Q3',    ['TAB3'] );

next_line();

blank();
new_node( 'Q1_2b',  ['Q1_2'] );
new_node( 'Q2b',    ['Q2'] );
blank();
new_node( 'Q3b',    ['Q3'] );

next_line();

blank();
new_node( 'Q1_all', ['Q1_1', 'Q1_2b'] );
blank();
blank();
new_node( 'Q3c1',    ['Q3',  'Q3b']);
new_node( 'Q3c2',    ['Q3b', 'Q3']);




</script>


<template>

	<div>

        <div class="row" v-for="row in nodes_to_display" >
            <div class="cell" v-for="cell in row" @click="e => clicked(cell, e.ctrlKey, e.shiftKey)" :class="{is_null: cell === null}">
                <div> {{ cell === null ? '.' : cell.name }} </div>
                <div> {{ cell === null ? '.' : cell.expired.value      ? 'expired'      : '.' }} </div>
                <div> {{ cell === null ? '.' : cell.changed.value      ? 'changed'      : '.' }} </div>
                <div> {{ cell === null ? '.' : cell.expired_self.value ? 'expired_self' : '.' }} </div>
                <div> {{ cell === null ? '.' : cell.changed_self.value ? 'changed_self' : '.' }} </div>
                <div> {{ cell === null ? '.' : cell.was_updated.value  ? 'updated ' + cell.was_updated.value : '.' }} </div>
            </div>
        </div>

        <button @click="clear_expired" >CLEAR EXPIRED</button>
        <button @click="clear_updated" >CLEAR UPDATED</button>

    </div>

</template>

<style scoped>

    .row{
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: flex-start;
        justify-content: start;
    }
    .cell {
        flex-shrink: 0;
        margin: 4px;
        width: 100px;
        text-align: center;
        border: 1px solid black;
        cursor: pointer;
    }
    .is_null {
        visibility: hidden;
    }

</style>
