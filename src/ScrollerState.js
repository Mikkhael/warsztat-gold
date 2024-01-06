//@ts-check

import ipc from "./ipc"
import { escape_sql_value } from "./utils";

class ScrollerState {
	/**
	 * @param {any} starting_value 
	 * @param {(any) => void} emit_callback 
	 */
	constructor(starting_value, emit_callback) {
		// this.has_value_updated = false;
		// this.update_queries(starting_value);
		this.value = starting_value;
		this.bounds = [starting_value, starting_value, 0];
		this.emit_callback = emit_callback;
		this.is_empty = true;
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
		this.is_bounds_utd  = false;
		this.is_curr_utd    = false;
	}


	get_query(str = "") {
		return str.replace("{{}}", escape_sql_value(this.value) ?? '0');
	}

	/**
	 * @param {any} value 
	 * @param {boolean} emit 
	 */
	set_value(value, emit) {
			 if(typeof(this.value) === 'number') this.value = +value;
		else if(typeof(this.value) === 'bigint') this.value = BigInt(value);
		else 									 this.value = value;
		if(isNaN(this.value)) 					 this.value = value;
		if(emit && this.emit_callback)
			this.emit_callback(this.value);
		// this.has_value_updated = true;
	}
	// poll_has_value_updated() {
	// 	const res = this.has_value_updated; 
	// 	this.has_value_updated = false;
	// 	return res;
	// }

	async update_bounds(force = false) {
		if(this.is_bounds_utd && !force) return;
		console.log("scroller - bounds");
		const [rows, col_names] = await ipc.db_query(this.get_query(this.str_query_bounds));
		if(rows.length <= 0 || rows[0][2] == 0) {
			// console.log("scroller - bounds - empty");
			this.bounds = [this.value,this.value,0];
			this.is_empty  = true;
		} else {
			this.bounds = [rows[0][0], rows[0][1], rows[0][2]];
			this.is_empty = false;
		}
		this.is_bounds_utd = true;
		// console.log("scroller - bounds - ", this.bounds);
	}

	/**
	 * 
	 * @param {boolean} with_curr 
	 * @param {boolean} dir_next
	 * @returns 
	 */
	async scroll(with_curr, dir_next, emit = true, force = false) {
		await this.update_bounds(force);
		if(with_curr && this.is_curr_utd && !force) return;
		console.log("scroller - scroll", with_curr, dir_next);
		let str_query;
			 if( with_curr &&  dir_next) str_query = this.str_query_ncur;
		else if( with_curr && !dir_next) str_query = this.str_query_pcur;
		else if(!with_curr &&  dir_next) str_query = this.str_query_next;
		else if(!with_curr && !dir_next) str_query = this.str_query_prev;
		const [rows, col_names] = await ipc.db_query(this.get_query(str_query));
		if(rows.length <= 0) {
			// console.log("scroller - scroll - none");
			// this.is_empty  = true;
			await this.update_bounds(force);
			this.set_value(this.bounds[+dir_next], emit);
		} else {
			this.is_empty = false;
			this.set_value(rows[0][0], emit);
		}
		this.is_curr_utd = true;
		// console.log("scroller - scroll - ", this.value);
	}
	async goto(value, dir_next = true, emit = true) {
		console.log("scroller - goto", value, dir_next);
		this.set_value(value, emit);
		await this.scroll(true, dir_next, emit, true);
	}
	async goto_bound(to_last = true, emit = true, force = false) {
		await this.update_bounds(force);
		this.set_value(this.bounds[+to_last], emit);
		this.is_curr_utd = true;
	}
	refresh(dir_next = true, emit = true) {
		return this.scroll(true, dir_next, emit, true);
	}
}

export default ScrollerState;