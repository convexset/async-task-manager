const describe = require('mocha').describe;
const xdescribe = () => null;
const it = require('mocha').it;
const before = require('mocha').before;
const beforeEach = require('mocha').beforeEach;

const chai = require('chai');
chai.use(require('chai-as-promised'));

// const should = chai.should();
// const assert = chai.assert;
const expect = chai.expect;

const _ = require('underscore');
const createAsyncTaskManager = require('../src')(_);
// const AsyncTaskManagerUtilities = require('../src/utilities.js')(_);

// function makeDelay(t) {
// 	return v => new Promise(resolve => {
// 		setTimeout(() => resolve(v), t);
// 	});
// }

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
	let taskAlpha = function({ inputA, inputB }) {
		const output = `${inputA}${inputB.b}`;
		return new Promise(resolve => {
			setTimeout(() => {
				resolve(output);
			}, 50);
		});
	};
	let taskBeta = function({ taskAlphaOutput, inputB, inputC }) {
		// return promise here for fun
		return new Promise(resolve => {
			setTimeout(() => {
				resolve(`${taskAlphaOutput}${inputC}`);
			}, 50);
		});
	};

	/* commenting out because this block is not run
		it('taskAlpha has correct arguments when called', () => {
			console.log('asdfa');
			taskAlpha = function({ inputA, inputB }) {
				// test arguments and move on
				expect(inputA instanceof Promise).to.be.true;
				expect(inputB instanceof Promise).to.be.true;
				expect(inputB).to.deep.equal({ b: 'b' });
				expect(inputA).to.deep.equal('a');

				// return promise here for fun
				const output = `${inputA}${inputB.b}`;
				return new Promise(resolve => {
					setTimeout(() => {
						resolve(output);
					}, 100);
				});
			};
		});

		it('taskBeta has correct arguments when called', () => {
			taskBeta = function({ taskAlphaOutput, inputB, inputC }) {
				// test arguments and move on
				// expect(taskAlphaOutput).to.deep.equal('ab');
				// expect(inputB).to.deep.equal({ b: 'b' });
				expect(taskAlphaOutput instanceof Promise).to.be.true;
				expect(inputB instanceof Promise).to.be.true;
				expect(inputC).to.deep.equal('c');
				done();
				// return promise here for fun
				return new Promise(resolve => {
					setTimeout(() => {
						console.log(`asdfds${taskAlphaOutput}${inputC}`);
						resolve(`${taskAlphaOutput}${inputC}`);
					}, 100);
				});
			};
		});
	*/
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
			console.log(value);
			setTimeout(() => {
				expect(value).to.be.deep.equal('abc');
				expect(asyncTaskManager.pendingTasks.length).to.be.deep.equal(0);
				expect(asyncTaskManager.readyTasks.length).to.be.deep.equal(0);
				expect(asyncTaskManager.executingTasks.length).to.be.deep.equal(0);
				done();
			}, 10);
		}).catch(x => {
			done(x);
		});
	});
});

// execute utilities tests
require('./utilities-tests.js');
