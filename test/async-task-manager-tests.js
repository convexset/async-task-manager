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

describe('createAsyncTaskManager function test', () => {
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
			expect(asyncTaskManager.executingTasks.length).to.deep.equal(0);
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
					expect(asyncTaskManager.executingTasks.length).to.be.deep.equal(0);
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

describe('createAsyncTaskManager random-tests.js', () => {
	const atm = createAsyncTaskManager({
		resources: { sheep: 3, wood: 1, coal: 7, stone: 4 }
	});

	const eventLog = [];
	const tasksHistory = [];
	const prereqList = {};

	// let taskId = 0;

	function generateTask(id) {
		return function someTask(inputs = {}) {
			console.log(`[${id}] Start`);
			eventLog.push({
				id: id,
				ts: new Date(),
				event: 'start',
				inputs: inputs
			});

			return new Promise(resolve => {
				setTimeout(() => {
					console.log(`[${id}] End`);
					const returnValue = Math.floor(1000 * Math.random());
					eventLog.push({
						id: id,
						ts: new Date(),
						event: 'end',
						returnValue: returnValue
					});
					resolve(returnValue);
				}, 100 * Math.random());
			});
		};
	}

	function generateInput() {
		let input = {};
		if (tasksHistory.length === 0) {
			input = {};
		} else {
			const numberOfInputs = _.random(0, tasksHistory.length - 1);
			const tasksHistoryCopy = tasksHistory.slice();
			for (let i = 0; i < numberOfInputs; i++) {
				const idx = _.random(0, tasksHistoryCopy.length - 1);
				input[tasksHistoryCopy[idx].taskId] = tasksHistoryCopy[idx].newTaskPromise;
				console.log('taskhistory inside coadsfa ', tasksHistoryCopy[idx]);
				// input.push(tasksHistoryCopy[idx]);
				// console.log('input[idx]+1] ', input[idx + 1]);
				tasksHistoryCopy.splice(idx, 1);
			}
		}
		// console.log('input ', input);
		return input;
	}

	for (let x = 0; x < 5; x++) {
		let taskId = x + 1;
		console.log('looper ',taskId);
		const newTask = generateTask(taskId);
		const input = generateInput();
		const taskDescription = {
			id: taskId,
			inputs: input,
			task: newTask,
			resources: { sheep: _.random(0, 3), wood: _.random(0, 1), coal: _.random(0, 7), stone: _.random(0, 4) },
			priority: _.random(1, 10)
		};
		const newTaskPromise = atm.addTask(taskDescription);
		tasksHistory.push({ newTaskPromise, taskId });
		prereqList[taskDescription.id] = input;
	}


	console.log('prereqList ', prereqList);
	_.each(prereqList, (v, k) => {
		it(`tasks ${Object.keys(v)} before task ${k}`, done => {
			setTimeout(() => {
				console.log('EVENT LOG ', eventLog);
				let executionOrder = eventLog.filter(x => {
					if (x.event === 'end') {
						return x;
					}
				});
				executionOrder = executionOrder.map(x => {
					return x.id;
				});
				if (Object.keys(v).length > 0) {
					k = parseInt(k);
					const taskIndexInExecutionOrder = executionOrder.indexOf(k);
					console.log('adsfadsfasdf ', executionOrder.indexOf(k));
					console.log('EXECUTION ORDER ', executionOrder);
					console.log('task number ', k);
					console.log(typeof k, executionOrder.map(x => typeof x));
					expect(taskIndexInExecutionOrder).to.not.eq(-1);
					console.log(typeof v);
					console.log('v', v);
					const executionOrderCopy = executionOrder.slice();
					executionOrderCopy.splice(taskIndexInExecutionOrder + 1);
					// expect(1).to.eq(2);
					_.forEach(v, (v,k) => {
						k = parseInt(k);
						console.log('smells like teen spirit ');
						expect(executionOrderCopy.indexOf(k)).to.not.eq(-1);
					});
				}
				done();
			}, 100);
		});
	});
});


//=========================================================
/*
	function track(taskDescription, task) {
		const t = task;
		const taskInputs = taskDescription.inputs;
		const eventId = taskDescription.id;
		const eventLogItem = {
			t,
			taskInputs,
			id: `${eventId}`,
			type: 'Start',
			date: new Date()
		};
		eventLog.push(eventLogItem);
		console.log('eventLogItem.taskInputs ', _.toArray(eventLogItem.taskInputs));
		setTimeout(() => {
			Promise.all(_.toArray(eventLogItem.taskInputs)).then( () => {
				const completedTasksEventItem = _.extend({}, eventLogItem);
				completedTasksEventItem.type = 'End';
				eventLog.push(completedTasksEventItem);
			});
		}, _.random(0, 10));
	}

	function generateRandomFunction() {
		return function() {
			return _.random(1, 10);
		};
	}

	let taskDescriptionId = 1;

	function generateRandomTaskDescription(tasksHistory) {
		let input = {};
		if (tasksHistory.length === 0) {
			input = {};
		} else {
			const numberOfInputs = _.random(0, tasksHistory.length - 1);
			const tasksHistoryCopy = tasksHistory.slice();
			for (let i = 0; i < numberOfInputs; i++) {
				const idx = _.random(0, tasksHistoryCopy.length - 1);
				input[idx + 1] = tasksHistoryCopy[idx];
				tasksHistoryCopy.splice(idx, 1);
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


	tasksHistory = [];
	eventLog = [];

	prereqList = {};
	for (let c = 0; c < 5; c++) {
		createAndAddRandomTaskToTaskManager();
	}
	console.log('tasksHistory ', tasksHistory);


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
	// 		// expect(eventLog.length).to.eq(10);
	// 		// expect(eventLog[1].type).to.eq('Start');
	// 		// expect(eventLog[4].type).to.eq('Start');
	// 		// expect(eventLog[6].type).to.eq('End');
	// 		// expect(eventLog[9].type).to.eq('End');
	// 		// console.log('tasksHistory ', tasksHistory);
	// 		// console.log('eventLogList ', eventLog);
	// 		console.log('preReqList ', prereqList);
	// 		done();
	// 	}, 200);
	// });
	//


	// setTimeout(() => {

	_.each(prereqList, (v, k) => {
		it(`tasks ${v} before task ${k}`, done => {
			setTimeout(() => {
				// console.log('tasksHistory ', tasksHistory);
				let executionOrder = _.filter(eventLog, x => {
					if (x.type === 'End') {
						return x.id;
					}
				});
				executionOrder = _.map(executionOrder, x => {
					return x.id;
				});
				// console.log('TASK EVENTS ', eventLog);
				console.log('EXECUTION ORDER', executionOrder);
				console.log(`key ${k} and value ${v}`);
				if (v.length > 0) {
					const taskIndexInExecutionOrder = _.indexOf(executionOrder, k);
					expect(taskIndexInExecutionOrder).to.not.eq(-1);
					const executionOrderCopy = executionOrder.slice();
					executionOrderCopy.splice(taskIndexInExecutionOrder + 1);
					// expect(1).to.eq(2);
					v.forEach(x => {
						expect(_.indexOf(executionOrderCopy, x)).to.not.eq(-1);
					});
				}
				done();
			}, 50);
		});
	});
	// }, 50);

	// it('this does nothing', () => {
	// 	expect(1).to.eq(1);
	// });

	xit('prerequisite constraint is maintained ', (done) => {
		for (let c = 0; c < 5; c++) {
			createAndAddRandomTaskToTaskManager();
		}
		// having the right number of elements in prerequisite list
		expect(Object.keys(prereqList).length).to.eq(5);
		setTimeout(() => {
			let executionOrder = _.filter(eventLog, x => {
				if (x.type === 'End') {
					return x;
				}
			});
			executionOrder = _.map(executionOrder, x => {
				return x.id;
			});
			// console.log(executionOrder);
			_.each(prereqList, (v, k) => {
				if (v.length > 0) {
					// console.log(k, executionOrder);
					// console.log(`id: ${k}, prereq: ${v}`);
					// console.log('executionOrder ', executionOrder);

					const taskIndexInExecutionOrder = _.indexOf(executionOrder, k);
					expect(taskIndexInExecutionOrder).to.not.eq(-1);
					const executionOrderCopy = executionOrder.slice();
					executionOrderCopy.splice(taskIndexInExecutionOrder + 1);
					// console.log('key and value', (v, k));
					v.forEach(x => {
						// console.log('failing in forEach');
						// console.log(x, executionOrderCopy);
						expect(_.indexOf(executionOrderCopy, x)).to.not.eq(-1);
					});
				}
				// });
			});
			done();
		}, 1000);
	});
});
*/
// execute utilities tests
require('./utilities-tests.js');
