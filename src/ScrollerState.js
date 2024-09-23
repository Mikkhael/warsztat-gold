//@ts-check
import { computed, ref } from "vue";
import ipc from "./ipc"
import { escape_sql_value } from "./utils";

/**
 * @typedef {string | number | null} Value
 */

class ScrollerStateBase {
	
	/**
	 * @param {Value} starting_index 
	 * @param {(() => Promise<boolean>)?} before_change
	 */
	constructor(starting_index, before_change = null) {
		// this.has_value_updated = false;
		// this.update_queries(starting_value);
		this.index = ref(starting_index);
		this.before_change = before_change;
		this.is_empty = ref(true);
		this.is_bounds_utd = ref(false);
		this.expire();
	}

	expire() {
		this.is_bounds_utd.value  = false;
	}

	// TO OVERRIDE
	
	async goto(/**@type {Value} */ index, force_update = false, bypass_before_change = false, dir_next = true) {
		return Promise.resolve(/**@type {Value | undefined} */ (undefined));
	}
	async scroll_by(/**@type {number} */ steps, force_update = false) {
		return Promise.resolve(/**@type {Value | undefined} */ (undefined));
	}
	async goto_bound(/**@type {Boolean} */ to_last, force_update = false, bypass_before_change = false) {
		return Promise.resolve(/**@type {Value | undefined} */ (undefined));
	}
	async refresh(bypass_before_change = false, dir_next = true) {
		return Promise.resolve(/**@type {Value | undefined} */ (undefined));
	}
}


class ScrollerState extends ScrollerStateBase {
	/**
	 * @param {Value} starting_index 
	 * @param {(() => Promise<boolean>)?} before_change
	 */
	constructor(starting_index, before_change = null) {
		super(starting_index, before_change);
		this.bounds = ref(/**@type {[Value|undefined, Value|undefined, number]} */ ([undefined, undefined, 0]));
	}
	/**
	 * @param {string} field 
	 * @param {string} from 
	 * @param {string} where 
	 */
	update_queries(field, from, where) {
		this.expire();

		this.field = field;
		this.from  = from;
		this.where = where;

		const where_bnds  = 			 this.where ? `WHERE ${this.where}`  : '';
		const where_next  = `WHERE ` + ( this.where ? `(${this.where}) AND ` : `` ) + `${this.field} >  {{}}`;
		const where_ncur  = `WHERE ` + ( this.where ? `(${this.where}) AND ` : `` ) + `${this.field} >= {{}}`;
		const where_prev  = `WHERE ` + ( this.where ? `(${this.where}) AND ` : `` ) + `${this.field} <  {{}}`;
		const where_pcur  = `WHERE ` + ( this.where ? `(${this.where}) AND ` : `` ) + `${this.field} <= {{}}`;

		this.str_query_bounds = `SELECT min(${this.field}), max(${this.field}), count(*) FROM ${this.from} ${where_bnds};`;
		this.str_query_next   = `SELECT ${this.field} FROM ${this.from} ${where_next} ORDER BY ${this.field} ASC  LIMIT 1;`;
		this.str_query_ncur   = `SELECT ${this.field} FROM ${this.from} ${where_ncur} ORDER BY ${this.field} ASC  LIMIT 1;`;
		this.str_query_prev   = `SELECT ${this.field} FROM ${this.from} ${where_prev} ORDER BY ${this.field} DESC LIMIT 1;`;
		this.str_query_pcur   = `SELECT ${this.field} FROM ${this.from} ${where_pcur} ORDER BY ${this.field} DESC LIMIT 1;`;
		this.str_query_first  = `SELECT ${this.field} FROM ${this.from} ${where_bnds} ORDER BY ${this.field} ASC  LIMIT 1;`;
		this.str_query_last   = `SELECT ${this.field} FROM ${this.from} ${where_bnds} ORDER BY ${this.field} DESC LIMIT 1;`;
	}


