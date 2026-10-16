sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"../model/formatter",
	"sap/ui/core/Messaging",
	"sap/m/BusyDialog"
], function (
	Controller,
	formatter,
	Messaging,
	BusyDialog
) {
	"use strict";

	return Controller.extend("co.backflashdiffprocess.controller.AllocationResult", {
		formatter: formatter,

		onInit: function () {
			this._LocalData = this.getOwnerComponent().getModel("local");
			this._oDataModel = this.getOwnerComponent().getModel();
			this._ResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			this._BusyDialog = new BusyDialog();

			// Set up the message model
			this.sModelName = "message";
			this.getView().setModel(Messaging.getMessageModel(), this.sModelName);
			Messaging.registerObject(this.getView(), true);
		}
	});
});
