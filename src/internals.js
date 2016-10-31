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
		LOG('ADDING TASK', taskDescription);

		// immediately adding taskDescription to a pending list
		internals.pendingTasks.push(taskDescription);
		LOG('PENDING TASK ON ADDTASK', internals.pendingTasks);
		promiseAll_ObjectEdition(inputs)
			.then(inputsForTask => {
				// Pre-reqs complete: Inputs available
				// move task from pending list to ready list to await for resources
				LOG('ENTERING PENDING TASK UPDATE FUNCTION; TASKDESCRIPTION: ', taskDescription);
				taskDescription.inputsResolved = inputsForTask;
				pendingTasksUpdate();
			})
			.catch(error => {
				// Pre-reqs definitively won't complete
				taskDescription.reject(error);
			});

		return new Promise((resolve, reject) => {
			// store resolve/reject
			LOG('PROMISE RETURNED FROM ADDTASK CALL');
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
		LOG('NEWLY READY TASKS GENERATED AFTER FILTERING PENDING TASKS ON PREREQUISITE COMPLETION', newlyReadyTasks);
		internals.pendingTasks.forEach(x => {
			if (x.inputsResolved) {
				internals.pendingTasks.shift();
			}
		});
		LOG('PENDING TASK UPDATED', internals.pendingTasks);
		internals.readyTasks.push(...newlyReadyTasks);
		LOG('READY TASK UPDATED', internals.readyTasks);
		readyTasksUpdate();
	}

	function readyTasksUpdate() {
		LOG('READY TASK LIST LENGTH', internals.readyTasks.length);
		while (internals.readyTasks.length > 0) { // if there are elements in the ready list, sort
			internals.readyTasks.sort(sortBy([
				['priority: 1'],
				['creationTime: 1']
			]));
			LOG('SORTED LIST OF READY TASKS', internals.readyTasks);
			// check for resource availability to allocate to task
			const resourceRequiredForTask = internals.readyTasks[0].resources;
			const tempResourceList = objectSubtract(internals.currentResources, resourceRequiredForTask);
			LOG('CHECK IF THERE ARE ENOUGH RESOURCES ', tempResourceList);
			if (_.filter(tempResourceList, (v, k) => v < 0).length === 0) { // there are enough resources
				const currentTask = internals.readyTasks.shift(); // allocate resource to the first element in the ready list and move it to the executing list
				// update current resources available
				LOG('READY TASK LIST AFTER SHIFTING TASK TO EXECUTING LIST ', internals.readyTasks);
				internals.currentResources = objectSubtract(internals.currentResources, currentTask.resources);
				LOG('RESOURCES AFTER MOVING TASK TO EXECUTING LIST ', internals.currentResources);
				internals.executingTasks.push(currentTask);
				LOG('EXECUTING TASKS LIST AFTER PUSH', internals.executingTasks);
				const currentInput = currentTask.inputsResolved;
				// execute the new task in the executing list and return a promise resolved with the returned value
				runPromisified(currentTask.task, currentInput)
					.then(x => {
						LOG('PROMISE FOR ELEMENT IN EXECUTING TASK LIST ', currentTask);
						currentTask.resolve(x);
						// after execution is complete free resources and remove from executing list
						internals.currentResources = objectAdd(internals.currentResources, currentTask.resources);
						LOG('RESOURCE LIST AFTER TASK COMPLETION', internals.currentResources);
						internals.executingTasks.splice(internals.executingTasks.indexOf(currentTask), 1);
						LOG('EXECUTING TASK LIST AFTER TASK COMPLETION', internals.executingTasks);
					}).catch(z => {
						console.log('inside catch', z);
					});
			}
		}
	}

	function resize(resources) {
		LOG(internals.currentResources);
		LOG('INSIDE RESIZE FUNCTION');
		LOG('NEW RESOURCE LIST ', resources);
		checkResources(resources);
		const diffInInitialResources = objectSubtract(resources, internals.totalResources);
		LOG('DIFFERENCE IN INITIAL RESOURCES ', diffInInitialResources);
		Object.keys(diffInInitialResources).forEach(k => {
			LOG(`DIFFERENCE IN INITIAL RESOURCES ${k}, CURRENT RESOURCES ${k}:  ${diffInInitialResources[k]}, ${internals.currentResources[k]}`);
			internals.currentResources[k] += diffInInitialResources[k];
		});
		LOG('CURRENT RESOURCE LIST ', internals.currentResources);
		Object.keys(internals.totalResources).forEach(k => {
			if (resources[k]) {
				internals.totalResources[k] = resources[k];
			} else {
				internals.totalResources[k] = 0;
			}
		});
		LOG('NEW TOTAL RESOURCES LIST', internals.totalResources);
	}

	return {
		addTask,
		resize
	};
};
