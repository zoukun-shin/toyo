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
			// let oView = this.getView();
			// oView.bindElement({
			// 	path: sPath,
			// 	events: {
			// 		dataRequested: function (oEvent) {
			// 			oView.setBusy(true);
			// 		},
			// 		dataReceived: function (oEvent) {
			// 			oView.setBusy(false);
			// 		}.bind(this)
			// 	}
			// });
			//如果绑定了createEntry 创建的context 不单独对每个控件绑定的话 无法更新绑定
			this.byId("idSmartForm").bindElement({
				path: sPath
			});
			// this._LocalData.setProperty("/viewEditable",false);

		},


		onInputDifference: function (oEvent,sMode) {
			// // 校验选择的行
			// var oTable = this.byId("reportTable1");
			// var listItems = oTable.getSelectedIndices();
			// if (listItems.length === 0) {
			// 	messages.showError(this._ResourceBundle.getText("msgNoSelect"));
			// 	return;
			// }
			// if (listItems.length > 1) {
			// 	messages.showError(this._ResourceBundle.getText("msgOnlySelectOne"));
			// 	return;
			// }
			if (!this.Dialog) {
				var oView = this.getView();
				if (!this.Dialog) {
					this.Dialog = Fragment.load({
						id: oView.getId(),
						name: "mm.acceptance.fragment.InputDifference",
						controller: this
					}).then(function (oDialog) {
						this.getView().addDependent(oDialog);
						// oDialog.setModel(oView.getModel());
						return oDialog;
					}.bind(this));
				}
			}
			this.Dialog.then(function (oDialog) {
				this.bindingSmartform(oEvent,sMode);
				oDialog.open();
			}.bind(this));
		},

		onDialogClose: function () {
			Messaging.removeAllMessages();
			this._oDataModel.resetChanges();
			this._oDataModel.refresh(true);
			this.byId("idDialog").close();
		},

		onDialogConfirm: function () {
			//写确认之后的业务逻辑
			this.onSave();
		},

		async bindingSmartform (oEvent,sMode) {
			let iRecordSequence = await this.getNewRecordSequence();

			let oContext;
			this._oDataModel.setDeferredGroups(["changes","group1"]);
			if (sMode === "create") {
				oContext = this.createEntryWithPromise("/PriceDifference",
				{
					RecordSequence: iRecordSequence.toString(),
					OrderNumber: "123123",
					CompanyCode:"30JT",
					PaySbu:"MF",
					TransCode:"001",
					InvoiceDate: new Date(),
					Quantity:"10",
					Unit:"PC",
					PriceDiff: "12",
					Amount:"250",
					Currency:"JPY",
					DisclosureDivision:"232",
					Abr:"20"

				});
				this.byId("idSmartForm").setBindingContext(oContext);
			} else if (sMode === "change") {
				let oRecord = oEvent.getSource().getBindingContext().getObject();
				let sPath = this._oDataModel.createKey("/PriceDifference",{RecordSequence:oRecord.RecordSequence});
				this._oDataModel.setDeferredGroups(["changes","group1"]);
				this.byId("idSmartForm").bindElement(sPath);
			}
			
		},

		//实际没有使用promise
		createEntryWithPromise: function (sPath, line) {
			// let oContext = {};
			// let promise = new Promise(function (resolve, reject) {
			var mParameters = {
				groupId: "group1",
				properties: line,
				// inactive: true,
				success: function (oData) {
					this.addMessages("S", this._ResourceBundle.getText("msg01"));
					this._BusyDialog.close();
					this.byId("idDialog").close();
				}.bind(this),
				error: function (oError) {
					messages.showError(messages.parseErrors(oError));
					this._BusyDialog.close();
				}.bind(this),
			};
			var oContext = this._oDataModel.createEntry(sPath, mParameters);
			// }.bind(this));
			return oContext;
		},

		onSave: function () {
			var that = this;
			Messaging.removeAllMessages();
			this.byId("idSmartForm").check();

			if (this.isExistError()) {
				return
			}
			this._BusyDialog.open();
			this._oDataModel.submitChanges({ 
				// groupId: "group1",
				success:function() {
					that._BusyDialog.close();
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
				// groupId: "myId",//如果设置groupid，会多条一起进入action
				changeSetId: 1,
				//建议只传输前端修改的参数，其他字段从后端获取
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
					// this.getModel().refresh();
				}.bind(this),
				error: function (oError) {
					// if (sAction !== "deletePR") { // ADD BY XINLEI XU 2025/04/22 CR#4359
					// 	this._LocalData.setProperty("/recordCheckSuccessed", false);
					// }
					messages.showError(messages.parseErrors(oError));
					this._BusyDialog.close();
					// this.getModel().refresh();
				}.bind(this)
			});
			// oModel.submitChanges({ groupId: "myId" });
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
					processor: this.getView().getModel(this.sModelName) //对应的Model
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
					iQuantity = line.OrderQuantity;
					sQuantityUnit = line.PurchaseOrderQuantityUnit;
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
					// PostingDate: line.DocumentDate,
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

		determination:function(sAction,postData) {
			let that = this;
			return new Promise(function(resolve,reject) {
				that._oDataModel.callFunction(`/${sAction}`, {
					method: "POST",
					// groupId: "myId",//如果设置groupid，会多条一起进入action
					changeSetId: 1,
					//建议只传输前端修改的参数，其他字段从后端获取
					urlParameters: {
						// Event: sEvent,
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
					// filters: aFilter,
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
			// 获取按钮的上下文
			var oButton = oEvent.getSource();

			// 获取按钮所在的表格（假设是 sap.ui.table.Table）
			var oTable = oButton.getParent();
			// 遍历父控件找到 SmartTable 控件
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
			// 确保找到了表格控件
			if (!oTable) {
				console.log("未找到表格控件");
				return;
			}

			// 获取选中的行索引
			var aSelectedIndices = oTable.getSelectedIndices();

			if (aSelectedIndices.length === 0) {
				messages.showError(this._ResourceBundle.getText("msgNoSelect"));//明細行を選択してください
				return [];
			}

			// 获取表格绑定的模型
			var oModel = oTable.getModel();

			// 存储选中的行数据
			var aSelectedData = [];

			// 遍历选中的行索引，获取行数据
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