
//@ts-check

import { ref, computed, shallowRef, unref, triggerRef, reactive, readonly, isRef } from 'vue';
import ipc from '../../ipc';

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

    first() {
        return this.values().next().value;
    }
}

////////////////// BASE GRAPH NODE /////////////////////////////////

// expried   - trzeba zaciągnąć nową wartość ze źródła
// changed   - jeśli teraz się zaciągnie nową wartość, to nadpisane zostaną zmiany
// inserting - jeśli teraz się zaciągnie nową wartość, to wyłączy się tryb insert
// disabled  - dane wejściowe nie istnieją, ponieważ np. są insertowane

class DataGraphNodeBase {

    constructor() {
        this.deps  = shallowRef(/**@type {MySet<DataGraphNodeBase>} */ (new MySet()));
        this.dists = shallowRef(/**@type {MySet<DataGraphNodeBase>} */ (new MySet()));

        /// EXPIRED ///
        this.expired_dists_deep = computed(() => this.dists.value.some(x => !x.disabled.value && (
                                                                                x.expired.value || 
                                                                                x.expired_dists_deep.value)));
        this.expired_deps  = computed(() => this.deps .value.some(x => x.expired.value));
        this.expired_self  = ref(true);
        /**@type {ComputedRef<boolean>} */
        this.expired = computed(() => this.expired_self.value   ||
                                      this.check_expired_impl() || 
                                      this.expired_deps.value);
        /// CHANGED ///
        this.changed_dists = computed(() => this.dists.value.some(x => x.changed.value));
        /**@type {ComputedRef<boolean>} */
        this.changed = computed(() => !this.disabled.value && (
                                        this.check_changed_impl() || 
                                        this.changed_dists.value));
        
        /// DISABLED ///
        this.disabled_deps = computed(() => this.deps.value.some(x => x.disabled.value ||
                                                                      x.should_disable_dists.value));
        /**@type {ComputedRef<boolean>} */
        this.disabled = computed(() => this.check_disabled_impl() || 
                                       this.disabled_deps.value);
        this.should_disable_dists = computed(() => this.check_should_disable_dists_impl());

        /// INSERTING ///
        // this.empty = ref(true);
        // this.inserting_dists = computed(() => this.dists.value.some(x => x.inserting.value));
        // this.insert_mode     = ref(false);
        // /**@type {ComputedRef<boolean>} */
        // this.inserting = computed(() => this.insert_mode.value ||
        //                                 this.check_inserting_impl() || 
        //                                 this.inserting_dists.value);

        /// OTHER ///
        this._visited = false;
    }
    ///////////// TO OVERWRITE ///////////
    check_expired_impl()   {return false;}
    check_changed_impl()   {return false;}
    // check_inserting_impl() {return false;}
    check_disabled_impl()  {return false;}
    check_should_disable_dists_impl()  {return false;}
    update_impl() {}
    save_impl(force = false){}
    async confirm_update_on_changed() {
        return confirm('Posiadasz niezapisane zmiany, które zostaną utracone. Czy chcesz kontynuować?');
    }
    //////////////////////////////////////
    

    expire(){
        this.expired_self.value = true;
    }

    set_dists_as_expired() {
        this.dists.value.forEach(node => node.expire());
    }

    /// UPDATING

    async update_self_only_force(set_dists_expired = true) {
        // this.insert_mode.value = false;
        await this.update_impl();
        this.expired_self.value = false;
        if(this.expired.value) {
            this.expired_self.value = true;
            throw new UnableToUpdateError(this);
        }
        if(set_dists_expired){
            this.set_dists_as_expired();
        }
    }

    async update_deps_and_self(force = false) {
        if(force) this.expire();
        if(!this.expired.value || this.disabled.value) return;
        if(this.expired_deps.value) {
            for(const dep of this.deps.value.values()){
                await dep.update_deps_and_self();
            }
        }
        await this.update_self_only_force();
    }

