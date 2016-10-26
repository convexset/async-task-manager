const { checkResources } = require('./utilities');

function AsyncTaskManager({
	resources = {}
} = {}) {
	checkResources(resources);
	// do stuff here
}

AsyncTaskManager.prototype = {
	addTask: function addTask({
		prerequisites = [],
		resources = {},
		priority = 5
	} = {}) {
		// add task
		// returns a promise
	},
	resizeResources: function(newResourceSet) {
		checkResources(newResourceSet);
	},
	_trigger: function _triggerInternalEvent(eventName) {
		switch (eventName) {
			case 'task-added':
				console.log(eventName);
				break;
			case 'task-completed':
				console.log(eventName);
				break;
			case 'resource-availability-updated':
				console.log(eventName);
				break;
			case 'beginable-tasks-updated':
				console.log(eventName);
				break;
			default:
				throw new Error('invalid-event-name');
		}
	}
};

module.exports = AsyncTaskManager;
