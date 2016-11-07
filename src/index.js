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
			DEBUG_MODE: true
		};
		createObjectPropertyGetter(atm, 'totalResources', internals.totalResources);
		createObjectPropertyGetter(atm, 'currentResources', internals.currentResources);
		createArrayPropertyGetter(atm, 'readyTasks', internals.readyTasks);
		createArrayPropertyGetter(atm, 'executingTasks', internals.executingTasks);
		createArrayPropertyGetter(atm, 'pendingTasks', internals.pendingTasks);


		_.forEach(generateATMInternals(_, internals, dispatchThrottleIntervalInMs), (fn, name) => {
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
