module.exports = function initAsyncTaskManager(_) {
	const {
		checkResources,
		promiseAll_ObjectEdition,
		sortBy,
		objectAdd,
		objectSubtract,
		runPromisified,
	} = require('./utilities')(_);

 	let id = 1000;

	const _atm = function AsyncTaskManager() {};

	const x = createAsyncTaskManager({})
	function createAsyncTaskManager({
		resources = {},
		dispatchThrottleIntervalInMs = 0,
	} = {}) {
		// deal with options
		checkResources(resources);

		// internals
		const totalResources = _.extend({}, resources);
		const currentResources = _.extend({}, resources);
		const executingTasks = [];
		const releasedTasks = [];
		const pendingTasks = [];

		function addReleaseableTask() {} 
		function addPendingTask() {}
		function addExecutingTask() {}
		function prerequisitesCompleted() {}
		function updateResources() {}
		function checkPendingTask() {} //return boolean, check pending task list and move to releaseabletask if possible
		function checkReleaseableTask() {}//return boolean, check releaseable task list and move to executing task if possible
		// create instance
		const atm = new _atm();  // or {}
		const myId = id;
		id += 1;

		atm.DEBUG_MODE = false;
		function LOG() {
			if (atm.DEBUG_MODE) {
				const args = _.toArray(arguments);
				args.unshift(`[AsyncTaskManager|${myId}]`);
				console.log.apply(console, args);  // console.log(...args)
			}
		}

		// add methods
		function addTask({
			prerequisites = [],
			resources = {},
			priority = 5
		} = {}) {
			LOG('Task Added');
			pendingTasks.push(addTask);
			p = Promise
				// add task
				// returns a promise
		}

		function resizeResources(newResourceSet) {
			checkResources(newResourceSet);
		},
		function trigger(eventName) {
			switch (eventName) {
				case 'task-added':
					console.log(eventName);
					const releasableTasksUpdated = updatePendingTask();

					if(checkPendingTask()){
						trigger('releaseable-tasks-updated');
					}
					break;
				case 'task-completed':
					console.log(eventName);
					updateResources();
					if(checkReleaseableTask()){
						trigger('releaseable-tasks-updated')
					};
					break;
				case 'resource-availability-updated':
					console.log(eventName);
					if(checkReleaseableTask()){
						trigger('releaseable-tasks-updated');
					}
					break;
				case 'releaseable-tasks-updated':
					console.log(eventName);
					if(checkReleaseableTask()){
						updateResources();
						trigger('resource-availability-updated');
					}
					break;
				default:
					throw new Error('invalid-event-name');
			}
		},
		atm.addTask = addTask;

		return atm;
	}
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
