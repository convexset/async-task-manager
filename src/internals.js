let nextATMId = 1;

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

	if (!internals.id) {
		internals.id = `atm-${nextATMId}`;
		nextATMId += 1;
	}

	function LOG() {
		if (internals.DEBUG_MODE) {
			const args = _.toArray(arguments);
			args.unshift(`[AsyncTaskManager|${internals.id}]`);
			console.log.apply(console, args); // console.log(...args)
		}
	}

	let taskId = 0;

	function nextId() {
		taskId += 1;
		return `task-${taskId}`;
	}

	function addTask({
		id = nextId(),
		inputs = {},
		task = () => void 0,
		resources = {},
		priority = 5
	} = {}) {

		const taskDescription = {
			id,
			inputs,
			task,
			resources,
			priority,
			creationTime: new Date(),
			inputsResolved: null
		};
		LOG('Adding task', taskDescription);

		internals.pendingTasks.push(taskDescription);
		promiseAll_ObjectEdition(inputs)
			.then(inputsForTask => {
				// Pre-reqs complete: Inputs available
				taskDescription.inputsResolved = inputsForTask;
				internals.pendingTask.slice(internals.pendingTasks.indexOf(taskDescription))
				internals.readyTasks.push(taskDescription);
				// trigger check
				readyTasksUpdate();

			})
			.catch(error => {
				// Pre-reqs definitively won't complete
				taskDescription.reject(error)
			});

		return new Promise((resolve, reject) => {
			// store resolve/reject
			taskDescription.resolve = resolve;
			taskDescription.reject = reject;
		});
	}

	function readyTasksUpdate() {
		if (internals.readyTasks.length > 0) {
			internals.readyTasks.sort(sortBy([
				['priority: 1'],
				['creationTime: 1']
			]));
			const resourceRequiredForTask = internals.readyTasks[0].resources;
			const tempResourceList = objectSubtract(internals.currentResources, resourceRequiredForTask);
			if (_.filter(tempResourceList, (v, k) => v < 0).length === 0) {
				const currentTask = readyTasks.shift();
				internals.executingTasks.push(currentTask);
				const currentInput = currentTask.inputsResolved;
				runPromisified(thisTask(currentInput))
					.then(x => {
						currentTask.resolve(x);
						internals.currentResources = objectAdd(internals.currentResources, currentTask.resources);
						internals.executingTask.slice(internals.executingTasks.indexOf(taskDescription))
						setTimeout(readyTasksUpdate,0); //after task completion check again if able to execute another task
					}).catch();
				internals.currentResources = objectSubtract(internals.currentResources, currentTask.resources)
			}
		}
	}

	function resize(resources) {
		const diffInInitialResources = objectSubtract(resources,)
		internals.totalResources = resources;
	}

	return {
		addTask,
		resize
	}
};