	/**
	 * 
	 * @param {string} str 
	 * @param {Value | undefined} base_offset 
	 * @returns 
	 */
	#get_query(str = "", base_offset = undefined) {
		if(base_offset === undefined) base_offset = this.index.value;
		return str.replace("{{}}", escape_sql_value(base_offset) ?? '0');
	}

	/**
	 * @param {Value} index 
	 */
	#set_index(index) {
		let new_index = index;
		// if(typeof(this.value.value) === 'number') new_value = +value || 0;
		// else 							          new_value = value;
		this.index.value = new_index;
		return this.index.value;
		// this.has_value_updated = true;
	}
	// poll_has_value_updated() {
	// 	const res = this.has_value_updated; 
	// 	this.has_value_updated = false;
	// 	return res;
	// }

	async update_bounds(force = false) {
		if(this.is_bounds_utd && !force) return;
		const [rows, col_names] = await ipc.db_query(this.#get_query(this.str_query_bounds));
		if(rows.length <= 0 || rows[0][2] == 0) { // no rows returned, or count(*) is 0 
			this.bounds.value[0] = undefined;
			this.bounds.value[1] = undefined;
			this.bounds.value[2] = 0;
			this.is_empty.value  = true;
			this.index.value = null;
		} else {
			this.bounds.value[0] = rows[0][0];
			this.bounds.value[1] = rows[0][1];
			this.bounds.value[2] = Number(rows[0][2]);
			this.is_empty.value = false;
		}
		this.is_bounds_utd.value = true;
	}

	/**
	 * @param {boolean} with_curr 
	 * @param {boolean} dir_next
	 * @param {Value | undefined} base_offset
	 * @returns 
	 */
	async #scroll(with_curr, dir_next, force_update = false, base_offset = undefined, bypass_before_change = false) {
		await this.update_bounds(force_update);
		if(this.is_empty.value) return null;
		if(!bypass_before_change && this.before_change){
			const should_change = await this.before_change();
			if(!should_change) return undefined;
		}
		// check if already at bounds. tp not trigger update
		if(base_offset === undefined && this.index.value === this.bounds.value[0] && !dir_next) return this.index.value;
		if(base_offset === undefined && this.index.value === this.bounds.value[1] &&  dir_next) return this.index.value;
		let str_query;
			 if( with_curr &&  dir_next) str_query = this.str_query_ncur;
		else if( with_curr && !dir_next) str_query = this.str_query_pcur;
		else if(!with_curr &&  dir_next) str_query = this.str_query_next;
		else if(!with_curr && !dir_next) str_query = this.str_query_prev;
		const [rows, col_names] = await ipc.db_query(this.#get_query(str_query, base_offset));
		if(rows.length <= 0) {
			return this.#set_index(this.bounds.value[+dir_next] ?? 0); // if there is no next element, snap to bounds
		} else {
			this.is_empty.value = false;
			return this.#set_index(rows[0][0]);
		}
	}
	async goto(/**@type {Value} */ index, force_update = false, bypass_before_change = false, dir_next = true) {
		return await this.#scroll(true, dir_next, force_update, index, bypass_before_change);
	}
	async scroll_by(/**@type {number} */ steps, force_update = false) {
		return await this.#scroll(false, steps > 0, force_update);
	}
	async goto_bound(/**@type {Boolean} */ to_last, force_update = false, bypass_before_change = false) {
		return await this.#scroll(true, to_last, force_update, this.bounds.value[to_last ? 1 : 0], bypass_before_change);
	}
	async refresh(bypass_before_change = false, dir_next = true) {
		return await this.#scroll(true, dir_next, true, undefined, bypass_before_change);
	}
}

class ScrollerStateSimple extends ScrollerStateBase {

	/**
	 * @param {Number} starting_index 
	 * @param {(() => Promise<boolean>)?} before_change
	 */
	constructor(starting_index, before_change = null, limit = ref(1)) {
		super(starting_index, before_change);
		this.limit = limit;
		this.count = ref(0);
		// this.is_empty  = computed(() => this.count.value === 0);
		this.max_index = computed(() => this.count.value - (this.limit.value - 1));
		this.str_query_count = '';
	}
	/**
	 * @param {string} query_from
	 */
	update_query(query_from) {
		this.expire();
		this.str_query_count = `SELECT count(*) FROM ${query_from};`;
	}


	/**
	 * @param {Number} new_index 
	 */
	#set_index(new_index) {
		// console.log("NEW INDEX SIMPLE", new_index, 'old: ', this.index.value);
		this.index.value = new_index;
		return this.index.value;
	}

	async update_count(force = false) {
		if(this.is_bounds_utd && !force) return;
		const [rows, col_names] = await ipc.db_query(this.str_query_count);
		if(rows.length <= 0 || rows[0][0] === 0) { // no rows returned, or count(*) is 0 
			this.count.value = 0;
			this.is_empty.value = true;
			this.index.value = null;
		} else {
			this.count.value = Number(rows[0][0]);
			this.is_empty.value = false;
		}
		this.is_bounds_utd.value = true;
	}

	/**
	 * @param {number} new_index
	 * @returns 
	 */
	async #scroll(new_index, with_limit = false, force_update = false, bypass_before_change = false) {
		// console.log("SCROLL SIMPLE", new_index, with_limit, force_update, bypass_before_change);
		await this.update_count(force_update);
		if(this.is_empty.value) return null;
		const max_index = with_limit ? this.max_index.value : this.count.value;
		if(new_index > max_index) new_index = max_index;
		if(new_index < 1)         new_index = 1;
		if(new_index === this.index.value) return this.index.value;
		if(!bypass_before_change && this.before_change){
			const should_change = await this.before_change();
			if(!should_change) return undefined;
		}
		return this.#set_index(new_index);
	}
	async goto(/**@type {Value} */ index, force_update = false, bypass_before_change = false, dir_next = true) {
		return await this.#scroll(Number(index), false, force_update, bypass_before_change);
	}
	async scroll_by(/**@type {number} */ steps, force_update = false) {
		return await this.#scroll(Number(this.index.value) + steps, true, force_update);
	}
	async goto_bound(/**@type {Boolean} */ to_last, force_update = false, bypass_before_change = false) {
		return await this.#scroll(to_last ? Infinity : 0, true, force_update, bypass_before_change);
	}
	async refresh(bypass_before_change = false, dir_next = true) {
		return await this.#scroll(Number(this.index.value), false, true, bypass_before_change);
	}
}


export {
	ScrollerState,
	ScrollerStateSimple
};