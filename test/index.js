const describe = require('mocha').describe;
const xdescribe = () => null;
const xit = () => null;
const it = require('mocha').it;
const beforeEach = require('mocha').beforeEach;
const before = require('mocha').before;
const chai = require('chai');
chai.use(require('chai-as-promised'));

// const should = chai.should();
// const assert = chai.assert;
const expect = chai.expect;

const _ = require('underscore');
const createAsyncTaskManager = require('../src')(_);
// const AsyncTaskManagerUtilities = require('../src/utilities.js')(_);


function makePromiseWithControlledResolution(resolveValue = true, rejectValue = false) {
	const ret = {};
	const p = new Promise((resolve, reject) => {
		ret.resolvePromise = () => resolve(resolveValue);
		ret.rejectPromise = () => reject(rejectValue);
	});
	ret.promise = p;
	return ret;
}

xdescribe('createAsyncTaskManager bare basics', () => {
	it('createAsyncTaskManager is a function', () => {
		expect(_.isFunction(createAsyncTaskManager)).to.be.true;
	});

	it('createAsyncTaskManager({}) returns an object', () => {
		const atm = createAsyncTaskManager({});
		expect(_.isObject(atm)).to.be.true;
	});

	it('createAsyncTaskManager({}) has methods addTask, resize', () => {
		const atm = createAsyncTaskManager({});
		expect(_.isFunction(atm.addTask)).to.be.true;
		expect(_.isFunction(atm.resize)).to.be.true;
	});

	it('asyncTaskManager totalResources & currentResources', () => {
		const r = { a: 1, b: 2 };
		const rCopy = _.extend({}, r);

		const atm = createAsyncTaskManager({
			resources: r
		});

		// typical
		expect(_.isObject(atm.totalResources)).to.be.true;
		expect(_.isObject(atm.currentResources)).to.be.true;
		expect(r).to.deep.equal(atm.totalResources);
		expect(r).to.deep.equal(atm.currentResources);

		// non-external mutability
		r.a = 324324;
		r.b = 131;

		expect(rCopy).to.deep.equal(atm.totalResources);
		expect(rCopy).to.deep.equal(atm.currentResources);
	});
});

describe('promise testing', () => {
	it('simple promise tests', () => {
		return Promise.all([
			expect(Promise.resolve(5)).to.eventually.be.equal(5),
			// expect(new Promise(resolve => setTimeout(() => resolve(2), 10))).to.eventually.be.equal(5) // will fail
		]);
	});
});

