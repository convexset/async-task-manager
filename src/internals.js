let nextATMId = 1;

module.exports = function generateInternals(_, internals, dispatchThrottleIntervalInMs) {
	const {
		checkResources,
		promiseAll_ObjectEdition,
		sortBy,
		objectAdd,
		objectSubtract,
		runPromisified,
		isNonNegative,
	} = require('./utilities')(_);

	if (!internals.id) {
		internals.id = `atm-${nextATMId}`;
		nextATMId += 1;
	}

	function LOG() {
		if (internals.DEBUG_MODE) {
			const args = _.toArray(arguments);
			let time = new Date();
			time = `${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}:${time.getMilliseconds()}`;
			args.unshift(`${time} | [AsyncTaskManager|${internals.id}]`);
			// eslint-disable-next-line no-console
			console.log(...args);
		}
	}

	function WARN() {
		if (internals.DEBUG_MODE) {
			const args = _.toArray(arguments);
			let time = new Date();
			time = `${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}:${time.getMilliseconds()}`;
			args.unshift(`${time} | [AsyncTaskManager|${internals.id}] | `);
			// eslint-disable-next-line no-console
			console.warn(...args);
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
			inputsResolved: null // remains null until inputs are resolved
		};
		LOG('Added task', taskDescription);

		// immediately adding taskDescription to a pending list if can be completed
		if (!isNonNegative(objectSubtract(internals.totalResources, resources))) {
			LOG(`[Task id: ${taskDescription.id}] | Total resources inadequate for task to complete. Task moved to Frozen Task List`);
			LOG(`Frozen Task List: `, internals.frozenTasks);
			internals.frozenTasks.push(taskDescription);
		} else {
			internals.pendingTasks.push(taskDescription);
			LOG(`[Task id: ${taskDescription.id}] | Task moved to Pending Task List after 'addtask' is called. Pending Task List: `, internals.pendingTasks);
			LOG(`[Task id: ${taskDescription.id}] | Pending Task List length after 'addtask' is called: `, internals.pendingTasks.length);
		}
		promiseAll_ObjectEdition(inputs, id)
			.then(inputsForTask => {
				// Pre-reqs complete: Inputs available
				LOG(`[Task id: ${taskDescription.id}] | Inputs for task resolved. Updating Pending Task List. Task Description: `, taskDescription);
				taskDescription.inputsResolved = inputsForTask;
				// move task from pending list to ready list to await for resources
				pendingTasksUpdate();
			})
			.catch(error => {
				// Pre-reqs definitively won't complete
				taskDescription.reject(error);
				WARN(`[Task id: ${taskDescription.id}] | ERROR in inputs to task. Task Removed.`);
			});

		return new Promise((resolve, reject) => {
			// store resolve/reject
			taskDescription.resolve = resolve;
			taskDescription.reject = reject;
		});
	}

	function _dispatchReadyTask() {
		LOG(`Ready task list length: `, internals.readyTasks.length);
		if (internals.readyTasks.length > 0) { // if there are elements in the ready list, sort
			internals.readyTasks.sort(sortBy([
				['priority: 1'],
				['creationTime: 1']
			]));
			LOG(`Sorted List of Ready Tasks: `, internals.readyTasks);
			const resourceRequiredForTask = internals.readyTasks[0].resources;
			const tempResource = objectSubtract(internals.currentResources, resourceRequiredForTask);
			LOG(`[Task id: ${internals.readyTasks[0].id}] | Checking for adequate resources for execution of task`);
			if (isNonNegative(tempResource)) { // there are enough resources
				LOG(`[Task id: ${internals.readyTasks[0].id}] | Adequate resources comfirmed for execution of task`);
				const currentTask = internals.readyTasks.shift();
				const currentInput = currentTask.inputsResolved;
				LOG(`[Task id: ${currentTask.id}] | Ready Task List after moving task: `, internals.readyTasks);
				LOG(`Ready Task List length: `, internals.readyTasks.length);
				internals.currentResources = tempResource;
				internals.executingTasks.push(currentTask);
				LOG(`[Task id: ${currentTask.id}] | Resources available after moving task to Executing Task List: `, internals.currentResources);
				LOG(`[Task id: ${currentTask.id}] | Executing Task List after new task is added: `, internals.executingTasks);
				LOG(`Executing task length: `, internals.executingTasks.length);
				// execute the new task in the executing list and return a promise resolved with the returned value
				runPromisified(currentTask.task, currentInput)
					.then(x => {
						currentTask.resolve(x);
						LOG(`[Task id: ${currentTask.id}] | Executing Task List after task completion: `, internals.executingTasks);
						LOG(`executing task length`, internals.executingTasks.length);
						setTimeout(_dispatchReadyTask, 0);
					})
					.then(() => {
						// after execution is complete free resources and remove from executing list
						internals.executingTasks.splice(internals.executingTasks.indexOf(currentTask), 1);
						LOG(`[Task id: ${currentTask.id}] | Removed task from Executing Task List`);
						// update current resources available
						internals.currentResources = objectAdd(internals.currentResources, currentTask.resources);
						LOG(`[Task id: ${currentTask.id}] | Resource List after task completion: `, internals.currentResources);
						setTimeout(_dispatchReadyTask, 0);
					})
					.catch(z => {
						currentTask.reject(z);
					});
			} else {
				LOG(`[Task id: ${internals.readyTasks[0].id}] |Not enough resources for task yet, current resources: `, internals.currentResources);
				LOG(`Executing Task List: `, internals.executingTasks);
			}
		} else {
			LOG(`Ready Task List is empty`);
		}
	}

	const dispatchReadyTask = _.throttle(_dispatchReadyTask, dispatchThrottleIntervalInMs);

	function pendingTasksUpdate() {
		LOG(`Pending tasks length: `, internals.pendingTasks.length);
		internals.pendingTasks.forEach(x => {
			if (x.inputsResolved) {
				internals.readyTasks.push(x);
				internals.pendingTasks.splice(internals.pendingTasks.indexOf(x), 1);
				LOG(`[Task id: ${x.id}] | Task moved from Pending Task List. Pending Task List: `, internals.pendingTasks);
				LOG(`[Task id: ${x.id}] | Task moved to Ready Task List. Ready Task List: `, internals.readyTasks);
				LOG(`Pending task length`, internals.pendingTasks.length);
				LOG(`Ready task length`, internals.readyTasks.length);
			}
		});
		dispatchReadyTask();
	}

	function updateFrozenTaskList() {
		internals.pendingTasks.forEach(x => {
			if (!isNonNegative(internals.totalResources, x.resources)) {
				internals.frozenTasks.push(internals.pendingTasks.splice(internals.pendingTasks.indexOf(x), 1));
				WARN(`Total Resources less than requirement for task ${x.id}. Task ${x.id} cannot be executed and will be moved to frozen list`);
			}
		});
		internals.readyTasks.forEach(x => {
			if (!isNonNegative(internals.totalResources, x.resources)) {
				internals.frozenTasks.push(internals.pendingTasks.splice(internals.pendingTasks.indexOf(x), 1));
				WARN(`Total Resources less than requirement for task ${x.id}. Task ${x.id} cannot be executed and will be moved to frozen list`);
			}
		});
		internals.frozenTasks.forEach(x => {
			if (isNonNegative(internals.totalResources, x.resources)) {
				internals.pendingTasks.push(internals.frozenTasks.splice(internals.frozenTasks.indexOf(x), 1));
				WARN(`Total Resources greater than requirement for task ${x.id}. Task ${x.id} can be executed and will be moved to pending list`);
			}
		});
	}

	function resize(resources) {
		LOG(`Resizing Resources`);
		LOG(`New resource list: `, resources);
		LOG(`Checking if new resources are valid`);
		checkResources(resources);
		LOG(`New Resources are Valid`);
		const diffInInitialResources = objectSubtract(resources, internals.totalResources);
		LOG(`Difference in Initial Resources `, diffInInitialResources);
		Object.keys(diffInInitialResources).forEach(k => {
			LOG(`Difference in initial resource(s) of ${k} : ${diffInInitialResources[k]}`);
			internals.currentResources[k] += diffInInitialResources[k];
			LOG(`Updated Current resource(s) of ${k}: ${internals.currentResources[k]}`);
		});
		LOG(`New Current Resource List: `, internals.currentResources);
		LOG(`Updating Total Resources List: `, internals.totalResources);
		Object.keys(internals.totalResources).forEach(k => {
			if (resources[k]) {
				internals.totalResources[k] = resources[k];
			} else {
				internals.totalResources[k] = 0;
			}
		});
		LOG(`New Total Resources List: `, internals.totalResources);
		updateFrozenTaskList();
	}

	return {
		addTask,
		resize
	};
};
