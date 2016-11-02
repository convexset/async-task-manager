const _ = require('underscore');
const createAsyncTaskManager = require('../src')(_);

const atm = createAsyncTaskManager({
	resources: { sheep: 3, wood: 1, coal: 7, stone: 4 }
});

const taskEvents = [];
let eventId = 0;

function track(task) {
	const t = task;
	eventId++;
	taskEvents.push({
		t,
		id: eventId,
		type: 'Start',
		date: new Date()
	});
	setTimeout(() => {
		t.then( () => {
			taskEvents.push({
				t,
				id: eventId,
				type: 'End',
				date: new Date()
			});
		});
	}, _.random(10, 20));
}

function generateRandomFunction() {
	return function() {
		return _.random(1, 20);
	};
}

let taskDescriptionId = 1;

function generateRandomTaskDescription(tasksToDo) {
	let input = {};
	if (tasksToDo.length === 0) {
		input = {};
	} else {
		const numberOfInputs = _.random(0, tasksToDo.length - 1);
		const tasksToDoCopy = tasksToDo.slice();
		for (let i = 0; i < numberOfInputs; i++) {
			const idx = _.random(0, tasksToDoCopy.length - 1);
			input[i] = tasksToDoCopy[idx];
			tasksToDoCopy.splice(idx, 1);
		}
	}
	const task = generateRandomFunction();
	const taskDescription = {
		id: taskDescriptionId,
		inputs: input,
		task: task,
		resources: { sheep: _.random(0, 3), wood: _.random(0, 1), coal: _.random(0, 7), stone: _.random(0, 4) },
		priority: _.random(1, 10)
	};
	taskDescriptionId++;
	return taskDescription;
}

const tasksToDoHistory = [];

function newTask() {
	const taskDescription = generateRandomTaskDescription(tasksToDoHistory);
	tasksToDoHistory.push(taskDescription);
	track(taskDescription);
}
