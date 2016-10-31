let nextATMId = 1;

module.exports = function generateInternals(_, internals) {
	const {
		checkResources,
		promiseAll_ObjectEdition,
		sortBy,
		objectAdd,
		objectSubtract,
		runPromisified,
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
		checkResources(resources);
		// creating taskDescription
		const taskDescription = {
			id,
			inputs,
			task,
			resources,
			priority,
			creationTime: new Date(),
			inputsResolved: null //remains null until inputs are resolved
		};
		LOG('Adding task', taskDescription);

		// immediately adding taskDescription to a pending list
		internals.pendingTasks.push(taskDescription);
		promiseAll_ObjectEdition(inputs)
			.then(inputsForTask => {
				// Pre-reqs complete: Inputs available
				// move task from pending list to ready list to await for resources
				taskDescription.inputsResolved = inputsForTask;
				pendingTasksUpdate();
			})
			.catch(error => {
				// Pre-reqs definitively won't complete
				taskDescription.reject(error);
			});

		return new Promise((resolve, reject) => {
			// store resolve/reject
			taskDescription.resolve = resolve;
			taskDescription.reject = reject;
		});
	}

	function pendingTasksUpdate() {
		const newlyReadyTasks = internals.pendingTasks.filter(x => {
			if (x.inputsResolved) {
				return x;
			}
		});
		internals.pendingTasks.forEach(x => {
			if (x.inputsResolved) {
				internals.pendingTasks.shift();
			}
		});
		internals.readyTasks.push(...newlyReadyTasks);
		readyTasksUpdate();
	}

	function readyTasksUpdate() {
		while (internals.readyTasks.length > 0) { // if there are elements in the ready list, sort
			internals.readyTasks.sort(sortBy([
				['priority: 1'],
				['creationTime: 1']
			]));
			// check for resource availability to allocate to task
			const resourceRequiredForTask = internals.readyTasks[0].resources;
			const tempResourceList = objectSubtract(internals.currentResources, resourceRequiredForTask);
			if (_.filter(tempResourceList, (v, k) => v < 0).length === 0) { // there are enough resources
				const currentTask = internals.readyTasks.shift(); // allocate resource to the first element in the ready list and move it to the executing list
				// update current resources available
				internals.currentResources = objectSubtract(internals.currentResources, currentTask.resources);
				internals.executingTasks.push(currentTask);
				const currentInput = currentTask.inputsResolved;
				// execute the new task in the executing list and return a promise resolved with the returned value
				runPromisified(currentTask.task, currentInput)
					.then(x => {
						currentTask.resolve(x);
						// after execution is complete free resources and remove from executing list
						internals.currentResources = objectAdd(internals.currentResources, currentTask.resources);
						internals.executingTasks.splice(internals.executingTasks.indexOf(currentTask), 1);
					}).catch(z => {
						console.log('inside catch', z);
					});
			}
		}
	}

	function resize(resources) {
		checkResources(resources);
		const diffInInitialResources = objectSubtract(resources, internals.totalResources);
		Object.keys(diffInInitialResources).forEach(k => {
			internals.currentResources[k] += diffInInitialResources[k];
		});
		console.log(internals.currentResources);
		Object.keys(resources).forEach(k => {
			internals.totalResources[k] = resources[k];
		});
	}

	return {
		addTask,
		resize
	};
};
