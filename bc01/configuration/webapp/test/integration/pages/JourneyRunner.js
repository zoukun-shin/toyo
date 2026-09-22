sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"bc/configuration/test/integration/pages/ConfigurationList",
	"bc/configuration/test/integration/pages/ConfigurationObjectPage",
	"bc/configuration/test/integration/pages/ConfigurationItemObjectPage"
], function (JourneyRunner, ConfigurationList, ConfigurationObjectPage, ConfigurationItemObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('bc/configuration') + '/test/flp.html#app-preview',
        pages: {
			onTheConfigurationList: ConfigurationList,
			onTheConfigurationObjectPage: ConfigurationObjectPage,
			onTheConfigurationItemObjectPage: ConfigurationItemObjectPage
        },
        async: true
    });

    return runner;
});

