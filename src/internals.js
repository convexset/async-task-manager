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
			args.unshift(`${new Date()} [AsyncTaskManager|${internals.id}]`);
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
		LOG('PENDING TASK LIST AFTER ADDTASK IS CALLED: ', internals.pendingTasks);
		LOG('PENDING TASK LENGTH AFTER ADDTASK IS CALLED: ', internals.pendingTasks.length);
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
				LOG('ERROR IN PREREQUISITE PROMISE');
			});

		return new Promise((resolve, reject) => {
			// store resolve/reject
			LOG('PROMISE RETURNED FROM ADDTASK CALL');
			taskDescription.resolve = resolve;
			taskDescription.reject = reject;
		});
	}

	function pendingTasksUpdate() {
		LOG('PENDING TASKS LENGTH INSIDE PENDINGTASKSUPDATE CALL: ', internals.pendingTasks.length);
		const newlyReadyTasks = [];
		internals.pendingTasks.forEach(x => {
			if (x.inputsResolved) {
				newlyReadyTasks.push(x);
				internals.pendingTasks.splice(internals.pendingTasks.indexOf(x), 1);
			}
		});
		LOG('NEWLY READY TASKS GENERATED AFTER FILTERING PENDING TASKS ON PREREQUISITE COMPLETION; NEWLY READY TASKS LIST: ', newlyReadyTasks);
		LOG('NEWLY READY TASKS LIST LENGTH: ', newlyReadyTasks.length);
		LOG('PENDING TASK LIST AFTER IT IS UPDATED: ', internals.pendingTasks);
		LOG('PENDING TASK LENGTH AFTER IT IS UPDATED:', internals.pendingTasks.length);
		internals.readyTasks.push(...newlyReadyTasks);
		LOG('READY TASK LIST UPDATED BY ADDING THE NEWLY READY TASKS TO IT; READY TASK LIST: ', internals.readyTasks);
		LOG('READY TASK LENGTH AFTER UPDATING: ', internals.readyTasks.length);
		readyTasksUpdate();
	}

	function readyTasksUpdate() {
		LOG('INSIDE READY TASK UPDATE CALL');
		if (internals.readyTasks.length > 0) { // if there are elements in the ready list, sort
			internals.readyTasks.sort(sortBy([
				['priority: 1'],
				['creationTime: 1']
			]));
			LOG('SORTED LIST OF READY TASKS: ', internals.readyTasks);
			LOG('READY TASK LIST LENGTH', internals.readyTasks.length);
			const resourceRequiredForTask = internals.readyTasks[0].resources;
			const tempResourceList = objectSubtract(internals.currentResources, resourceRequiredForTask);
			LOG('THERE ARE ENOUGH RESOURCES IF ALL VALUES IN FOLLOWING OBJECT IS GREATER THAN 0 : ', tempResourceList);
			if (_.filter(tempResourceList, (v, k) => v < 0).length === 0) { // there are enough resources
				const currentTask = internals.readyTasks.shift();
				const currentInput = currentTask.inputsResolved;
				internals.currentResources = objectSubtract(internals.currentResources, currentTask.resources);
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
						internals.currentResources = objectAdd(internals.currentResources, currentTask.resources);
						LOG('RESOURCE LIST AFTER TASK COMPLETION: ', internals.currentResources);
						internals.executingTasks.splice(internals.executingTasks.indexOf(currentTask), 1);
						LOG('EXECUTING TASK LIST AFTER TASK COMPLETION: ', internals.executingTasks);
						LOG('EXECUTING TASK LENGTH: ', internals.executingTasks.length);
						pendingTasksUpdate();
					}).catch(z => {
						LOG('TASK EXECUTION FAILED, ERROR: ', z);
						internals.currentResources = objectAdd(internals.currentResources, currentTask.resources);
						pendingTasksUpdate();
					});
			} else {
				LOG('NOT ENOUGH RESOURCES YET, CURRENT RESOURCES: ', internals.currentResources);
				LOG('CURRENT EXECUTING TASK: ', internals.executingTasks);
			}
		}
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
	}

	return {
		addTask,
		resize
	};
};