xdescribe('createAsyncTaskManager function test', () => {
	const asyncTaskManager = createAsyncTaskManager({
		resources: { sheep: 3, wood: 1 }
	});

	const _inputA = makePromiseWithControlledResolution('a');
	const _inputB = makePromiseWithControlledResolution({ b: 'b' });

	// functions
	const taskAlpha = function({ inputA, inputB }) {
		const output = `${inputA}${inputB.b}`;
		return new Promise(resolve => {
			setTimeout(() => {
				resolve(output);
			}, 50);
		});
	};
	const taskBeta = function({ taskAlphaOutput, inputB, inputC }) {
		// return promise here for fun
		return new Promise(resolve => {
			setTimeout(() => {
				resolve(`${taskAlphaOutput}${inputC}${inputB.b}`);
			}, 50);
		});
	};

	const taskAlphaDescription = {
		id: 1,
		inputs: {
			inputA: _inputA.promise,
			inputB: _inputB.promise
		},
		task: taskAlpha,
		resources: { 'sheep': 2, 'wood': 1 },
		priority: 3
	};

	const taskAlphaPromise = asyncTaskManager.addTask(taskAlphaDescription);

	const taskBetaDescription = {
		id: 1,
		inputs: {
			taskAlphaOutput: taskAlphaPromise,
			inputB: _inputB.promise,
			inputC: 'c'
		},
		task: taskBeta,
		resources: { 'sheep': 2, 'wood': 0 },
		priority: 3
	};

	const taskBetaPromise = asyncTaskManager.addTask(taskBetaDescription);

	it('check pendingTasks, readyTasks and executingTasks are all arrays', () => {
		expect(asyncTaskManager.pendingTasks).to.be.an('array');
		expect(asyncTaskManager.readyTasks).to.be.an('array');
		expect(asyncTaskManager.executingTasks).to.be.an('array');
	});

	// test: call _inputA.resolvePromise()
	// --> nothing starts
	it('inputA promise resolves but nothing happens', done => {
		_inputA.resolvePromise();
		expect(asyncTaskManager.pendingTasks.length).to.deep.equal(2);
		expect(asyncTaskManager.readyTasks.length).to.deep.equal(0);
		expect(asyncTaskManager.executingTasks.length).to.deep.equal(0);
		done();
	});

	// test: call _inputB.resolvePromise()
	// --> Task A starts (check 10 ms after resolving)
	it('inputB promise resolves; Task A Starts', done => {
		_inputB.resolvePromise();
		setTimeout(() => {
			expect(asyncTaskManager.pendingTasks.length).to.deep.equal(1);
			expect(asyncTaskManager.readyTasks.length).to.deep.equal(0);
			expect(asyncTaskManager.executingTasks.length).to.deep.equal(1);
			done();
		}, 10);
	});

	// test: taskAlphaPromise resolves
	// --> Task B starts (check 10 ms after resolving)
	// --> Task A is no longer in executing list (check 1ms after resolving)

	it('taskAlphaPromiseresolves resolves; Task A Starts', (done) => {
		taskAlphaPromise.then(value => {
			setTimeout(() => {
				try {
					expect(value).to.be.deep.equal('ab');
					expect(asyncTaskManager.pendingTasks.length).to.be.deep.equal(0);
					expect(asyncTaskManager.readyTasks.length).to.be.deep.equal(0);
					expect(asyncTaskManager.executingTasks.length).to.be.deep.equal(1);
					done();
				} catch (err) {
					done(err);
				}
			}, 10);
		}).catch(x => { console.log('catching promise', x); });
	});

	// test: taskBetaPromise resolves
	// --> Task B is no longer in executing list (check 1ms after resolving)
	// --> Task B resolves to 'abc'

	it('taskBetaPromiseresolves resolves', done => {
		taskBetaPromise.then(value => {
			setTimeout(() => {
				expect(value).to.be.deep.equal('abcb');
				expect(asyncTaskManager.pendingTasks.length).to.be.deep.equal(0);
				expect(asyncTaskManager.readyTasks.length).to.be.deep.equal(0);
				expect(asyncTaskManager.executingTasks.length).to.be.deep.equal(0);
				done();
			}, 10);
		}).catch(x => {
			done(x);
		});
	});

	// test: resize functionality
	it('resize can increase the total resources', () => {
		asyncTaskManager.resize({ sheep: 6, wood: 20 });
		expect(asyncTaskManager.totalResources.sheep).to.deep.equal(6);
		expect(asyncTaskManager.totalResources.wood).to.deep.equal(20);
		// expect(asyncTaskManager.currentResources.sheep).to.deep.equal(6);
		// expect(asyncTaskManager.currentResources.wood).to.deep.equal(20);
	});

	it('resize can decrease the total resources', () => {
		asyncTaskManager.resize({ sheep: 2 });
		expect(asyncTaskManager.totalResources.sheep).to.deep.equal(2);
		expect(asyncTaskManager.totalResources.wood).to.deep.equal(0);
	});
});

