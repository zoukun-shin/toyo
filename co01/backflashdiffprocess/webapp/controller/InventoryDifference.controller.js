sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"../model/formatter",
	"./messages",
	"sap/ui/core/Messaging",
	"sap/ui/core/message/Message",
	"sap/ui/core/message/MessageType",
	"sap/m/BusyDialog",
	"sap/m/MessageBox"
], function (
	Controller,
	formatter,
	messages,
	Messaging,
	Message,
	MessageType,
	BusyDialog,
	MessageBox
) {
	"use strict";

	// Event types of the processLogic action.
	// IMMEDIATE  : Posting button. Runs synchronously, so the user waits for completion.
	// BACKGROUND : Create Job button. Registers a background job and returns immediately.
	var EVENT_IMMEDIATE = "IMMEDIATE";
	var EVENT_BACKGROUND = "BACKGROUND";

	return Controller.extend("co.backflashdiffprocess.controller.InventoryDifference", {
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
		},

		/** Posting: runs synchronously. */
		onPosting: function () {
			this._processSelection(EVENT_IMMEDIATE, "msgPostingConfirm");
		},

		/** Create Job: registers a background job. Check its progress in batch monitoring. */
		onCreateJob: function () {
			this._processSelection(EVENT_BACKGROUND, "msgJobConfirm");
		},

		/** Validates the selected rows and filter conditions, then calls processLogic. */
		_processSelection: function (sEvent, sConfirmMessageKey) {
			// Drop the outcome of the previous run first, so the message popover only
			// ever shows the result of the action the user just triggered.
			Messaging.removeAllMessages();

			var aSelectedRows = this.getSelectedRows();

			if (aSelectedRows.length === 0) {
				messages.showError(this._ResourceBundle.getText("msgNoSelect"));
				return;
			}

			var oBatchParameter = this.getBatchParameter();
			if (!oBatchParameter) {
				return;
			}

			var that = this;
			MessageBox.confirm(this._ResourceBundle.getText(sConfirmMessageKey), {
				styleClass: "sapUiSizeCompact",
				onClose: function (sAction) {
					if (sAction === MessageBox.Action.OK) {
						that._callProcessLogic(sEvent, aSelectedRows, oBatchParameter);
					}
				}
			});
		},

		/**
		 * Calls processLogic.
		 *
		 * Messages are not standard OData errors but a JSON string in the JsonData of the
		 * response, where each entry is { TYPE: "S"|"E"|"W", MESSAGE: "..." }, so the
		 * success handler parses it and adds the entries to the message model itself.
		 */
		_callProcessLogic: function (sEvent, aSelectedRows, oBatchParameter) {
			var that = this;

			// The backend runs one chain per inventory document line, so every selected
			// row is sent as is - no collapsing by material. These three keys identify the
			// 701/702 line the chain belongs to. Rows without a document number are skipped.
			//
			// The document year is deliberately not sent: for every row of this report it
			// equals the fiscal year, which the backend takes from BatchParameter instead.
			var aRequest = aSelectedRows.map(function (oRow) {
				return {
					Material: oRow.Material,
					MaterialDocument: oRow.MaterialDocument,
					MaterialDocumentItem: oRow.MaterialDocumentItem
				};
			}).filter(function (oRow) {
				return !!oRow.MaterialDocument;
			});

			this._BusyDialog.open();
			this._oDataModel.callFunction("/processLogic", {
				method: "POST",
				changeSetId: 1,
				urlParameters: {
					Event: sEvent,
					JsonData: JSON.stringify(aRequest),
					BatchParameter: JSON.stringify(oBatchParameter)
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
							that.addMessages(oLine.TYPE, oLine.MESSAGE);
						});
					} catch {
						messages.showError(sJsonData);
						return;
					}

					// Posting runs synchronously, so the data (e.g. IsAllocated) has already changed.
					// Create Job only registers a job, so there is no need to re-read.
					if (sEvent === EVENT_IMMEDIATE) {
						that.byId("idInventorySmartTable").rebindTable();
					}
				},
				error: function (oError) {
					that._BusyDialog.close();
					messages.showError(messages.parseErrors(oError));
				}
			});
		},

		/**
		 * Builds BatchParameter from the filter conditions.
		 *
		 * PeriodStart / PeriodEnd are not sent. Deriving the posting date range from the
		 * fiscal period requires the company code's fiscal year variant (T001-PERIV), which
		 * cannot be determined reliably on the front end. The backend
		 * (zcl_proc_backflush_diff / initialize) calculates it; values sent here are overwritten.
		 *
		 * The fiscal year, fiscal period and company code filters are assumed to be
		 * single-value EQ. The backend converts the period into a PostingDate range only
		 * for single values, so the view sets filterType="single" explicitly.
		 */
		getBatchParameter: function () {
			var sCompanyCode = this.getFilterValue("CompanyCode");
			var sPlant = this.getFilterValue("Plant");
			var sFiscalYear = this.getFilterValue("FiscalYear");
			var sFiscalPeriod = this.getFilterValue("FiscalPeriod");

			if (!sCompanyCode || !sPlant || !sFiscalYear || !sFiscalPeriod) {
				messages.showError(this._ResourceBundle.getText("msgFilterRequired"));
				return null;
			}

			return {
				CompanyCode: sCompanyCode,
				Plant: sPlant,
				FiscalYear: sFiscalYear.padStart(4, "0"),
				FiscalPeriod: sFiscalPeriod.padStart(3, "0")
			};
		},

		/**
		 * Reads the technical value of a single SmartFilterBar field.
		 *
		 * The filter control itself must not be read: for fields with a value list it shows
		 * the display text (e.g. "Plant A (30KF)"), not the key. The filter data model always
		 * holds the key, so read it from getFilterData() instead.
		 */
		getFilterValue: function (sKey) {
			var oFilterBar = this.byId("idInventorySmartFilterBar");
			var vValue = oFilterBar.getFilterData()[sKey];

			// Defensive: an interval or multi-value field would come back as an object.
			if (Array.isArray(vValue)) {
				vValue = vValue.length > 0 ? vValue[0] : "";
			}
			if (vValue !== null && typeof vValue === "object") {
				vValue = vValue.low;
			}
			return vValue === null || vValue === undefined ? "" : String(vValue).trim();
		},

		/** Returns the selected rows, or an empty array if nothing is selected. */
		getSelectedRows: function () {
			var oTable = this.byId("inventoryDifferenceTable");
			var oModel = oTable.getModel();

			return oTable.getSelectedIndices().map(function (iIndex) {
				var oContext = oTable.getContextByIndex(iIndex);
				return oContext ? oModel.getProperty(oContext.getPath()) : null;
			}).filter(function (oRow) {
				return !!oRow;
			});
		},

		/** Adds the TYPE / MESSAGE returned in JsonData to the message model. */
		addMessages: function (sType, sMessage) {
			var sMessageType;
			switch (sType) {
				case "S":
					sMessageType = MessageType.Success; break;
				case "E":
					sMessageType = MessageType.Error; break;
				case "W":
					sMessageType = MessageType.Warning; break;
				default:
					sMessageType = MessageType.Information; break;
			}

			Messaging.addMessages(
				new Message({
					message: sMessage,
					type: sMessageType,
					processor: this.getView().getModel(this.sModelName)
				})
			);
		},

		onMessagePopoverPress: function (oEvent) {
			this._getMessagePopover().then(function (oMessagePopover) {
				oMessagePopover.openBy(oEvent.getSource());
			});
		},

		_getMessagePopover: function () {
			if (!this._pMessagePopover) {
				this._pMessagePopover = this.loadFragment({
					id: this.getView().getId(),
					name: "co.backflashdiffprocess.fragment.MessagePopover"
				});
			}
			return this._pMessagePopover;
		}
	});
});
