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

	return Controller.extend("co.backflashdiffprocess.controller.ProcessLog", {
		formatter: formatter,

		onInit: function () {
			this._LocalData = this.getOwnerComponent().getModel("local");
			this._oDataModel = this.getOwnerComponent().getModel();
			this._ResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			this._BusyDialog = new BusyDialog();

			// メッセージモデルの設定
			this.sModelName = "message";
			this.getView().setModel(Messaging.getMessageModel(), this.sModelName);
			Messaging.registerObject(this.getView(), true);
		}
	});
});
