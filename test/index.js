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

		atm.addTask({
			id:1,
			inputs: functionInput,
			task: function(){return 2;},
			resources: r
		})

		// typical
		expect(_.isObject(atm.totalResources)).to.be.true;
		expect(_.isObject(atm.currentResources)).to.be.true;
		expect(_.isEqual(r, atm.totalResources)).to.be.true;
		expect(_.isEqual(r, atm.currentResources)).to.be.true;

		// non-external mutability
		r.a = 324324;
		r.b = 131;
		expect(_.isEqual(rCopy, atm.totalResources)).to.be.true;
		expect(_.isEqual(rCopy, atm.currentResources)).to.be.true;
		expect(_.isEqual(atm.pendingTasks.length, 1)).to.be.true;
	});
});

require('./utilities-tests.js')
