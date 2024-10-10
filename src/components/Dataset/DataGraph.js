
//@ts-check

import { ref, computed, shallowRef, unref, triggerRef, reactive, readonly, isRef } from 'vue';

/**
 * @template T
 * @typedef {import('vue').Ref<T>} Ref
 */
/**
 * @template T
 * @typedef {import('vue').ComputedRef<T>} ComputedRef
 */
/**
 * @template T
 * @typedef {T | Ref<T>} MaybeRef
 */


class UnableToUpdateError extends Error {
    /**
     * @param {DataGraphNodeBase} node 
     */
    constructor(node) {
      super('Unable to update expired state in Data Graph Node');
      this.node = node;
    }
    static name = 'UnableToUpdateError';
};


/**
 * @template T 
 * @extends {Set<T>}
 * */
class MySet extends Set {
    constructor(){
        super()
    }
    /**
     * @param {(value: T) => boolean} callabck 
     */
    some(callabck) {
        for(const value of this.values()){
            if(callabck(value)) return true;
        }
        return false;
    }
}

////////////////// BASE GRAPH NODE /////////////////////////////////

class DataGraphNodeBase {

    constructor() {
        this.deps  = shallowRef(/**@type {MySet<DataGraphNodeBase>} */ (new MySet()));
        this.dists = shallowRef(/**@type {MySet<DataGraphNodeBase>} */ (new MySet()));
        this.expired_deps  = computed(() => this.deps.value.some(x => x.expired.value));
        this.expired_self  = ref(true);
        /**@type {ComputedRef<boolean>} */
        this.expired = computed(() => this.expired_self.value   ||
                                      this.check_expired_impl() || 
                                      this.expired_deps.value);
        this.changed_dists = computed(() => this.dists.value.some(x => x.changed.value));
        this.changed_self  = ref(false);
        /**@type {ComputedRef<boolean>} */
        this.changed = computed(() => this.changed_self.value   ||
                                      this.check_changed_impl() || 
                                      this.changed_dists.value);
        
        this._visited = false;
    }
    ///////////// TO OVERWRITE ///////////
    check_changed_impl() {return false;}
    check_expired_impl() {return false;}
    update_impl(){return Promise.resolve();}
    async confirm_update_on_changed() {
        return confirm('Posiadasz niezapisane zmiany, które zostaną utracone. Czy chcesz kontynuować?');
    }
    //////////////////////////////////////
    

    expire(){
        this.expired_self.value = true;
    }
    change(){
        this.changed_self.value = true;
    }

    set_dists_as_expired() {
        this.dists.value.forEach(node => node.expire());
    }

    async update_self_only(set_dists_expired = true) {
        await this.update_impl();
        this.expired_self.value = false;
        if(this.expired.value) {
            this.expired_self.value = true;
            throw new UnableToUpdateError(this);
        }
        this.changed_self.value = false;
        if(set_dists_expired){
            this.set_dists_as_expired();
        }
    }

    static async #update_from_list_safe(nodes_to_update, set_dists_expired = true) {
        try{
            for(const node of nodes_to_update) {
                await node.update_self_only(set_dists_expired);
            }
        } catch (err) {
            // if(err instanceof UnableToUpdateError){
                nodes_to_update.forEach(node => node.expire());
            // }
            throw err;
        }
    } 

    async update_deps_only() {
        const nodes_to_update = get_all_expired_deps(this);
        await DataGraphNodeBase.#update_from_list_safe(nodes_to_update);
        this.set_dists_as_expired();
    }

    async update_complete() {
        const nodes_to_update = get_complete_expired_subgraph([this]);
        if(nodes_to_update.length === 0) return true;

        if(nodes_to_update.some(x => x.changed.value)) {
            const confirmed = await this.confirm_update_on_changed();
            if(!confirmed) return false;
        }

        await DataGraphNodeBase.#update_from_list_safe(nodes_to_update);
        return true;
    }

    async update_complete_force() {
        const nodes_to_update = get_complete_expired_subgraph([this]);
        await DataGraphNodeBase.#update_from_list_safe(nodes_to_update);
    }

    /**
     * @param {DataGraphNodeBase?} node 
     */
    add_dep(node, no_ref_trigger = false) {
        if(!node) return;
        if(this.deps.value.has(node)) return;
        node.dists.value.add(this);
        this.deps.value.add(node);
        if(!no_ref_trigger){
            triggerRef(this.deps);
            triggerRef(node.dists);
        } 
    }

    /**
     * @template T
     * @param {Dependable<T>} dep 
     * @returns {MaybeRef<T>}
     */
    add_dep_auto_and_get_ref(dep) {
        if(dep instanceof DataGraphDependable) {
            this.add_dep(dep.get_node());
            return dep.get_ref();
        } else if (isRef(dep)) {
            const new_dep = new DataGraphNodeFromRef(dep);
            this.add_dep(new_dep);
            return new_dep.cached;
        }
        return dep;
    }

    disconnect() {
        this.deps .value.forEach(x => {x.dists.value.delete(this); triggerRef(x.dists);});
        this.dists.value.forEach(x => {x.deps .value.delete(this); triggerRef(x.deps );});
        this.deps .value.clear();
        this.dists.value.clear();
        triggerRef(this.deps);
        triggerRef(this.dists);
    }
}

