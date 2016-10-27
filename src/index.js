module.exports = function initAsyncTaskManager(_) {
	const {
		checkResources,
		// promiseAll_ObjectEdition,
		// sortBy,
		// objectAdd,
		// objectSubtract,
		// runPromisified,
		createObjectPropertyGetter,
	} = require('./utilities.js')(_);

	let id = 1000;

	const _atm = function AsyncTaskManager() {};

	function createAsyncTaskManager({
		resources = {},
		dispatchThrottleIntervalInMs = 0,
	} = {}) {
		checkResources(resources);
		const atm = new _atm();

		const internals = {
			totalResources: _.extend({}, resources),
			currentResources: _.extend({}, resources),
			executingTasks: [],
			pendingTasks: [],
		};
		createObjectPropertyGetter(atm, 'totalResources', internals.totalResources);
		createObjectPropertyGetter(atm, 'currentResources', internals.currentResources);
		createObjectPropertyGetter(atm, 'pendingTasks', internals.pendingTasks);

		_.forEach(require('./internals.js')(_, internals), (fn, name) => {
			Object.defineProperty(atm, name, {
				enumerable: false,
				configurable: false,
				writable: false,
				value: fn
			});
		});

		return atm;
	}

	return createAsyncTaskManager;
};
