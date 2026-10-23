sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/format/DateFormat",
    "sap/m/MessageBox",
    "./messages"
], (Controller, Filter, FilterOperator, DateFormat, MessageBox, messages) => {
    "use strict";

    // Filter operators of the SmartFilterBar mapped to ABAP range options.
    const RANGE_OPTIONS = {
        EQ: "EQ", NE: "EQ", BT: "BT", GE: "GE", GT: "GT", LE: "LE", LT: "LT"
    };

    return Controller.extend("co.techcenteralloc.controller.Main", {

        onInit() {
            this._ResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            // The fiscal year defaults to the current year on both tabs.
            this.byId("idResultFiscalYear").setDateValue(new Date());
            this.byId("idLogFiscalYear").setDateValue(new Date());
        },

        onBeforeRebindResult(oEvent) {
            this._pushYearAndPeriod(oEvent, "idResultFiscalYear", "idResultFiscalPeriod");
        },

        onBeforeRebindLog(oEvent) {
            this._pushYearAndPeriod(oEvent, "idLogFiscalYear", "idLogFiscalPeriod");
        },

        // Fiscal year and period are customControls, so their values are not part of
        // getFilters() and are added here. Both are mandatory: the calculation is done per
        // fiscal year and period.
        _pushYearAndPeriod(oEvent, sYearId, sPeriodId) {
            const oBindingParams = oEvent.getParameter("bindingParams");
            const sFiscalYear = this.byId(sYearId).getValue();
            if (!sFiscalYear) {
                messages.showError(this._ResourceBundle.getText("fiscalYearRequired"));
                oBindingParams.preventTableBind = true;
                return;
            }
            const sFiscalPeriod = this.byId(sPeriodId).getSelectedKey();
            if (!sFiscalPeriod) {
                messages.showError(this._ResourceBundle.getText("fiscalPeriodRequired"));
                oBindingParams.preventTableBind = true;
                return;
            }
            oBindingParams.filters.push(new Filter({
                filters: [
                    new Filter("FiscalYear", FilterOperator.EQ, sFiscalYear),
                    new Filter("FiscalPeriod", FilterOperator.EQ, sFiscalPeriod)
                ],
                and: true
            }));
        },

        onBeforeExport(oEvent) {
            const mExcelSettings = oEvent.getParameter("exportSettings");
            const sTitleKey = oEvent.getSource().getId().endsWith("idLogSmartTable") ? "logTableTitle" : "resultTableTitle";
            const oDateFormat = DateFormat.getDateInstance({ pattern: "yyyyMMdd" });
            const oTimeFormat = DateFormat.getTimeInstance({ pattern: "HHmmss" });
            const oNow = new Date();
            mExcelSettings.fileName = this._ResourceBundle.getText(sTitleKey) + "_" +
                oDateFormat.format(oNow) + oTimeFormat.format(oNow);
        },

        onPost() {
            this._confirmAndRun("POST", "confirmPost");
        },

        onCancel() {
            this._confirmAndRun("CANCEL", "confirmCancel");
        },

        _confirmAndRun(sEvent, sConfirmKey) {
            const oSelection = this._getSelection();
            if (!oSelection) {
                messages.showError(this._ResourceBundle.getText("selectionRequired"));
                return;
            }
            MessageBox.confirm(this._ResourceBundle.getText(sConfirmKey, [
                oSelection.companyCode, oSelection.fiscalYear, oSelection.fiscalPeriod
            ]), {
                styleClass: "sapUiSizeCompact",
                onClose: (sAction) => {
                    if (sAction === MessageBox.Action.OK) {
                        this._callProcessLogic(sEvent, oSelection);
                    }
                }
            });
        },

        // Company code, fiscal year, period and plant ranges of the result tab. The plants
        // are sent as ranges; the back end resolves them against the configured plants.
        _getSelection() {
            const aFilters = this.byId("idResultSmartFilterBar").getFilters();
            const aCompany = this._collectRanges(aFilters, "CompanyCode");
            const aPlants = this._collectRanges(aFilters, "Plant");
            const sFiscalYear = this.byId("idResultFiscalYear").getValue();
            const sFiscalPeriod = this.byId("idResultFiscalPeriod").getSelectedKey();
            if (aCompany.length !== 1 || !sFiscalYear || !sFiscalPeriod || aPlants.length === 0) {
                return null;
            }
            return {
                companyCode: aCompany[0].low,
                fiscalYear: sFiscalYear,
                fiscalPeriod: sFiscalPeriod,
                plants: aPlants
            };
        },

        _collectRanges(aFilters, sPath) {
            const aRanges = [];
            const fnWalk = (oFilter) => {
                if (!oFilter) {
                    return;
                }
                const aSubFilters = oFilter.getFilters && oFilter.getFilters();
                if (aSubFilters && aSubFilters.length) {
                    aSubFilters.forEach(fnWalk);
                    return;
                }
                if (oFilter.getPath && oFilter.getPath() === sPath) {
                    const oRange = this._toRange(oFilter);
                    if (oRange) {
                        aRanges.push(oRange);
                    }
                }
            };
            (aFilters || []).forEach(fnWalk);
            return aRanges;
        },

        _toRange(oFilter) {
            const sOperator = oFilter.getOperator();
            const sValue1 = oFilter.getValue1() === undefined || oFilter.getValue1() === null ? "" : String(oFilter.getValue1());
            const sValue2 = oFilter.getValue2() === undefined || oFilter.getValue2() === null ? "" : String(oFilter.getValue2());
            switch (sOperator) {
                case FilterOperator.Contains:
                    return { sign: "I", option: "CP", low: "*" + sValue1 + "*", high: "" };
                case FilterOperator.StartsWith:
                    return { sign: "I", option: "CP", low: sValue1 + "*", high: "" };
                case FilterOperator.EndsWith:
                    return { sign: "I", option: "CP", low: "*" + sValue1, high: "" };
                default:
                    if (!RANGE_OPTIONS[sOperator]) {
                        return null;
                    }
                    return {
                        sign: sOperator === FilterOperator.NE ? "E" : "I",
                        option: RANGE_OPTIONS[sOperator],
                        low: sValue1,
                        high: sOperator === FilterOperator.BT ? sValue2 : ""
                    };
            }
        },

        // processLogic action: the back end creates the task and submits the job, and
        // returns its messages as a JSON array of TYPE / MESSAGE.
        _callProcessLogic(sEvent, oSelection) {
            const oView = this.getView();
            oView.setBusy(true);
            oView.getModel().callFunction("/processLogic", {
                method: "POST",
                urlParameters: {
                    Event: sEvent,
                    JsonData: JSON.stringify(oSelection),
                    BatchParameter: ""
                },
                success: (oData) => {
                    oView.setBusy(false);
                    const oResult = oData.processLogic || oData;
                    this._showResult(oResult.JsonData);
                    this.byId("idResultSmartTable").rebindTable();
                },
                error: (oError) => {
                    oView.setBusy(false);
                    messages.showError(messages.parseErrors(oError));
                }
            });
        },

        _showResult(sJson) {
            let aMessages = [];
            try {
                aMessages = JSON.parse(sJson || "[]");
            } catch (e) {
                aMessages = [{ TYPE: "E", MESSAGE: String(sJson) }];
            }
            const sText = aMessages.map((oMessage) => oMessage.MESSAGE).join("\n");
            if (aMessages.some((oMessage) => oMessage.TYPE === "E")) {
                messages.showError(sText);
            } else {
                messages.showSuccess(sText || this._ResourceBundle.getText("processSubmitted"));
            }
        }
    });
});
