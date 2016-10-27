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
		let currentResources = _.extend({}, resources);
		const executingTasks = [];
		const pendingTasks = [];
		let taskId = 1;

		function addPendingTask(task) {
			pendingTasks.push(task);
		}

		function addExecutingTask(task) {

			currentResources = objectSubtract(currentResources, task.resources);
			executingTasks.push(runPromisified(task._function));
		}

		function checkPendingTask() { //return boolean, check pending task list and move to executableTask if possible
			pendingTasks.sortBy([
				['priority', 1],
				['creationTime', 1],
			])

			pendingTasks.each(x => {
				if (isResourceAvailable(x) && !x.pauseDispatch) {
					promiseAll_ObjectEdition(x.prerequisites).then(x => {
						const task = pendingTasks.splice(pendingTasks.indexOf(x), 1)[0];
						addExecutingTask(task);
						currentResources = objectSubtract(currentResources, resources);
					})
				}
			})
		}

		function isResourceAvailable(resources) {
			const tempResourceStack = objectSubtract(currentResources, resources);
			return (_.filter(tempResourceStack, (v, k) => v < 0).length < 0);
		}

		function checkExecutingTask() { //clears executing task when completed //clear resource
			completedTasks = executingTasks.filter((x) => {
				const task = x;
				promiseAll_ObjectEdition(task).then(x => {
					executingTasks.splice(executingTasks.indexOf(task), 1);
					currentResources = objectAdd(currentResources, task.resources)
				}); //stuck here finish rest first
			})
		}

		// create instance
		const atm = new _atm(); // or {}
		const myId = id;
		id += 1;

		atm.DEBUG_MODE = false;

		function LOG() {
			if (atm.DEBUG_MODE) {
				const args = _.toArray(arguments);
				args.unshift(`[AsyncTaskManager|${myId}]`);
				console.log.apply(console, args); // console.log(...args)
			}
		}

		// add methods
		function addTask({
			id,
			inputs = {},
			_function,
			resources = {},
			priority = 5
		} = {}) {
			LOG('Task Added');

			const task = { id, inputs, _function, resources, priority }

			taskWithId = {}
			createObjectPropertyGetter(taskWithId, task, x); //not entirely sure i am using this right
			taskWithId = taskWithId.x;
			taskWithId.id = taskWithId.id || taskId; //assigning task id to every tasks being executed to keep track of their resources
			taskWithId.creationTime = new Date();
			taskWithId.pauseDispatch = false; //not sure about this
			taskId += 1;

			pendingTasks.push();
			trigger('update-pending-task')
				// add task
				// returns a promise
		}

		function resizeResources(newResourceSet) {
			checkResources(newResourceSet);
		}

		function trigger(eventName) {
			switch (eventName) {
				case 'update-pending-task':
					{
						LOG(`${eventname} triggered`);
						console.log(eventName);
						checkPendingTask();
						trigger('task-completed')
					}
					break;
				case 'task-completed':
					{
						LOG(`${eventname} triggered`);
						console.log(eventName);
						checkExecutingTask();
						trigger('update-pending-task');

					}
					break;

				default:
					throw new Error('invalid-event-name');
			}
		}

		atm.addTask = addTask;

		return atm;
	}

	return createAsyncTaskManager;
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
