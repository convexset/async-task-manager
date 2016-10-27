module.exports = function generateInternals(_, internals) {
	const {
		checkResources,
		promiseAll_ObjectEdition,
		sortBy,
		objectAdd,
		objectSubtract,
		runPromisified,
		createObjectPropertyGetter,
	} = require('./utilities')(_);

	let taskId = 1;

	function addTask({
		id,
		inputs = {},
		_function,
		resources = {},
		priority = 5
	} = {}) {
		// LOG('Task Added');

		const task = { id, inputs, _function, resources, priority }

		let taskWithId = {};
		createObjectPropertyGetter(taskWithId, 'x', task); //not entirely sure i am using this right
		taskWithId = taskWithId.x;
		taskWithId.id = taskWithId.id || taskId; //assigning task id to every tasks being executed to keep track of their resources
		taskWithId.creationTime = new Date();
		taskWithId.pauseDispatch = false; //not sure about this
		taskId += 1;

		internals.pendingTasks.push();
		// trigger('update-pending-task')
			// add task
			// returns a promise
	}

	function resize(resources) {
		
	}

	function trigger(eventName) {
		switch (eventName) {
			case 'update-pending-task':
				{
					// LOG(`${eventName} triggered`);
					console.log(eventName);
					checkPendingTask();
					trigger('task-completed')
				}
				break;
			case 'task-completed':
				{
					// LOG(`${eventName} triggered`);
					console.log(eventName);
					checkExecutingTask();
					trigger('update-pending-task');

				}
				break;

			default:
				throw new Error('invalid-event-name');
		}
	}

	return {
		addTask, resize 
	}
};