/**@template T */
class DataGraphNodeFromRef extends DataGraphNodeBase {
    /**
     * @param {Ref<T>} value
     */
    constructor(value) {
        super();
        this.ref    = value;
        this.cached = shallowRef(unref(this.ref));
    }
    
    check_changed_impl() {return unref(this.cached) !== unref(this.ref);}
    check_expired_impl() {return unref(this.cached) !== unref(this.ref);}
    async update_impl()  {this.cached.value = unref(this.ref);}
}

/**@template T */
class DataGraphDependable {
    constructor(){}
    /**@returns {Ref<T>} */
    get_ref()  {throw new Error('not implemented');}
    /**@returns {DataGraphNodeBase?} */
    get_node() {throw new Error('not implemented');}
}

/**@template T */
class AdvDependableRef extends DataGraphDependable {
    /**
     * @param {DataGraphNodeBase} node 
     * @param {T?} initial_value
     */
    constructor(node, initial_value = null){
        super();
        this.ref = ref(initial_value);
        this.node = node;
    }
    get_ref()  {return this.ref;}
    get_node() {return this.node;}
}
/**@template T */
class NullDependableRef extends DataGraphDependable {
    /**
     * @param {Ref<T>} ref
     */
    constructor(ref){
        super();
        this.ref = ref;
    }
    get_ref()  {return this.ref;}
    get_node() {return null;}
}


/**
 * @template T
 * @typedef { MaybeRef<T> | DataGraphDependable<T> } Dependable
 * */

/**
 * @template T
 * @typedef { import('vue').PropType<DataGraphDependable<T>> } DependableProp
 * */


/**
 * @typedef {(dep: DataGraphNodeBase) => boolean} NodePredicate 
 */

/**@type {NodePredicate} */
const node_predicate_expired = (dep) => dep.expired.value;
/**@type {NodePredicate} */
const node_predicate_changed = (dep) => dep.changed.value;
/**@type {NodePredicate} */
const node_predicate_always  = (dep) => true;

/**
 * @param {DataGraphNodeBase} node
 * @param {NodePredicate} should_include
 * @param {DataGraphNodeBase[]} results_list
 * @param {DataGraphNodeBase[]} visited_list
 */
function dfs_deps(node, should_include, results_list, visited_list) {
    if(node._visited) return;
    node._visited = true;
    visited_list.push(node);
    if(should_include(node)) {
        for(const dep of node.deps.value) {
            dfs_deps(dep, should_include, results_list, visited_list);
        }
        results_list.push(node);
    }
}

/**
 * @param {DataGraphNodeBase[]} nodes
 * @param {NodePredicate} should_include
 * @param {DataGraphNodeBase[]} results_list
 * @param {DataGraphNodeBase[]} visited_list
 * @param {boolean} leafs_only
 */
function bfs_dists(nodes, should_include, results_list, visited_list, leafs_only) {
    while(nodes.length > 0) {
        /**@type {DataGraphNodeBase[]} */
        const included_nodes = [];
        for(const node of nodes) {
            if(node._visited) continue;
            node._visited = true;
            visited_list.push(node);
            if(should_include(node)) {
                if(!leafs_only || node.dists.value.size === 0){
                    results_list.push(node);
                }
                included_nodes.push(node);
            }
        }
        nodes = included_nodes.flatMap(node => Array.from(node.dists.value));
    }
}


/**
 * @param {DataGraphNodeBase} node 
 */
function get_all_expired_deps(node) {
    /**@type {DataGraphNodeBase[]} */
    const result = [];
    /**@type {DataGraphNodeBase[]} */
    const visited = [];
    dfs_deps(node, node_predicate_expired, result, visited);
    visited.forEach(x => x._visited = false);
    return result;
}

/**
 * @param {DataGraphNodeBase[]} nodes
 */
function get_all_dists(nodes){
    /**@type {DataGraphNodeBase[]} */
    const result = [];
    /**@type {DataGraphNodeBase[]} */
    const visited = [];
    bfs_dists(nodes, node_predicate_always, result, visited, false);
    visited.forEach(x => x._visited = false);
    return result;
}

/**
 * @param {DataGraphNodeBase[]} nodes
 */
function get_complete_expired_subgraph(nodes){
    /**@type {DataGraphNodeBase[]} */
    const leaves = [];
    /**@type {DataGraphNodeBase[]} */
    const result = [];
    /**@type {DataGraphNodeBase[]} */
    const visited = [];
    bfs_dists(nodes, node_predicate_always, leaves, visited, true);
    visited.forEach(x => x._visited = false);
    leaves.forEach(node => dfs_deps(node, node_predicate_expired, result, visited));
    visited.forEach(x => x._visited = false);
    return result;
}

export {
    DataGraphNodeBase,
    DataGraphNodeFromRef,

    AdvDependableRef,
    NullDependableRef
}