const describe = require('mocha').describe;
const it = require('mocha').it;

// const should = require('chai').should();
// const assert = require('chai').assert;
const expect = require('chai').expect;

const _ = require('underscore');
const AsyncTaskManager = require('../src')(_);
const AsyncTaskManagerUtilities = require('../src/utilities.js')(_);

describe('AsyncTaskManager basics', () => {
	it('AsyncTaskManager is a function', () => {
		expect(_.isFunction(AsyncTaskManager)).to.be.true;
	});

	it('AsyncTaskManager.prototype is an object', () => {
		expect(_.isObject(AsyncTaskManager.prototype)).to.be.true;
	});

	it('new AsyncTaskManager() returns an object (hahaha)', () => {
		expect(_.isObject(new AsyncTaskManager())).to.be.true;
	});
});

describe('Utilities', () => {
	it('checkResources validates correctly', () => {
		expect(() => {
			AsyncTaskManagerUtilities.checkResources({ a: 10, b: 5 });
		}).to.not.throw(Error);
	});

	it('checkResources throws correctly', () => {
		expect(() => {
			AsyncTaskManagerUtilities.checkResources({ a: -1, b: 5 });
		}).to.throw(Error, 'invalid-resource-specification');
	});
});
