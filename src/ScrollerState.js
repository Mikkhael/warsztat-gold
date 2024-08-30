//@ts-check
import { ref } from "vue";
import ipc from "./ipc"
import { escape_sql_value } from "./utils";

/**
 * @typedef {string | number | null} Value
 */

class ScrollerState {
	/**
	 * @param {Value} starting_value 
	 * @param {(() => Promise<boolean>)?} before_change
	 */
	constructor(starting_value, before_change = null) {
		// this.has_value_updated = false;
		// this.update_queries(starting_value);
		this.value = ref(starting_value);
		this.bounds = ref(/**@type {[Value|undefined, Value|undefined, number]} */ ([undefined, undefined, 0]));
		this.before_change = before_change;
		this.is_empty = ref(true);
		this.is_bounds_utd = ref(false);
		this.expire();
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

	expire() {
		this.is_bounds_utd.value  = false;
	}


	/**
	 * 
	 * @param {string} str 
	 * @param {Value | undefined} base_offset 
	 * @returns 
	 */
	#get_query(str = "", base_offset = undefined) {
		if(base_offset === undefined) base_offset = this.value.value;
		return str.replace("{{}}", escape_sql_value(base_offset) ?? '0');
	}

	/**
	 * @param {Value} value 
	 */
	#set_value(value) {
		let new_value = value;
		// if(typeof(this.value.value) === 'number') new_value = +value || 0;
		// else 							          new_value = value;
		this.value.value = new_value;
		return this.value.value;
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
		// check if already at bounds. tp not trigger update
		if(this.value.value === this.bounds.value[0] && !dir_next) return this.value.value;
		if(this.value.value === this.bounds.value[1] &&  dir_next) return this.value.value;
		if(!bypass_before_change && this.before_change){
			const should_change = await this.before_change();
			if(!should_change) return undefined;
		}
		let str_query;
			 if( with_curr &&  dir_next) str_query = this.str_query_ncur;
		else if( with_curr && !dir_next) str_query = this.str_query_pcur;
		else if(!with_curr &&  dir_next) str_query = this.str_query_next;
		else if(!with_curr && !dir_next) str_query = this.str_query_prev;
		const [rows, col_names] = await ipc.db_query(this.#get_query(str_query, base_offset));
		if(rows.length <= 0) {
			return this.#set_value(this.bounds.value[+dir_next] ?? 0); // if there is no next element, snap to bounds
		} else {
			this.is_empty.value = false;
			return this.#set_value(rows[0][0]);
		}
	}
	async goto(/**@type {Value} */ value, force_update = false, dir_next = true) {
		return await this.#scroll(true, dir_next, force_update, value);
	}
	async goto_step(/**@type {Boolean} */ direction_next, force_update = false) {
		return await this.#scroll(false, direction_next, force_update);
	}
	async goto_bound(/**@type {Boolean} */ to_last, force_update = false) {
		return await this.#scroll(true, to_last, force_update, this.bounds.value[to_last ? 1 : 0]);
	}
	async refresh(bypass_before_change = false, dir_next = true) {
		return await this.#scroll(true, dir_next, true, undefined, bypass_before_change);
	}
}

export default ScrollerState;