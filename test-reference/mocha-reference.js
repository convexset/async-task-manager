/* eslint-disable no-console */
/* eslint-disable prefer-arrow-callback */

// The Mocha Stuff
// See: https://mochajs.org/
const describe = require('mocha').describe;
const it = require('mocha').it;

// hooks for set ups and tear downs
const before = require('mocha').before;
const beforeEach = require('mocha').beforeEach;
const after = require('mocha').after;
const afterEach = require('mocha').afterEach;

// for "disabling a test but keeping the code intact"
// simply add an 'x' in front of a describe / it block
// but Mocha would probably recommend using skip and only for cherry picking
// see http://mochajs.org/#exclusive-tests and http://mochajs.org/#inclusive-tests
const xdescribe = () => null;
const xit = () => null;

// the usual assert-type things
// See: http://chaijs.com/
const chai = require('chai');

const assert = chai.assert; // http://chaijs.com/guide/styles/#expect
const expect = chai.expect; // http://chaijs.com/guide/styles/#assert
const should = chai.should(); // http://chaijs.com/guide/styles/#should
// should does weird shit to the Object prototype
// so check out the guide

// use promises with chai: xxxxx(somePromise).to.eventually.yyyy
// See: https://github.com/domenic/chai-as-promised
chai.use(require('chai-as-promised'));

// always have a utility like underscore or lodash handy in an actual test suite
const _ = require('underscore');

function LOG() {
	console.log('[LOG]', ...arguments);
}

