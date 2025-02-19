import type { AbstractQueryFieldNodeTarget } from '../../../fields.js';

/**
 * Used to compare a number field with a number value.
 * @example
 * ```
 * {
 * 	type: 'condition-set',
 * 	target: {
 * 		type: 'primitive',
 * 		field: 'attribute_xy'
 * 	},
 * 	operation: 'in',
 * 	compareTo: [1, 2, 3]
 * ```
 */
export interface ConditionSetNode {
	type: 'condition-set';
	target: AbstractQueryFieldNodeTarget;
	operation: 'in';
	compareTo: (string | number)[]; // could also be an actual JS Set
}
