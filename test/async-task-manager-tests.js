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

const {
	objectAdd,
	objectSubtract,
	isNonNegative,
} = require('../src/utilities')(_);

function makePromiseWithControlledResolution(resolveValue = true, rejectValue = false) {
	const ret = {};
	const p = new Promise((resolve, reject) => {
		ret.resolvePromise = () => resolve(resolveValue);
		ret.rejectPromise = () => reject(rejectValue);
	});
	ret.promise = p;
	return ret;
}

describe('createAsyncTaskManager bare basics', () => {
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

xdescribe('promise testing', () => {
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
			expect(asyncTaskManager.executingTasks.length).to.deep.equal(1);
			done();
		}, 10);
	});

	// test: taskAlphaPromise resolves
	// --> Task B starts (check 10 ms after resolving)
	// --> Task A is no longer in executing list (check 1ms after resolving)

	it('taskAlphaPromiseresolves resolves; Task B Starts', (done) => {
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
_.times(1, () => {
	describe('createAsyncTaskManager dynamically testing prereq constraint and resource constraint', () => {
		const atm = createAsyncTaskManager({
			resources: { sheep: 3, wood: 1, coal: 7, stone: 4 }
		});

		const eventLog = [];
		const tasksHistory = [];
		const prereqList = {};

		// let taskId = 0;

		function generateTask(id, resources) {
			return function someTask(inputs = {}) {
				// console.log(`[${id}] Start`);
				eventLog.push({
					id: id,
					ts: new Date(),
					event: 'start',
					inputs: inputs,
					resources: resources
				});

				return new Promise(resolve => {
					setTimeout(() => {
						// console.log(`[${id}] End`);
						const returnValue = Math.floor(1000 * Math.random());
						eventLog.push({
							id: id,
							ts: new Date(),
							event: 'end',
							resources: resources,
							returnValue: returnValue
						});
						resolve(returnValue);
					}, 100 * Math.random());
				});
			};
		}

		function returnItemsWithProbability(p) {
			return () => Math.random() < p;
		}

		function generateInput() {
			let input = [];
			if (tasksHistory.length === 0) {
				input = [];
			} else {
				const tasksHistoryCopy = tasksHistory.slice();
				input = tasksHistoryCopy.filter(returnItemsWithProbability(0.3));
				// console.log('input ', input);
			}
			return input;
		}

		const tdlist = [];
		_.times(5, idx => {
			const taskId = idx + 1; // 1 through 5
			// console.log('looper ', taskId);
			// const newTask = generateTask(taskId); //new task is a function
			const resources = { sheep: _.random(0, 3), wood: _.random(0, 1), coal: _.random(0, 7), stone: _.random(0, 4) };
			const input = generateInput();
			// console.log('input adsfasdf ', input);
			let inputPromises = input.map(x => {
				return x.newTaskPromise;
			});
			inputPromises = _.object(_.range(inputPromises.length), inputPromises);
			const inputIds = input.map(x => {
				return x.taskId;
			});
			const taskDescription = {
				id: taskId,
				inputs: inputPromises,
				task: generateTask(taskId, resources),
				resources: resources,
				priority: 1
			};
			const newTaskPromise = atm.addTask(taskDescription);
			tdlist.push(taskDescription);
			tasksHistory.push({ newTaskPromise, taskId });
			prereqList[taskDescription.id] = inputIds;
		});

		// console.log('prereqList ', prereqList);
		_.each(prereqList, (v, k) => {
			it(`tasks ${v} before task ${k}`, done => {
				setTimeout(() => {
					// console.log('EVENT LOG ', eventLog);
					let executionOrder = eventLog.filter(x => {
						if (x.event === 'end') {
							return x;
						}
					});
					executionOrder = executionOrder.map(x => {
						return x.id;
					});
					if (v.length > 0) {
						k = parseInt(k, 10);
						const taskIndexInExecutionOrder = executionOrder.indexOf(k);
						// console.log('adsfadsfasdf ', executionOrder.indexOf(k));
						// console.log('EXECUTION ORDER ', executionOrder);
						// console.log('task number ', k);
						// console.log(typeof k, executionOrder.map(x => typeof x));
						expect(taskIndexInExecutionOrder).to.not.eq(-1);
						// console.log(typeof v);
						// console.log('v', v);
						const executionOrderCopy = executionOrder.slice();
						// console.log('executionOrderCopy ', executionOrderCopy);
						executionOrderCopy.splice(taskIndexInExecutionOrder + 1);
						// expect(1).to.eq(2);
						v.forEach(x => {
							// console.log(x);
							x = parseInt(x, 10);
							// console.log('smells like teen spirit ');
							// console.log(typeof k, typeof x, executionOrderCopy.map(x => typeof x));
							// console.log(executionOrderCopys);
							// console.log(x);
							// console.log(executionOrderCopy.includes(x));
							expect(executionOrderCopy.indexOf(x)).to.not.eq(-1);
						});
					}
					done();
				}, 50);
			});
		});

		it('all resource constraints are satisfied', () => {
			let currentResources = atm.currentResources;
			// console.log(eventLog.length);
			// console.log(currentResources);
			// console.log(eventLog);
			eventLog.forEach(x => {
				// console.log(eventLog.length);
				// console.log('x sdfads ', x);
				if (x.event === 'start') {
					currentResources = objectSubtract(currentResources, x.resources);
					// console.log('currentResources: ', currentResources);
					const isResourceConstraintRespected = isNonNegative(currentResources);
					expect(isResourceConstraintRespected).to.be.true;
				} else if (x.event === 'end') {
					currentResources = objectAdd(currentResources, x.resources);
					// console.log(currentResources);
				}
			});
		});
	});
});
// execute utilities tests
require('./utilities-tests.js');
