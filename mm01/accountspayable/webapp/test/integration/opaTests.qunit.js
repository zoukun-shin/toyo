/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["mm/accountspayable/test/integration/AllJourneys"
], function () {
	QUnit.start();
});