    async update_complete(force = false) {
        if(force) this.expire();
        if(this.disabled.value) return;
        await this.update_deps_and_self(); // if performed update, expires all dists
        if(this.expired_dists_deep.value){
            for(const dist of this.dists.value.values()) {
                await dist.update_complete();
            }
        }
    }


    assure_unchanged() {
        // if(this.changed.value || this.inserting.value) return false;
        if(this.changed.value) {
            // debugger;
            return false;
        }
        const nodes_to_update = get_complete_expired_subgraph([this]);
        // if(nodes_to_update.some(x => x.changed.value || x.inserting.value)) return false;
        if(nodes_to_update.some(x => x.changed.value)) {
            // debugger;
            return false;
        }
        return true;
    }

    async assure_unchanged_or_confirm(){
        return this.assure_unchanged() || this.confirm_update_on_changed();
    }


    async try_perform_and_update_confirmed(callabck) {
        const confirmed = await this.assure_unchanged_or_confirm();
        if(confirmed) {
            await callabck(this);
            await this.update_complete();
            return true;
        }
        return false;
    }

    /// SAVING

    async save_deep_notransaction(force = false) {
        if(this.changed.value && !this.disabled.value) {
            await this.save_impl(force);
            for(const dist of this.dists.value.values()) {
                await dist.save_deep_notransaction(force);
            }
        }
    }

    async save_deep_transaction(force = false) {
        await ipc.db_as_transaction(() => this.save_deep_notransaction(force));
    }

    async save_deep_transaction_and_update(force = false) {
        await this.save_deep_transaction(force);
        await this.update_complete();
    }


    /**
     * @param {DataGraphNodeBase?} node 
     */
    add_dep(node, no_ref_trigger = false) {
        if(node === this) {
            throw new Error('Cannot depend on itself');
        }
        if(!node) return false;
        if(this.deps.value.has(node)) return false;
        node.dists.value.add(this);
        this.deps.value.add(node);
        if(!no_ref_trigger){
            triggerRef(this.deps);
            triggerRef(node.dists);
        } 
        return true;
    }
    
    /**
     * @param {DataGraphDependable?} dependable 
     */
    add_dependable(dependable) {
        if(dependable === null) return;
        this.add_dep(dependable.get_node());
    }

    /**
     * @template T
     * @param {Dependable<T>} dep 
     * @returns {MaybeRef<T>}
     */
    add_dependable_or_ref(dep) {
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

    disconnect_with_dists() {
        while(this.dists.value.size > 0) {
            this.dists.value.first().disconnect_with_dists();
        }
        this.disconnect();
    }

    /**
     * @param {(node: DataGraphNodeBase) => void} callback 
     */
    for_each_dist_deep(callback) {
        const nodes = get_all_dists([this]);
        for(let i = 1; i < nodes.length; i++) {
            callback(nodes[i]);
        }
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
    
    // check_changed_impl() {return unref(this.cached) !== unref(this.ref);}
    check_expired_impl() {return unref(this.cached) !== unref(this.ref);}
    update_impl()  {this.cached.value = unref(this.ref);}
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
    get_value() {return this.ref.value;}
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
const node_predicate_expired     = (dep) => dep.expired.value;
/**@type {NodePredicate} */
const node_predicate_changed     = (dep) => dep.changed.value;
/**@type {NodePredicate} */
const node_predicate_nondisabled = (dep) => !dep.disabled.value;
/**@type {NodePredicate} */
const node_predicate_always      = (dep) => true;

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
function get_all_changed_dists(nodes){
    /**@type {DataGraphNodeBase[]} */
    const result = [];
    /**@type {DataGraphNodeBase[]} */
    const visited = [];
    bfs_dists(nodes, node_predicate_changed, result, visited, false);
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
    bfs_dists(nodes, node_predicate_nondisabled, leaves, visited, true);
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