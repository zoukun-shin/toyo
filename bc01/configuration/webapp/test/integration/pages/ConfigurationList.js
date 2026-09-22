sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'bc.configuration',
            componentId: 'ConfigurationList',
            contextPath: '/Configuration'
        },
        CustomPageDefinitions
    );
});