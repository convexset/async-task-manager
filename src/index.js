const generateATMInternals = require('./internals.js');

module.exports = function initAsyncTaskManager(_) {
	const {
		checkResources,
		createArrayPropertyGetter,
		createObjectPropertyGetter,
	} = require('./utilities.js')(_);

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
			readyTasks: [],
			pendingTasks: [],
			frozenTasks: [],
			DEBUG_MODE: false
		};
		createObjectPropertyGetter(atm, 'totalResources', internals.totalResources);
		createObjectPropertyGetter(atm, 'currentResources', internals.currentResources);
		createArrayPropertyGetter(atm, 'readyTasks', internals.readyTasks);
		createArrayPropertyGetter(atm, 'executingTasks', internals.executingTasks);
		createArrayPropertyGetter(atm, 'pendingTasks', internals.pendingTasks);
		createArrayPropertyGetter(atm, 'frozenTasks', internals.frozenTasks);

		_.forEach(generateATMInternals(_, internals, dispatchThrottleIntervalInMs), (fn, name) => {
			Object.defineProperty(atm, name, {
				enumerable: false,
				configurable: false,
				writable: false,
				value: fn
			});
		});

		Object.defineProperty(atm, 'DEBUG_MODE', {
			get: () => internals.DEBUG_MODE,
			set: (value) => { internals.DEBUG_MODE = !!value; },
		});

		return atm;
	}

	return createAsyncTaskManager;
};