describe('[describe block description] Reference describe block with some hooks', function() {
	LOG('This line is at the beginning of the (only) describe block.');

	const blockGlobal = {};
	LOG('blockGlobal:', JSON.stringify(blockGlobal));

	///////////////////////////////////////////////////////////////////////////
	// Set Up / Tear Down Block
	///////////////////////////////////////////////////////////////////////////
	before(function() {
		// runs before all tests in this block
		blockGlobal.beforeEachCallCount = 0;
		blockGlobal.afterEachCallCount = 0;
		blockGlobal.testStatus = 'started';
		LOG('before(function() {/* overall set up */}); | blockGlobal:', JSON.stringify(blockGlobal));
	});

	after(function() {
		// runs after all tests in this block
		blockGlobal.testStatus = 'ended';
		LOG('after(function() {/* overall tear down */}); | blockGlobal:', JSON.stringify(blockGlobal));
	});

	beforeEach(function() {
		// runs before each test in this block
		blockGlobal.beforeEachCallCount += 1;
		LOG('beforeEach(function() {/* overall tear down */}); | blockGlobal:', JSON.stringify(blockGlobal));
	});

	afterEach(function() {
		// runs after each test in this block
		blockGlobal.afterEachCallCount += 1;
		LOG('afterEach(function() {/* overall tear down */}); | blockGlobal:', JSON.stringify(blockGlobal));
	});

	// async hooks
	before(done => {
		// async version
		LOG('(started) async version of before(function() {/* overall set up */});');
		setTimeout(() => {
			LOG('(done) async version of before(function() {/* overall set up */});');
			done();
		}, 10);
	});

	after(done => {
		// async version
		blockGlobal.testStatus = 'ended';
		LOG('(started) async version of after(function() {/* overall tear down */});');
		setTimeout(() => {
			LOG('(done) async version of after(function() {/* overall tear down */});');
			done();
		}, 10);
	});

	beforeEach(done => {
		// async version
		blockGlobal.beforeEachCallCount += 1;
		LOG('(started) async version of beforeEach(function() {/* overall tear down */});');
		setTimeout(() => {
			LOG('(done) async version of beforeEach(function() {/* overall tear down */});');
			done();
		}, 10);
	});

	afterEach(done => {
		// async version
		blockGlobal.afterEachCallCount += 1;
		LOG('(started) async version of afterEach(function() {/* overall tear down */});');
		setTimeout(() => {
			LOG('(done) async version of afterEach(function() {/* overall tear down */});');
			done();
		}, 10);
	});


	// some internal functions
	function eventuallyResolveTo(v, t = 50) {
		return new Promise(resolve => {
			setTimeout(() => resolve(v), t);
		});
	}

	function eventuallyRejectWith(v, t = 50) {
		return new Promise((resolve, reject) => {
			setTimeout(() => reject(v), t);
		});
	}

	function eventuallyThrow(msg, t = 50) {
		return new Promise(resolve => { setTimeout(() => resolve(), t); })
			.then(() => {
				throw new Error(msg);
			});
	}

	///////////////////////////////////////////////////////////////////////////
	// Actual test cases
	///////////////////////////////////////////////////////////////////////////

	LOG('This line is somewhere in the describe block but not in an it() or other block.');

	it('does the right thing', () => {
		const foo = 'bar';
		const tea = {
			flavors: ['chocolate', 'vanilla', 'strawberry']
		};

		foo.should.be.a('string');
		foo.should.equal('bar');
		foo.should.have.length(3);
		tea.should.have.property('flavors')
			.with.length(3);

		function returnUndefined() {}
		should.not.exist(null);
		should.not.exist(returnUndefined()); // void 0 works too, but is more opaque

		expect(foo).to.be.a('string');
		expect(foo).to.equal('bar');
		expect(foo).to.have.length(3);
		expect(tea).to.have.property('flavors')
			.with.length(3);

		assert.typeOf(foo, 'string');
		assert.equal(foo, 'bar');
		assert.lengthOf(foo, 3);
		assert.property(tea, 'flavors');
		assert.lengthOf(tea.flavors, 3);
	});

	it('simple promise tests (1/3)', () => {
		// return the final promise with the relevant assertion
		// See: https://github.com/domenic/chai-as-promised
		return eventuallyResolveTo(4).should.eventually.equal(4);
	});

	// let's have more shared global state for fun
	let p;

	it('simple promise tests (2/3)', () => {
		// return multiple "test promises" if there are multiple promises to be
		// asserted on
		// See: https://github.com/domenic/chai-as-promised
		p = Promise.all([
			eventuallyResolveTo(4).should.eventually.equal(4),
			assert.eventually.equal(Promise.resolve(2 + 2), 4, 'This had better be true, eventually'),

			// these two are equivalent
			eventuallyResolveTo('cat').should.eventually.deep.equal('cat'),
			eventuallyResolveTo('cat').should.become('cat'),
		]);
		p.then(() => LOG('All promises in set 2/3 completed'));

		LOG('Current state of promises from promise tests set 2/3 at end of it block:', p);

		return p;
	});

	_.times(3, idx => {
		const blockTitle = `Generated it(/* ... */) block ${idx + 1}`;
		it(blockTitle, function() {
			LOG('This is:', blockTitle);
			LOG('State of promises from promise tests set 2/3:', p);
		});
	});

	LOG('This line is also somewhere in the describe block but not in an it() or other block.');

	it('simple promise tests (3/3)', () => {
		// See: https://github.com/domenic/chai-as-promised
		return Promise.all([
			// very promise specific
			eventuallyResolveTo('xxx').should.be.fulfilled,
			eventuallyRejectWith('xxx').should.be.rejected,
			eventuallyRejectWith('xxx').should.be.rejected,
			eventuallyThrow('some-error').should.be.rejectedWith(Error)
		]);
	});

	xit('test that is not run', () => {
		LOG('**** THIS SHOULD NOT APPEAR ****');
	});

	it('a pending test (yet to be written) is one without the "test" callback');

	it('old style async test', function(done) {
		setTimeout(() => {
			assert.equal(1, 1);
			// call done at the end
			done();
		}, 50);
	});


	describe('test that should eventually succeed', () => {
		let theValue;
		beforeEach(done => {
			setTimeout(() => {
				theValue = Math.random();
				done();
			}, 50);
		});

		it('the test that should eventually succeed (e.g. http request)', function() {
			// don't use arrow functions here
			this.retries(50);  // works in it blocks and suites (describe blocks)
			                   // See: http://mochajs.org/#retry-tests
			expect(theValue).to.be.above(0.9);
		});
	});

	it('old style async test (long running)', function(done) {
		// don't use arrow functions here
		this.timeout(5000);
		setTimeout(() => {
			assert.equal(1, 1);
			// call done at the end
			done();
		}, 2500); // default time out is 2000 ms
	});


	///////////////////////////////////////////////////////////////////////////
	LOG('This line is at the end of the (only) describe block.');
});

xdescribe('block that is not run', function() {
	LOG('**** THIS SHOULD NOT APPEAR ****');
});
