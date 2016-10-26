module.exports = function createUtilities(_) {
	return {
		// checks that resource specifications are valid (values non-negative)
		checkResources: function checkResources(resources) {
			if (_.filter(resources, v => !_.isNumber(v) || !(v >= 0)).length > 0) {
				throw new Error('invalid-resource-specification');
			}
		},

		// like Promise.all but supports waiting for keyword arguments by
		// taking an object whose values are promises and resolving to an object
		// with the same keys but values replaced with the resolved values
		//
		// e.g.:
		// promiseAll_ObjectEdition({a: Promise.resolve(7)}) --> {a: 7}
		promiseAll_ObjectEdition: function promiseAllObjectEdition(objectWithPromises) {
			const keys = Object.keys(objectWithPromises);
			const promises = keys.map(k => objectWithPromises[k] instanceof Promise ? objectWithPromises[k] : Promise.resolve(objectWithPromises[k]));
			return Promise.all(promises)
				.then(results => {
					return _.object(keys.map((k, idx) => [k, results[idx]]));
				});
		},

		// Custom sort by: Usage:
		//
		// someArray.sort(sortBy([
		//     ['priority', 1],     // lower values first
		//     ['creationTime', 1]  // lower values first
		// ]));
		sortBy: order => (x, y) => {
			let result = null;
			order.forEach(([key, ord]) => {
				if ((result !== null) || _.isEqual(x[key], y[key])) {
					return;
				}
				result = x[key] < y[key] ? ord * -1 : ord * 1;
			});
			return result || -1;
		},

		// object addition
		// e.g. objectAdd({a:1, b:1}, {b:1, c:1}) --> {a:1,b:2,c:1}
		objectAdd: function objectAdd(x, y) {
			const o = _.extend({}, x);
			_.forEach(y, (v, k) => {
				o[k] = (o[k] || 0) + v;
			});
			return o;
		},

		// object subtract
		// e.g. objectSubtract({a:1, b:1}, {b:1, c:1}) --> {a:1,b:0,c:-1}
		objectSubtract: function objectSubtract(x, y) {
			const o = _.extend({}, x);
			_.forEach(y, (v, k) => {
				o[k] = (o[k] || 0) - v;
			});
			return o;
		},

		// returns a promise resolving to the result of a function call
		runPromisified: function runPromisified(fn, arg = void 0, context = {}) {
			return new Promise(resolve => {
				resolve(fn.call(context, arg));
			});
		},

		// places a getter on an object that returns a (shallow) copy of an
		// object
		createObjectPropertyGetter: function createObjectPropertyGetter(target, name, o) {
			Object.defineProperty(target, name, {
				get: () => _.extend({}, o)
			});
		},

		// places a getter on an object that returns copy of an array with
		// shallow copying for object elements
		createArrayPropertyGetter: function createArrayPropertyGetter(target, name, arr) {
			Object.defineProperty(target, name, {
				get: () => arr.map(x => _.isObject(x) ? _.extend({}, x) : x)
			});
		},
	};
};
