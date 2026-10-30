sap.ui.define([
	"sap/ui/core/mvc/Controller",
    "../model/formatter",
	"./messages",
    "sap/m/BusyDialog",
    "sap/ui/core/date/UI5Date",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, formatter, messages, BusyDialog, UI5Date, MessageBox, MessageToast, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("fi01.paymenttermschg.controller.Main", {
		formatter: formatter,

        onInit: function () {
			this._oDataModel = this.getOwnerComponent().getModel();
			this._ResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            this._BusyDialog = new BusyDialog();

            // 设置默认日期范围
            var oDateRangeSelection = this.byId("idDRPostingDate");
            // Get the current date
            var currentDate = new Date();
            // Calculate the first day of the previous month
            var firstDayOfPreviousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
            // Calculate the last day of the previous month
            var lastDayOfPreviousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
            oDateRangeSelection.setDateValue(firstDayOfPreviousMonth); // First day of the previous month
            oDateRangeSelection.setSecondDateValue(lastDayOfPreviousMonth); // Last day of the previous month
        },

        onSearch: function () {
            // Action后，清除前端缓存的数据
            var oBinding = this.byId("idTable").getBinding("rows");
            if (oBinding) {
                oBinding.getContexts().forEach(function(oContext){
                    oContext.getModel().setProperty(
                        oContext.getPath()+"/Status",
                        ""
                    );
                    oContext.getModel().setProperty(
                        oContext.getPath()+"/Message",
                        ""
                    );
                });
            }
        },

        onBeforeRebindTable: function (oEvent) {
            var oBinding = oEvent.getParameter("bindingParams");
            var aFilters = oBinding.filters;
            if (!aFilters) {
                aFilters = [];
            }

			var oDateRange = this.byId("idDRPostingDate");
			if (oDateRange.getFrom()) {
				var splitStart = `${oDateRange.getFrom().getFullYear()}${(oDateRange.getFrom().getMonth() + 1).toString().padStart(2, "0")}${oDateRange.getFrom().getDate().toString().padStart(2, "0")}`;
				var splitEnd = `${oDateRange.getTo().getFullYear()}${(oDateRange.getTo().getMonth() + 1).toString().padStart(2, "0")}${oDateRange.getTo().getDate().toString().padStart(2, "0")}`;
			}

			if (splitStart) {
				aFilters.push(new Filter("PostingDate", FilterOperator.BT, splitStart, splitEnd));
			}
        },

        onExecute: function () {
			this._processSelection("Execute", "msgExecuteConfirm");
        },

        onJobExecute: function () {
			this._processSelection("JobExecute", "msgJobExecuteConfirm");
        },

		_processSelection: function (sEvent, sConfirmMessageKey) {
			var aSelectedRows = this.getSelectedRows();

			if (aSelectedRows.length === 0) {
				messages.showError(this._ResourceBundle.getText("msgNoSelect"));
				return;
			}

			var that = this;
			MessageBox.confirm(this._ResourceBundle.getText(sConfirmMessageKey), {
				styleClass: "sapUiSizeCompact",
				onClose: function (sAction) {
					if (sAction === MessageBox.Action.OK) {
						that._callProcessLogic(sEvent, aSelectedRows);
					}
				}
			});
		},

		_callProcessLogic: function (sEvent, aSelectedRows) {
			var that = this;

			var aRequest = aSelectedRows.map(function (oRow) {
				return {
					CompanyCode: oRow.CompanyCode,
					AccountingDocument: oRow.AccountingDocument,
					FiscalYear: oRow.FiscalYear,
					AccountingDocumentItem: oRow.AccountingDocumentItem,
					Supplier: oRow.Supplier,
					DueDateChgBefore: oRow.DueDateChgBefore,
					PaymentMethodChgBefore: oRow.PaymentMethodChgBefore,
					PaymentTermsChgBefore: oRow.PaymentTermsChgBefore,
					DueDateChgAfter: oRow.DueDateChgAfter,
					PaymentMethodChgAfter: oRow.PaymentMethodChgAfter,
					PaymentTermsChgAfter: oRow.PaymentTermsChgAfter
				};
			});

			this._BusyDialog.open();
			this._oDataModel.callFunction("/processLogic", {
				method: "POST",
				changeSetId: 1,
				urlParameters: {
					Event: sEvent,
					JsonData: JSON.stringify(aRequest),
					BatchParameter: ""
				},
				success: function (oData) {
					that._BusyDialog.close();

					// If the service exposes the action as a FunctionImport,
					// the response is wrapped in the action name. Handle the unwrapped case as well.
					var oResult = oData && (oData.processLogic || oData);
					var sJsonData = oResult && oResult.JsonData;

					if (!sJsonData) {
						messages.showError(that._ResourceBundle.getText("msgNoResponse"));
						return;
					}

					try {
						JSON.parse(sJsonData).forEach(function (oLine) {
							that._updateRowLocal(oLine);
						});
					} catch {
						messages.showError(sJsonData);
						return;
					}
				},
				error: function (oError) {
					that._BusyDialog.close();
					messages.showError(messages.parseErrors(oError));
				}
			});
		},

		getSelectedRows: function () {
			var oTable = this.byId("idTable");
			var oModel = oTable.getModel();

			return oTable.getSelectedIndices().map(function (iIndex) {
				var oContext = oTable.getContextByIndex(iIndex);
				return oContext ? oModel.getProperty(oContext.getPath()) : null;
			}).filter(function (oRow) {
				return !!oRow;
			});
		},

		_updateRowLocal: function(oLineReturn){
            var oTable = this.byId("idTable");
            var oBinding = oTable.getBinding("rows");
            var aContexts = oBinding.getContexts();

            for(var i=0; i<aContexts.length; i++){
                var oCtx = aContexts[i];
                var oRowData = oCtx.getObject();
                // 主键匹配
                if(oRowData.CompanyCode === oLineReturn.COMPANYCODE
                    && oRowData.AccountingDocument === oLineReturn.ACCOUNTINGDOCUMENT
                    && oRowData.FiscalYear === oLineReturn.FISCALYEAR
                    && oRowData.AccountingDocumentItem === oLineReturn.ACCOUNTINGDOCUMENTITEM
                ){
                    // 原地赋值，表格单元格Status、Message自动刷新！
                    oCtx.getModel().setProperty(oCtx.getPath() + "/Status", oLineReturn.STATUS);
                    oCtx.getModel().setProperty(oCtx.getPath() + "/Message", oLineReturn.MESSAGE);
                    break;
                }
            }
        },

        onBeforeExport: function (oEvent) {
            var oExcelSettings = oEvent.getParameter("exportSettings");
            var columns = oExcelSettings.workbook.columns;
            columns.forEach(function (oColumn) {
                switch (oColumn.property) {
                    case "AmountInCompanyCodeCurrency": 
                        oColumn.type = sap.ui.export.EdmType.Number;
                        oColumn.textAlign = "End";
						oColumn.scale = 2;
					    oColumn.unitProperty="CompanyCodeCurrency";
                        break;
                    case "AccountingClerkFaxNumber": 
                        oColumn.type = sap.ui.export.EdmType.Number;
                        oColumn.textAlign = "End";
						oColumn.scale = 2;
                        break;
                    case "LastDate":
                    case "DueDateChgBefore":
                    case "DueDateChgAfter":
                        oColumn.type = sap.ui.export.EdmType.Date;
                        break;
                    default:
                        break;
                }
            });

            var sFileName = this._ResourceBundle.getText("appTitle");
            this._exportExcel(oExcelSettings, sFileName);
        },

        _exportExcel: function (mExcelSettings, sFileName) {
            var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyyMMdd" });
            var oTimeFormat = sap.ui.core.format.DateFormat.getTimeInstance({ pattern: "HHmmss" });
            mExcelSettings.fileName = sFileName + "_" + oDateFormat.format(new Date()) + oTimeFormat.format(new Date());
        }
    });
});