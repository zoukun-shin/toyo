sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/Fragment",
	"sap/m/Dialog",
	"sap/ui/core/Messaging",
	"./messages",
	'sap/ui/core/message/Message',
	'sap/ui/core/message/MessageType',
], (Controller,
	Fragment,
	Dialog,
	Messaging,
	messages,
	Message,
	MessageType) => {
	"use strict";

	return Controller.extend("mm.acceptance.controller.Main", {
		_sCurrentTab: "material",
		_oMaterialContext: null,
		_oGLContext: null,

		onInit() {
			// this._LocalData = this.getOwnerComponent().getModel("local");
			this._oDataModel = this.getOwnerComponent().getModel();
			this._ResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			this._BusyDialog = new sap.m.BusyDialog();

			// set message model
			this.sModelName = "message";
			this.getView().setModel(Messaging.getMessageModel(), this.sModelName);

			// activate automatic message generation for complete view
			Messaging.registerObject(this.getView(), true);
		},

		onBeforeRebindTable: function() {
			Messaging.removeAllMessages();
		},

		changeDetail: function (sPath) {
			this.byId("idSmartForm").bindElement({
				path: sPath
			});
		},

		onInputDifference: function (oEvent,sMode) {
			this._oEvent = oEvent;
			this._sMode = sMode;
			// 清空缓存和 pending changes，防止显示上次的数据
			this._oMaterialContext = null;
			this._oGLContext = null;
			this._oDataModel.resetChanges();
			if (!this.Dialog) {
				var oView = this.getView();
				if (!this.Dialog) {
					this.Dialog = Fragment.load({
						id: oView.getId(),
						name: "mm.acceptance.fragment.InputDifference",
						controller: this
					}).then(function (oDialog) {
						this.getView().addDependent(oDialog);
						return oDialog;
					}.bind(this));
				}
			}
			this.Dialog.then(function (oDialog) {
				if (sMode === "change") {
					let oRecord = oEvent.getSource().getBindingContext().getObject();
					if (oRecord.GLAccount) {
						this._sCurrentTab = "glAccount";
						this.byId("idTabMaterial").setVisible(false);
						this.byId("idTabGLAccount").setVisible(true);
						this.byId("idIconTabBar").setSelectedKey("glAccount");
					} else {
						this._sCurrentTab = "material";
						this.byId("idTabMaterial").setVisible(true);
						this.byId("idTabGLAccount").setVisible(false);
						this.byId("idIconTabBar").setSelectedKey("material");
					}
				} else {
					// create 模式：两个页签都可见
					this._sCurrentTab = "material";
					this.byId("idTabMaterial").setVisible(true);
					this.byId("idTabGLAccount").setVisible(true);
					this.byId("idIconTabBar").setSelectedKey("material");
				}
				this.bindingSmartform(this._oEvent,this._sMode);
				oDialog.open();
			}.bind(this));
		},

		onTabSelect: function (oEvent) {
			this._sCurrentTab = oEvent.getParameter("key");
			this.bindingSmartform(this._oEvent, this._sMode);
		},

		onDialogClose: function () {
			Messaging.removeAllMessages();
			this._oDataModel.resetChanges();
			this._oMaterialContext = null;
			this._oGLContext = null;
			this.byId("idDialog").close();
		},

		onDialogConfirm: function () {
			this.onSave();
		},

		async bindingSmartform (oEvent,sMode) {
			let sSmartFormId;
			let sGroupId;
			if (this._sCurrentTab === "glAccount") {
				sSmartFormId = "idSmartFormGL";
				sGroupId = "glAccount";
			} else {
				sSmartFormId = "idSmartForm";
				sGroupId = "material";
			}

			if (sMode === "create") {
				let oCachedContext;
				if (sGroupId === "glAccount") {
					oCachedContext = this._oGLContext;
				} else {
					oCachedContext = this._oMaterialContext;
				}

				if (oCachedContext) {
					this.byId(sSmartFormId).unbindElement(undefined);
					this.byId(sSmartFormId).setBindingContext(oCachedContext);
				} else {
					let iRecordSequence = await this.getNewRecordSequence();
					let oContext;
					let sEntitySet = sGroupId === "glAccount" ? "/PriceDifferenceGL" : "/PriceDifference";
					oContext = this._oDataModel.createEntry(sEntitySet, {
						groupId: sGroupId,
						properties: {
							RecordSequence: iRecordSequence.toString(),
							OrderNumber: "100000",
							CompanyCode: "30JT"
						}
					});
					if (sGroupId === "glAccount") {
						this._oGLContext = oContext;
					} else {
						this._oMaterialContext = oContext;
					}
					this.byId(sSmartFormId).unbindElement(undefined);
					this.byId(sSmartFormId).setBindingContext(oContext);
				}
			} else if (sMode === "change") {
				let oRecord = oEvent.getSource().getBindingContext().getObject();
				let sEntitySet = sGroupId === "glAccount" ? "/PriceDifferenceGL" : "/PriceDifference";
				let sPath = this._oDataModel.createKey(sEntitySet,{RecordSequence:oRecord.RecordSequence});
				this.byId(sSmartFormId).bindElement(sPath);
			}
		},

		onSave: function () {
			var that = this;
			Messaging.removeAllMessages();

			let sSmartFormId;
			if (this._sCurrentTab === "glAccount") {
				sSmartFormId = "idSmartFormGL";
			} else {
				sSmartFormId = "idSmartForm";
			}
			this.byId(sSmartFormId).check();

			if (this.isExistError()) {
				return;
			}

			this._BusyDialog.open();
			this._oDataModel.submitChanges({
				success:function() {
					that._BusyDialog.close();
					that._oMaterialContext = null;
					that._oGLContext = null;
					that.byId("idDialog").close();
					that.byId("idSmartTable").rebindTable(false);
				},
				error: function() {
					that._BusyDialog.close();
				}
			});

		},

		onCreateInvoice: function (oEvent) {
			Messaging.removeAllMessages();
			let aPostData = this.preparePostData(oEvent);
			this.postAction("processLogic","Posting", aPostData);
		},

		postAction: function (sAction,sEvent, postData) {
			this._BusyDialog.open();
			var oModel = this._oDataModel;
			oModel.callFunction(`/${sAction}`, {
				method: "POST",
				changeSetId: 1,
				urlParameters: {
					Event: sEvent,
					Zzkey: postData
				},
				success: function (oData) {
					let aMessage = JSON.parse(oData[sAction].Zzkey);
					aMessage.forEach(function(line){
						this.addMessages(line.TYPE,line.MESSAGE);
					},this);
					this._BusyDialog.close();
				}.bind(this),
				error: function (oError) {
					messages.showError(messages.parseErrors(oError));
					this._BusyDialog.close();
				}.bind(this)
			});
		},
		addMessages: function(sType,sMessage) {
			let sMessageType;
			switch(sType) {
				case "S":
					sMessageType = MessageType.Success; break;
				case "E":
					sMessageType = MessageType.Error; break;
				case "W":
					sMessageType = MessageType.Warning; break;
				default:
					sMessageType = MessageType.None; break;
			}
			Messaging.addMessages(
				new Message({
					message: sMessage,
					type: sMessageType,
					processor: this.getView().getModel(this.sModelName)
				})
			);
		},
		preparePostData: function(oEvent) {
			let aSelectedData = this.getSelectedRows(oEvent);
			let aPostData = [];
			aSelectedData.forEach(function(line){
				let iItemAmount,iQuantity,sQuantityUnit;

				if ( line.PurchaseOrder !== "" ) {
					iItemAmount = line.APAmountExclTax;
					iQuantity = line.AcceptanceQuantity;
					sQuantityUnit = line.PurchaseOrderQuantityUnit;
				} else if ( line.GLAccount ) {
					iItemAmount = line.PriceDifference;
					iQuantity = line.DifferenceQuantity;
					sQuantityUnit = line.BaseUnit;
				} else {
					iItemAmount = line.APAmountExclTax;
					iQuantity = line.DifferenceQuantity;
					sQuantityUnit = line.BaseUnit;
				}

				aPostData.push({
					CompanyCode: line.CompanyCode,
					Plant: line.Plant,
					Material: line.Material,
					Supplier: line.Supplier,
					DocumentCurrency: line.DocumentCurrency,
					PurchaseOrder: line.PurchaseOrder,
					PurchaseOrderItem: line.PurchaseOrderItem,
					RecordSequence: line.RecordSequence,
					Quantity: iQuantity,
					QuantityUnit: sQuantityUnit,
					ItemAmount: iItemAmount,
					TaxAmount:line.TaxAmount,
					TaxCode: line.TaxCode,
					APTransactionCode: line.APTransactionCode,
					APTransactionCodeName: line.APTransactionCodeName,
					AccountAssignmentCategory : line.AccountAssignmentCategory,
					MaterialDocumentYear: line.MaterialDocumentYear,
					MaterialDocument: line.MaterialDocument,
					MaterialDocumentItem: line.MaterialDocumentItem,
					AcceptanceDate: line.AcceptanceDate,
					GLAccount: line.GLAccount,
					CostCenter: line.CostCenter,
					PaymentTerms: line.PaymentTerms
				});
			})
			return JSON.stringify(aPostData);
		},

		onChangePrice:function(oEvent){
			this.getUnitPrice()
		},

		onChangeMaterial: function(oEvent){
			this.getUnitPrice();
			this.deterMaterial();
		},

		onChangeGLAccount: function(oEvent){
			this.deterGLAccount();
		},

		getUnitPrice: function(){
			let that = this;
			let sAction = "getUnitPrice";
			let oRecord = this.byId("idSmartForm").getBindingContext().getObject();
			let postData = {
				Material: oRecord.Material,
				Plant: oRecord.Plant,
				Supplier: oRecord.Supplier,
				PriceDiff: oRecord.PriceDiff
			}
			this.determination(sAction,JSON.stringify(postData)).then(function(oData){
				let sPath = that.byId("idSmartForm").getBindingContext().getPath();
				let oRecord = JSON.parse(oData[sAction].Zzkey);
				that._oDataModel.setProperty(sPath + "/PriceDiff", oRecord.PRICEDIFF.toString());
				that._oDataModel.setProperty(sPath + "/Currency", oRecord.CURRENCY.toString());
			});
		},
		deterMaterial: function(){
			let that = this;
			let sAction = "deterMaterial";
			let oRecord = this.byId("idSmartForm").getBindingContext().getObject();
			let postData = {
				Material: oRecord.Material,
				DisclosureDivision: oRecord.DisclosureDivision,
				Unit: oRecord.Unit
			}
			this.determination(sAction,JSON.stringify(postData))
				.then(function(oData){
					let sPath = that.byId("idSmartForm").getBindingContext().getPath();
					let oRecord = JSON.parse(oData[sAction].Zzkey);
					that._oDataModel.setProperty(sPath + "/DisclosureDivision", oRecord.DISCLOSUREDIVISION.toString());
					that._oDataModel.setProperty(sPath + "/Abr", oRecord.ABR.toString(),);
					that._oDataModel.setProperty(sPath + "/Unit", oRecord.UNIT.toString());
				});
		},

		deterGLAccount: function(){
			let that = this;
			let sAction = "deterGLAccount";
			let oRecord = this.byId("idSmartFormGL").getBindingContext().getObject();
			let postData = {
				GLAccount: oRecord.GLAccount
			}
			this.determination(sAction,JSON.stringify(postData))
				.then(function(oData){
					let sPath = that.byId("idSmartFormGL").getBindingContext().getPath();
					let oRecord = JSON.parse(oData[sAction].Zzkey);
					that._oDataModel.setProperty(sPath + "/GLAccountName", oRecord.GLACCOUNTNAME);
				});
		},

		determination:function(sAction,postData) {
			let that = this;
			return new Promise(function(resolve,reject) {
				that._oDataModel.callFunction(`/${sAction}`, {
					method: "POST",
					changeSetId: 1,
					urlParameters: {
						Zzkey: postData
					},
					success: function (oData) {
						that._BusyDialog.close();
						resolve(oData);
					},
					error: function (oError) {
						messages.showError(messages.parseErrors(oError));
						that._BusyDialog.close();
					}
				})});
		},

		getNewRecordSequence: function () {
			let that = this;
			return new Promise(function(resolve, reject){
				var mParameters = {
					sorters: [
						new sap.ui.model.Sorter("RecordSequence", true)
					],
					urlParameters: {
						"$top": 1,
						"$select": "RecordSequence"
					},
					success: function (oData) {
						let iRecordSequence = 0;
						if (oData.results.length > 0) {
							iRecordSequence = oData.results[0].RecordSequence;
						}
						resolve( parseInt(iRecordSequence) + 1);
					},
					error: function (oError) {
						messages.showError(messages.parseErrors(oError));
						reject();
					}
				};
				that.getOwnerComponent().getModel().read("/PriceDifference", mParameters);
			});
		},

		getSelectedRows: function (oEvent) {
			var that = this;
			var oButton = oEvent.getSource();

			var oTable = oButton.getParent();
			while (oTable && !(oTable instanceof sap.ui.table.Table || oTable instanceof sap.m.Table)) {
				oTable = oTable.getParent();
				if (oTable instanceof sap.ui.comp.smarttable.SmartTable) {
					oTable.getAggregation("items").some(function (oControl) {
						if (oControl instanceof sap.ui.table.Table || oTable instanceof sap.m.Table) {
							oTable = oControl;
						}
					});
					break;
				}
			}
			if (!oTable) {
				console.log("未找到表格控件");
				return;
			}

			var aSelectedIndices = oTable.getSelectedIndices();

			if (aSelectedIndices.length === 0) {
				messages.showError(this._ResourceBundle.getText("msgNoSelect"));
				return [];
			}

			var oModel = oTable.getModel();

			var aSelectedData = [];

			aSelectedIndices.forEach(function (iIndex) {
				var oContext = oTable.getContextByIndex(iIndex);
				var oRowData = oModel.getProperty(oContext.getPath());
				var oCopyRowData = JSON.parse(JSON.stringify(oRowData));
				aSelectedData.push(oCopyRowData);
			});

			return aSelectedData;
		},

		isExistError: function () {
			let oMessageModel = Messaging.getMessageModel();
			if (oMessageModel.getData().length > 0) {
				return true;
			}
			return false;
		},
		async onMessagePopoverPress(oEvent) {
			const oSourceControl = oEvent.getSource();
			const oMessagePopover = await this._getMessagePopover();
			oMessagePopover.openBy(oSourceControl);
		},
		_getMessagePopover() {
			if (!this.MessageDialog) {
				this.MessageDialog = this.loadFragment({
					name: "mm.acceptance.fragment.MessagePopover"
				});
			}
			return this.MessageDialog;
		},

	});
});
