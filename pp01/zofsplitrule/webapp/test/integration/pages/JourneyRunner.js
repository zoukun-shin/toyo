sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"pp/zofsplitrule/test/integration/pages/SplitRuleList",
	"pp/zofsplitrule/test/integration/pages/SplitRuleObjectPage"
], function (JourneyRunner, SplitRuleList, SplitRuleObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('pp/zofsplitrule') + '/test/flp.html#app-preview',
        pages: {
			onTheSplitRuleList: SplitRuleList,
			onTheSplitRuleObjectPage: SplitRuleObjectPage
        },
        async: true
    });

    return runner;
});

