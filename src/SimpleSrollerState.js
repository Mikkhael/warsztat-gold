//@ts-check

import ipc from "./ipc"

class SimpleScrollerState {
	/**
	 * 
	 * @param {number | bigint} starting_value 
	 * @param {string} query_from 
	 * @param {function(bigint): any} emit_callback 
	 */
	constructor(starting_value, query_from, emit_callback) {
		// this.has_value_updated = false;
		// this.update_queries(starting_value);
		this.index = BigInt(starting_value);
		this.count = BigInt(0);
		// this.prim  = [];
		this.emit_callback = emit_callback;
		this.str_query_count = '';
		this.update_queries(query_from);
		this.expire();
	}

	/**
	 * @param {string} query_from 
	 */
	update_queries(query_from) {
		this.expire();
		this.str_query_count = `SELECT count(*) FROM ${query_from};`;
	}

	expire() {
		this.is_count_utd  = false;
		// this.is_prim_utd   = false;
	}


	/**
	 * @param {number | bigint} index 
	 */
	set_index(index, emit = true) {
		this.index = BigInt(index);
		if(this.index < 0) 			this.index += this.count + 1n;
		if(this.index < 1) 		   	this.index = 1n;
		if(this.index > this.count) this.index = this.count;
		console.log("Set index: ", this.index, index);
		if(emit && this.emit_callback)
			this.emit_callback(this.index);
	}

	async update_count(force = false, with_index_update = true) {
		if(this.is_count_utd && !force) return;
		console.log("Updating count");
		const [rows, col_names] = await ipc.db_query(this.str_query_count);
		this.is_count_utd = true;
		this.is_empty 	= rows.length <= 0 || rows[0].length <= 0 || rows[0][0] <= 0;
		this.count 		= BigInt(this.is_empty ? 0 : rows[0][0]);
		console.log("Updated count - ", this.count);
		if(with_index_update) this.set_index(this.index, true);
	}

	async scroll(off, emit = true, force = false) {
		await this.update_count(force, false);
		this.set_index(this.index + BigInt(off), emit);
	}
	async goto(new_index, emit = true, force = false) {
		await this.update_count(force, false);
		this.set_index(new_index, emit);
	}

	async goto_bound(to_last = true, emit = true, force = false) {
		await this.update_count(force, false);
		this.set_index(to_last ? this.count : 1n, emit);
	}
}

export default SimpleScrollerState;