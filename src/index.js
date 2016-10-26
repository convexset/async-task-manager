module.exports = function initAsyncTaskManager(_) {
	const {
		checkResources,
		promiseAll_ObjectEdition,
		sortBy,
		objectAdd,
		objectSubtract,
		runPromisified,
	} = require('./utilities')(_);

	function AsyncTaskManager({
		resources = {},
		dispatchThrottleIntervalInMs = 0,
	} = {}) {
		checkResources(resources);
		// do stuff here
	}

	AsyncTaskManager.prototype = {
		addTask: function addTask({
			prerequisites = [],
			resources = {},
			priority = 5
		} = {}) {
			// add task
			// returns a promise
		},
		resizeResources: function(newResourceSet) {
			checkResources(newResourceSet);
		},
		_trigger: function _triggerInternalEvent(eventName) {
			switch (eventName) {
				case 'task-added':
					console.log(eventName);
					break;
				case 'task-completed':
					console.log(eventName);
					break;
				case 'resource-availability-updated':
					console.log(eventName);
					break;
				case 'beginable-tasks-updated':
					console.log(eventName);
					break;
				default:
					throw new Error('invalid-event-name');
			}
		}
	};

	return AsyncTaskManager;
};


// setup for code to be included...
const _ = require('underscore');
const dispatchThrottleIntervalInMs = 0;
const atm = {}; // suppose this is your instance


// actual code to be included...

//////////////////////////////////////////////////////////////////////
// Dispatch Throttling
//////////////////////////////////////////////////////////////////////
function _dispatchTasks() {
	// actual function for dispatching tasks
}
atm.setDispatchThrottleInterval = function setDispatchThrottleInterval(t) {
	atm.dispatchTasks = _.throttle(_dispatchTasks, t);
};
atm.setDispatchThrottleInterval(dispatchThrottleIntervalInMs);
//////////////////////////////////////////////////////////////////////

// use createObjectPropertyGetter and createArrayPropertyGetter
// to expose currentResources and other things safely
