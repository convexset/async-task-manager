const describe = require('mocha').describe;
const it = require('mocha').it;

// const should = require('chai').should();
const expect = require('chai').expect;

const AsyncTaskManager = require('../src');
const _ = require('underscore');

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
