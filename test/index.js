const describe = require('mocha').describe;
const it = require('mocha').it;

// const should = require('chai').should();
// const assert = require('chai').assert;
const expect = require('chai').expect;

const _ = require('underscore');
const createAsyncTaskManager = require('../src')(_);
const AsyncTaskManagerUtilities = require('../src/utilities.js')(_);

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
		const functionInput = {x:2, a: 'sadv'};

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

describe('createAsyncTaskManager function test',()=>{
	const atm = createAsyncTaskManager({
		resources: {sheep: 3, wood:1}
	});

	beforeEach(()=>{
		let resolved;
		let rejected;

		const makeDelay = t => (v => new Promise(resolve => {
			setTimeout(() => { resolve(v) }, t);
			console.log(t);
		}));

		const p_z = new Promise((resolve,reject)=>{
			resolve = resolve;
			reject = reject;
		})

		const p_a = p_z.then(makeDelay(4000)); //4s delayed 
		const p_b = p_z.then(makeDelay(5000)); //5s delayed 
		const p_c = p_z.then(makeDelay(2000)); //5s delayed 

		const lit = 10;

		const alpha = function alpha({promise1: p_a, promise2: p_b, literal: lit}) {
			let p_a_value;
			let p_b_value;
			promise1.then(x=>{
				p_a_value = x;
			});
			promise2.then(x=>{
				p_b_value = x;
			});

			return (p_a_value || 0) + (p_a_value || 0) + lit;
		}

		const beta = function beta({_function: alpha, promise1: p_c, literal = lit}) {
			let p_c_value;
			promise1.then(x=>{
				p_c_value = x;
			});
			return _function + promise1 + lit;
		}
		const task = {
			id:1,
			inputs : { a: p_a, b: p_b },
			task :alpha,
			resources : { 'sheep': 2, 'wood': 2 },
			priority : 3
		};
	// })
	
	// before(()=>{
		atm.addTask(task);
	})

	it('addTask adds an element to pending task',()=>{
		expect(atm.pendingTasks.length).to.equal(1);
	})

	it('check pendingTasks, readyTasks and executingTasks are all arrays',()=>{
		expect(atm.pendingTasks).to.be.an('array');
		expect(atm.readyTasks).to.be.an('array');
		expect(atm.executingTasks).to.be.an('array');

	})

	it('addTask returns error when prereqs rejected',(done)=>{
		// expect(true);
		rejected(1);
		done();

	})



});

require('./utilities-tests.js')
