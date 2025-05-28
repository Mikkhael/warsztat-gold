//@ts-check

////////////////// JS and Vue Utils ////////////////////////

/**
 * @typedef {{toString: () => string}} Stringable
 */

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

/**
 * @template T
 * @typedef {import('vue').PropType<T>} PropType
 */




////////////////// SQL Values ////////////////////////

/**
 * @typedef {number | string | null} SQLValueStrict 
 */

/**
 * @typedef {number | string | null | boolean} SQLValue
 */

/**
 * @typedef {"integer" | "number" | "decimal" | "boolean" | "date" | "datetime" | "datetime-local" | "text" | "money"} FormValueFormat
 */

/**
 * @typedef {import('../../utils').DecimalFormat} DecimalFormat
 */

////////////////// Query Parts ////////////////////////

/** 
 * @typedef {{
 *  label: MaybeRef<Stringable>,
 *  asc?:  MaybeRef<boolean>,
 *  collate?: MaybeRef<Stringable>,
 * }} QueryOrderingDefinition
 * */

/** 
 * @typedef {{
 *  name?: MaybeRef<Stringable>,
 *  sql?:  MaybeRef<Stringable>,
 *  as?:   MaybeRef<Stringable>,
 * }} QuerySelectFieldDefinition
 * */


