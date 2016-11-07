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
			args.unshift(`${new Date()} [AsyncTaskManager|${internals.id}]`);
			// eslint-disable-next-line no-console
			console.log(...args);
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
		LOG('ADDING TASK', taskDescription);

		// immediately adding taskDescription to a pending list
		internals.pendingTasks.push(taskDescription);
		LOG('PENDING TASK LIST AFTER ADDTASK IS CALLED: ', internals.pendingTasks);
		LOG('PENDING TASK LENGTH AFTER ADDTASK IS CALLED: ', internals.pendingTasks.length);
		promiseAll_ObjectEdition(inputs)
			.then(inputsForTask => {
				// Pre-reqs complete: Inputs available
				// move task from pending list to ready list to await for resources
				LOG('ENTERING PENDING TASK UPDATE FUNCTION; TASKDESCRIPTION: ', taskDescription);

				// *** COMMENT *** Why not push to ready tasks here -- done
				taskDescription.inputsResolved = inputsForTask;
				pendingTasksUpdate();
			})
			.catch(error => {
				// Pre-reqs definitively won't complete
				taskDescription.reject(error);
				// *** COMMENT *** test correctness of cascading error reporting

				LOG('ERROR IN PROMISE IN ADDTASK.');
			});

		return new Promise((resolve, reject) => {
			// store resolve/reject
			LOG('PROMISE RETURNED FROM ADDTASK CALL');
			taskDescription.resolve = resolve;
			taskDescription.reject = reject;
		});
	}

	function _dispatchReadyTask() {
		LOG('READY TASK LIST LENGTH', internals.readyTasks.length);
		if (internals.readyTasks.length > 0) { // if there are elements in the ready list, sort
			internals.readyTasks.sort(sortBy([
				['priority: 1'],
				['creationTime: 1']
			]));
			LOG('SORTED LIST OF READY TASKS: ', internals.readyTasks);
			LOG('READY TASK LIST LENGTH', internals.readyTasks.length);
			const resourceRequiredForTask = internals.readyTasks[0].resources;
			const tempResource = objectSubtract(internals.currentResources, resourceRequiredForTask);
			// done -- *** COMMENT *** write utility to check for non-negativity of resources; write a test or two for it
			if (isNonNegative(tempResource)) { // there are enough resources
				// if (_.filter(tempResource, (v, k) => v < 0).length === 0) {
				const currentTask = internals.readyTasks.shift();
				const currentInput = currentTask.inputsResolved;
				// execute the new task in the executing list and return a promise resolved with the returned value

				// done -- *** COMMENT *** re-use: clean up
				internals.currentResources = tempResource;
				LOG('RESOURCES AFTER MOVING TASK TO EXECUTING LIST ', internals.currentResources);
				internals.executingTasks.push(currentTask);
				LOG('EXECUTING TASKS LIST AFTER PUSH', internals.executingTasks);
				LOG('EXECUTING TASK LENGTH', internals.executingTasks.length);
				LOG('READY TASK LIST AFTER SHIFTING TASK TO EXECUTING LIST ', internals.readyTasks);
				LOG('READY TASK LIST LENGTH AFTER SHIFTING TASK TO EXECUTING LIST', internals.readyTasks.length);
				runPromisified(currentTask.task, currentInput)
					.then(x => {
						// update current resources available
						currentTask.resolve(x);
						// after execution is complete free resources and remove from executing list
						LOG('EXECUTING TASK LIST AFTER TASK COMPLETION', internals.executingTasks);
						LOG('EXECUTING TASK LENGTH', internals.executingTasks.length);
						// pendingTasksUpdate();
						// done --*** COMMENT *** use setTimeout(pendingTasksUpdate, 0)
						setTimeout(_dispatchReadyTask, 0);
					})
					.catch(z => {
						// console.log('inside catch', z);
						currentTask.reject(z);
						// done -- *** COMMENT *** need to reject for currentTask
					})
					.then(() => {
						// like "finally"
						// internals.currentResources = objectAdd(internals.currentResources, currentTask.resources);
						LOG('RESOURCE LIST AFTER TASK COMPLETION', internals.currentResources);
						internals.executingTasks.splice(internals.executingTasks.indexOf(currentTask), 1);
						internals.currentResources = objectAdd(internals.currentResources, currentTask.resources);
						// pendingTasksUpdate();
						// done -- *** COMMENT *** use setTimeout(pendingTasksUpdate, 0)
						setTimeout(_dispatchReadyTask, 0);
					});
			} else {
				LOG('NOT ENOUGH RESOURCES YET, CURRENT RESOURCES: ', internals.currentResources);
				LOG('CURRENT EXECUTING TASK: ', internals.executingTasks);
			}
		}
	}

	// const dispatchReadyTask = _.throttle(_dispatchReadyTask, dispatchThrottleIntervalInMs);

	function pendingTasksUpdate() {
		// *** COMMENT *** what does this do?
		LOG('PENDING TASKS LENGTH ', internals.pendingTasks.length);
		const newlyReadyTasks = [];
		internals.pendingTasks.forEach(x => {
			// *** COMMENT *** move this...
			if (x.inputsResolved) {
				newlyReadyTasks.push(x);
				internals.pendingTasks.splice(internals.pendingTasks.indexOf(x), 1);
			}
		});
		LOG('NEWLY READY TASKS GENERATED AFTER FILTERING PENDING TASKS ON PREREQUISITE COMPLETION', newlyReadyTasks);
		LOG('NEWLY READY TASKS TASK LENGTH', newlyReadyTasks.length);
		LOG('PENDING TASK UPDATED', internals.pendingTasks);
		LOG('PENDING TASK LENGTH', internals.pendingTasks.length);
		// *** COMMENT *** move this... to (*** PTU ***)
		internals.readyTasks.push(...newlyReadyTasks);
		LOG('READY TASK UPDATED', internals.readyTasks);
		LOG('READY TASK LENGTH', internals.readyTasks.length);
		_dispatchReadyTask();
	}

	function updateFrozenTaskList() {
		internals.pendingTasks.forEach(x => {
			if (!isNonNegative(internals.totalResources, x.resources)) {
				internals.frozenTasks.push(internals.pendingTasks.splice(internals.pendingTasks.indexOf(x), 1));
				// eslint-disable-next-line no-console
				console.warn(`Total Resources less than requirement for task ${x}. Task ${x} cannot be executed and will be moved to frozen list`);
			}
		});
		internals.readyTasks.forEach(x => {
			if (!isNonNegative(internals.totalResources, x.resources)) {
				internals.frozenTasks.push(internals.pendingTasks.splice(internals.pendingTasks.indexOf(x), 1));
				// eslint-disable-next-line no-console
				console.warn(`Total Resources less than requirement for task ${x}. Task ${x} cannot be executed and will be moved to frozen list`);
			}
		});
		internals.frozenTasks.forEach(x => {
			if (isNonNegative(internals.totalResources, x.resources)) {
				internals.pendingTask.push(internals.frozenTasks.splice(internals.frozenTasks.indexOf(x), 1));
				// eslint-disable-next-line no-console
				console.warn(`Total Resources greater than requirement for task ${x}. Task ${x} can be executed and will be moved to pending list`);
			}
		});
	}

	function resize(resources) {
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
		updateFrozenTaskList();

		// *** COMMENT *** check read tasks that cannot be executed with new total
		// Decision: warn don't throw
		// Move to pending... check again on resize
	}

	return {
		addTask,
		resize
	};
};
