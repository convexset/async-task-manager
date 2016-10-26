module.exports = function createUtilities(_) {
	return {
		checkResources: function checkResources(resources) {
			if (_.filter(resources, v => !_.isNumber(v) || (v >= 0)).length > 0) {
				throw new Error('invalid-resource-specification');
			}
		},
	};
};
