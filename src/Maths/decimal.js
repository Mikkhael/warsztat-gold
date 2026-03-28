
/**
 * @typedef {DecimalNumber | BigInt | string | number} DecimalNumberConvertable
 */


/**
 * @param {DecimalNumberConvertable} a 
 * @param {DecimalNumberConvertable} b 
 * @returns {[DecimalNumber, DecimalNumber, number]}
 */
function decimal_normalize_relative(a,b) {
    a = DecimalNumber.from(a);
    b = DecimalNumber.from(b);
    if(a.isnan() || b.isnan()) return [a,b,NaN];
    const max_offset = Math.max( a.offset, b.offset );
    a.extend_to(max_offset);
    b.extend_to(max_offset);
    return [a,b,max_offset];
}

/**
 * @param {DecimalNumberConvertable} a 
 * @param {DecimalNumberConvertable} b 
 */
function decimal_add(a,b) {
    const [an,bn,offsetn] = decimal_normalize_relative(a,b);
    return new DecimalNumber( an.mantisa + bn.mantisa, offsetn );
}
// Negative numbers not supported
// /**
//  * @param {DecimalNumberConvertable} a 
//  * @param {DecimalNumberConvertable} b 
//  */
// function decimal_sub(a,b) {
//     const [an,bn,offsetn] = decimal_normalize_relative(a,b);
//     return new DecimalNumber( an.mantisa - bn.mantisa, offsetn );
// }
/**
 * @param {DecimalNumberConvertable} a 
 * @param {DecimalNumberConvertable} b 
 */
function decimal_mul(a,b) {
    a = DecimalNumber.from(a);
    b = DecimalNumber.from(b);
    if(a.isnan() || b.isnan()) return DecimalNumber.nan();
    const new_mantisa = a.mantisa * b.mantisa;
    const new_offset  = a.offset  + b.offset;
    return new DecimalNumber( new_mantisa, new_offset );
}

/**
 * @param {string} str 
 * @param {number} w 
 * @param {string} ch 
 */
function padl(str, w, ch='0') {
    if(str.length >= w) {return str;}
    const diff = w - str.length;
    return ch.repeat(diff) + str;
}
/**
 * @param {string} str 
 * @param {number} w 
 * @param {string} ch 
 */
function padr(str, w, ch='0') {
    if(str.length >= w) {return str;}
    const diff = w - str.length;
    return str + ch.repeat(diff);
}

class DecimalNumber {
    /**
     * @param {BigInt} mantisa 
     * @param {Number} offset 
     */
    constructor(mantisa, offset) {
        this.mantisa  = mantisa;
        this.offset   = offset;
    }

    isnan() {return isNaN(this.offset);}
    copy()  {return new DecimalNumber(this.mantisa, this.offset);}

    /**
     * @param {number=} precision 
     * @returns {string}
     */
    as_string(precision = undefined) {
        if(this.isnan()) return "NaN";
        if(precision === undefined) precision = this.offset;
        if(precision !== this.offset) {
            return this.rounded(precision).as_string();
        }
        if(precision === 0) {
            return this.mantisa.toString();
        }
        const mask  = 10n ** BigInt(this.offset);
        const whole = this.mantisa / mask;
        const frac  = this.mantisa % mask;
        return whole.toString() + '.' + padl(frac.toString(), precision);
    }
    toString() {
        return this.as_string();
    }

    /**
     * @param {number}  new_offset 
     * @param {boolean} cutoff
     * Can lose precision, if normalising down, when no trailing zeros
     */
    round_to(new_offset, cutoff=false) {
        if(this.isnan()) return;
        if(new_offset == this.offset) return;
        if(new_offset < this.offset) {
            const offset_diff = this.offset - new_offset;
            const correction  = 10n ** BigInt(offset_diff);
            this.mantisa  = (this.mantisa + (cutoff ? 0n : (correction/2n))) / correction;
            this.offset   = new_offset;
        } else {
            const offset_diff = new_offset - this.offset;
            this.mantisa *= 10n ** BigInt(offset_diff);
            this.offset   = new_offset;
        }
    }
    /**
     * @param {number} new_offset
     */
    extend_to(new_offset) { 
        if(new_offset < this.offset) throw new Error("Cannot extend with precision loss");
        this.round_to(new_offset);
    }

    /**
     * @param {number} precision 
     */
    simplify_to(precision) {
        while(this.offset > precision) {
            if(this.mantisa % 10n != 0n) {
                return this;
            }
            this.offset  -= 1;
            this.mantisa /= 10n;
        }
        if(this.offset < precision) {
            this.extend_to(precision);
        }
        return this;
    }

    /**
     * @param {number} precision 
     */
    rounded(precision) {
        const res = this.copy();
        res.round_to(precision);
        return res;
    }

    /**
     * @param {DecimalNumberConvertable} other_raw 
     */
    add(other_raw) {
        const other = DecimalNumber.from(other_raw);
        const max_offset = Math.max( this.offset, other.offset );
        this .extend_to(max_offset);
        other.extend_to(max_offset);
        this.mantisa += other.mantisa;
        return this;
    }

    static nan() {
        return new DecimalNumber(0n, NaN);
    }

    /**
     * @param {DecimalNumberConvertable} value 
     */
    static from(value) {
        if( value instanceof DecimalNumber ) return value;
        if( typeof value === 'string'      ) return this.from_string_try(value)            ?? new DecimalNumber(0n,NaN);
        if( typeof value === 'number'      ) return this.from_string_try(value.toString()) ?? new DecimalNumber(0n,NaN);
        if( typeof value === 'bigint'      ) return new DecimalNumber( value, 0 );
        return new DecimalNumber(0n,NaN);
    }

    /**
     * @param {BigInt | string | number} whole 
     * @param {BigInt | string | number} frac_str 
     */
    static from_parts(whole, frac_str) {
        if(typeof whole    !== 'bigint') whole     = BigInt(whole);
        if(typeof frac_str !== 'string') frac_str  = frac_str.toString();
        const frac_trimmed_str = frac_str.replace(/0+$/, '');
        const offset     = frac_trimmed_str.length;
        const offset_mul = 10n ** BigInt(offset);
        const frac = BigInt(frac_trimmed_str || 0);
        return new DecimalNumber( whole * offset_mul + frac, offset);
    }

    /**
     * @param {string} str_unparsed 
     */
    static from_string_try(str_unparsed) {
        let whole = "";
        let frac  = "";
        let str_stripped = str_unparsed.replace(/ /g,'');
        let match_result = str_stripped.match(/^(\d+)(?:\.(\d+))?$/);
        if( !match_result ) {
            return null;
        }
        whole = match_result[1] ?? "0";
        frac  = match_result[2] ??  "";
        return this.from_parts(whole, frac);
    }
}

export {
    DecimalNumber,
    decimal_add,
    decimal_mul,
    // decimal_sub, // TODO Negative values not supported
};