xdescribe('createAsyncTaskManager random-tests.js', () => {
	const atm = createAsyncTaskManager({
		resources: { sheep: 3, wood: 1, coal: 7, stone: 4 }
	});

	let taskEvents = [];

	function track(taskDescription, task) {
		const t = task;
		const taskInputs = taskDescription.inputs;
		const eventId = taskDescription.id;
		const taskEventsItem = {
			t,
			taskInputs,
			id: `${eventId}`,
			type: 'Start',
			date: new Date()
		};
		taskEvents.push(taskEventsItem);
		setTimeout(() => {
			t.then(() => {
				const comeletedTasksEventItem = _.extend({}, taskEventsItem);
				comeletedTasksEventItem.type = 'End';
				taskEvents.push(comeletedTasksEventItem);
			});
		}, _.random(0, 5));
	}

	function generateRandomFunction() {
		return function() {
			return _.random(1, 10);
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
				input[idx + 1] = tasksToDoCopy[idx];
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

	let tasksHistory = [];

	let prereqList = {};

	function newTask() {
		const taskDescription = generateRandomTaskDescription(tasksHistory);
		return taskDescription;
	}

	function createAndAddRandomTaskToTaskManager() {
		const taskDescription = newTask();
		prereqList[taskDescription.id] = Object.keys(taskDescription.inputs);
		const newTaskPromise = atm.addTask(taskDescription);

		tasksHistory.push(newTaskPromise);
		track(taskDescription, newTaskPromise);
	}

	// beforeEach(() => {
	before(() => {
		tasksHistory = [];
		taskEvents = [];
		prereqList = {};
		for (let c = 0; c < 5; c++) {
			createAndAddRandomTaskToTaskManager();
		}
	});

	// before(() => {
	// 	Object.keys(prereqList).forEach(x => {
	// 		console.log('testingt it ', x);
	// 		it('testing it generation', () => {
	// 			expect(true).to.be(true);
	// 		});
	// 	});
	// });

	// it('adding multiple task to the taskManager adds multiple task to the taskHistory', (done) => {
	// 	createAndAddRandomTaskToTaskManager(); // 1
	// 	createAndAddRandomTaskToTaskManager();
	// 	createAndAddRandomTaskToTaskManager();
	// 	createAndAddRandomTaskToTaskManager();
	// 	createAndAddRandomTaskToTaskManager(); // 5
	// 	expect(tasksHistory.length).to.eq(5);
	// 	setTimeout(() => {
	// 		// expect(taskEvents.length).to.eq(10);
	// 		// expect(taskEvents[1].type).to.eq('Start');
	// 		// expect(taskEvents[4].type).to.eq('Start');
	// 		// expect(taskEvents[6].type).to.eq('End');
	// 		// expect(taskEvents[9].type).to.eq('End');
	// 		// console.log('tasksHistory ', tasksHistory);
	// 		// console.log('taskEventsList ', taskEvents);
	// 		console.log('preReqList ', prereqList);
	// 		done();
	// 	}, 200);
	// });

	// _.each(prereqList, (v, k) => {
	// 	console.log('key and value', (v, k));
	// 	it(`task ${k} before tasks ${v}`, () => {
	// 		if (v.length > 0) {
	// 			const executionOrder = _.map(taskEvents, x => {
	// 				if (x.type === 'End') {
	// 					return x.id;
	// 				}
	// 			});
	// 			const taskIndexInExecutionOrder = _.indexOf(executionOrder, k);
	// 			expect(taskIndexInExecutionOrder).to.not.eq(-1);
	// 			executionOrder.splice(taskIndexInExecutionOrder + 1);
	// 			v.forEach(x => {
	// 				expect(_.indexOf(executionOrder, x)).to.not.eq(-1);
	// 			});
	// 		}
	// 	});
	// });

	// it('this does nothing', () => {
	// 	expect(1).to.eq(1);
	// });

	// xit('prerequisite constraint is maintained ', (done) => {
	// 	for (let c = 0; c < 5; c++) {
	// 		createAndAddRandomTaskToTaskManager();
	// 	}
	// 	// having the right number of elements in prerequisite list
	// 	expect(Object.keys(prereqList).length).to.eq(5);
	// 	setTimeout(() => {
	// 		let executionOrder = _.filter(taskEvents, x => {
	// 			if (x.type === 'End') {
	// 				return x;
	// 			}
	// 		});
	// 		executionOrder = _.map(executionOrder, x => {
	// 			return x.id;
	// 		});
	// 		// console.log(executionOrder);
	// 		_.each(prereqList, (v, k) => {
	// 			if (v.length > 0) {
	// 				// console.log(k, executionOrder);
	// 				console.log(`id: ${k}, prereq: ${v}`);
	// 				console.log('executionOrder ', executionOrder);

	// 				const taskIndexInExecutionOrder = _.indexOf(executionOrder, k);
	// 				expect(taskIndexInExecutionOrder).to.not.eq(-1);
	// 				const executionOrderCopy = executionOrder.slice();
	// 				executionOrderCopy.splice(taskIndexInExecutionOrder + 1);
	// 				// console.log('key and value', (v, k));
	// 				v.forEach(x => {
	// 					console.log('failing in forEach');
	// 					console.log(x, executionOrderCopy);
	// 					expect(_.indexOf(executionOrderCopy, x)).to.not.eq(-1);
	// 				});
	// 			}
	// 			// });
	// 		});
	// 		done();
	// 	}, 500);
	// });
});

// execute utilities tests
require('./utilities-tests.js');
