sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
	"sap/m/Dialog",
    "sap/ui/core/Messaging",
	"./messages"
], (Controller,
	Fragment,
	Dialog,
	Messaging,
	messages) => {
    "use strict";

    return Controller.extend("mm.acceptance.controller.Main", {
        onInit() {
            // this._LocalData = this.getOwnerComponent().getModel("local");
			this._oDataModel = this.getOwnerComponent().getModel();
			this._ResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			this._BusyDialog = new sap.m.BusyDialog();

            // set message model
			this.getView().setModel(Messaging.getMessageModel(), "message");

			// activate automatic message generation for complete view
			Messaging.registerObject(this.getView(), true);
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


        onInputDifference: function () {			
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
						name: "mm.acceptance.view.InputDifference",
						controller: this
					}).then(function (oDialog){
						this.getView().addDependent(oDialog);
						// oDialog.setModel(oView.getModel());
						return oDialog;
					}.bind(this));
				}
			}
			this.Dialog.then(function(oDialog) {
               this.bindingSmartform();
				oDialog.open();
			}.bind(this));
		},
		
          onDialogClose: function(){
          	this.byId("idDialog").close();
          },

          onDialogConfirm: function() {
          //写确认之后的业务逻辑
          },

		  bindingSmartform: function() {
			// var oTable = this.byId("reportTable1");
			// var oModel = oTable.getModel();

			// var aSelectedData = [];
			// var aSelectedIndices = oTable.getSelectedIndices();
			// // 遍历选中的行索引，获取行数据
			// aSelectedIndices.forEach(function (iIndex) {
			// 	var oContext = oTable.getContextByIndex(iIndex);
			// 	var oRowData = oModel.getProperty(oContext.getPath());
			// 	var oCopyRowData = JSON.parse(JSON.stringify(oRowData));
			// 	aSelectedData.push(oCopyRowData);
			// });
			// let oSelectedRecord = aSelectedData[0];


			this._oDataModel.setDeferredGroups(["group1"]);
			var oHeadContext = this.createEntryWithPromise("/PriceDifference", 
				{ 
					OrderNo:"123123",
					OrderNoItem:"12",
					// PurchaseOrder: oSelectedRecord.PurchaseOrder,
					// PurchaseOrderItem: oSelectedRecord.PurchaseOrderItem,
					// Material: oSelectedRecord.Material,
				});
			this.byId("idSmartForm").setBindingContext(oHeadContext);
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
					resolve(oData);
				}.bind(this),
				error: function (oError) {
					reject(oError);
				}.bind(this),
			};
			var oContext = this._oDataModel.createEntry(sPath, mParameters);
			// }.bind(this));
			return oContext;
		},

        onSave:function(){
            this.byId("idSmartForm").check();

            if (this.isExistError()){
                return
            }
            this._oDataModel.submitChanges({groupId: "group1"});

        },
        

        isExistError: function () {
            let oMessageModel = Messaging.getMessageModel();
            if ( oMessageModel.getData().length > 0 ) {
                return true;
            }
            return false;
        }

    });
});