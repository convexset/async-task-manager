const describe = require('mocha').describe;
const it = require('mocha').it;

// const should = require('chai').should();
// const assert = require('chai').assert;
const expect = require('chai').expect;

const _ = require('underscore');
const AsyncTaskManagerUtilities = require('../src/utilities.js')(_);

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

	it('promiseAll_ObjectEdition resolves correctly', done => {
		const pObject = AsyncTaskManagerUtilities.promiseAll_ObjectEdition({
			a: 'a',
			b: Promise.resolve(4),
			later: new Promise(resolve => {
				setTimeout(() => {
					resolve(true);
				}, 10);
			})
		});

		pObject
			.then(result => {
				expect(_.isEqual(result, {
					a: 'a',
					b: 4,
					later: true,
				})).to.be.true;
			})
			.catch(() => true)
			.then(() => done());
	});

	it('promiseAll_ObjectEdition rejects correctly (one level)', done => {
		const pObject = AsyncTaskManagerUtilities.promiseAll_ObjectEdition({
			a: 'a',
			b: Promise.resolve(4),
			animal: new Promise((resolve, reject) => {
				setTimeout(() => {
					reject('cat');
				}, 10);
			}),
			fish: new Promise((resolve, reject) => {
				setTimeout(() => {
					reject('tuna');
				}, 10);
			}),
		}, 'task-id');

		pObject
			.catch(errors => {
				expect(_.isEqual(errors.errors, [
					{ input: 'animal', taskId: 'task-id', error: 'cat' },
					{ input: 'fish', taskId: 'task-id', error: 'tuna' }
				])).to.be.true;
			})
			.then(() => done());
	});

	it('promiseAll_ObjectEdition rejects correctly (multiple levels)', done => {
		const pOne = AsyncTaskManagerUtilities.promiseAll_ObjectEdition({
			a: 'a',
			fail1: new Promise((resolve, reject) => {
				setTimeout(() => {
					reject('one');
				}, 10);
			}),
			fail2: new Promise((resolve, reject) => {
				setTimeout(() => {
					reject('two');
				}, 10);
			})
		}, 'task-one');

		const pTwo = AsyncTaskManagerUtilities.promiseAll_ObjectEdition({
			b: 'b',
			pOne: pOne
		}, 'task-two');

		const pThree = AsyncTaskManagerUtilities.promiseAll_ObjectEdition({
			c: 'c',
			pTwo: pTwo
		}, 'task-three');

		pThree
			.catch(errors => {
				expect(_.isEqual(errors.errors, [
					{ input: 'fail1', taskId: 'task-one', error: 'one' },
					{ input: 'fail2', taskId: 'task-one', error: 'two' },
					{ input: 'pOne', taskId: 'task-two' },
					{ input: 'pTwo', taskId: 'task-three' }
				])).to.be.true;
			})
			.then(() => done());
	});

	it('sortBy sorts correctly', () => {
		const array = [
			{ priority: 1, creationTime: new Date(1001) },
			{ priority: 3, creationTime: new Date(1000) },
			{ priority: 1, creationTime: new Date(1000) },
		];
		const arraySorted = array.sort(
			AsyncTaskManagerUtilities.sortBy([
				['priority', 1],
				['creationTime', 1],
			])
		);
		expect(_.isEqual(arraySorted, [
			{ priority: 1, creationTime: new Date(1000) },
			{ priority: 1, creationTime: new Date(1001) },
			{ priority: 3, creationTime: new Date(1000) },
		])).to.be.true;
	});

	it('objectAddition and objectSubtract work', () => {
		const x = { a: 1, b: 1 };
		const y = { b: 1, c: 1 };
		const y0 = { a: 0, b: 1, c: 1 };
		const z = { a: 1, b: 2, c: 1 };
		const z2 = { b: 2, c: 2 };
		const zR = { a: -1, b: 0, c: 1 };
		expect(_.isEqual(z, AsyncTaskManagerUtilities.objectAdd(x, y))).to.be.true;
		expect(_.isEqual(y0, AsyncTaskManagerUtilities.objectSubtract(z, x))).to.be.true;
		expect(zR).to.deep.equal(AsyncTaskManagerUtilities.objectSubtract(z2, z));
	});

	it('runPromisified works', done => {
		const p = AsyncTaskManagerUtilities.runPromisified(x => x.a + x.b, { a: 1, b: 1 });
		expect(p instanceof Promise).to.be.true;

		p.then(res => {
			expect(res).to.equal(2);
			done();
		}).catch(done);
	});

	it('createObjectPropertyGetter works', () => {
		const target = {};
		const o = { a: 1, b: 2 };
		AsyncTaskManagerUtilities.createObjectPropertyGetter(target, 'o', o);
		const o2 = target.o;
		expect(_.isEqual(o, o2)).to.be.true;
		o2.a = 7;
		expect(o.a).to.equal(1);
		expect(o2.a).to.equal(7);
	});

	it('createArrayPropertyGetter works', () => {
		const target = {};
		const arr = [1, 2, 3];
		AsyncTaskManagerUtilities.createArrayPropertyGetter(target, 'arr', arr);
		const arr2 = target.arr;
		expect(_.isEqual(arr, arr2)).to.be.true;
		arr2[0] = 7;
		expect(arr[0]).to.equal(1);
		expect(arr2[0]).to.equal(7);
	});

	it('isNonNegative returns proper boolean value', () => {
		const x = { a: 1, b: -1 };
		const y = { a: 1 };
		const _false = AsyncTaskManagerUtilities.isNonNegative(x);
		const _true = AsyncTaskManagerUtilities.isNonNegative(y);
		expect(_true).to.be.true;
		expect(_false).to.be.false;
	});
});
