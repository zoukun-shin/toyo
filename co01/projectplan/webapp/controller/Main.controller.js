sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "./messages",
    "sap/ui/model/Filter",
    "../model/formatter",
	"sap/m/MessageToast",
], (Controller,messages,Filter,formatter,MessageToast) => {
    "use strict";

    return Controller.extend("co.projectplan.controller.Main", {
        formatter: formatter,
        onInit() {
        },
        onBeforeRebindTable: function (oEvent) {
			var oFilter = oEvent.getParameter("bindingParams").filters;
			var oNewFilter, aNewFilter = [];
			// if (this.byId("idDateRangeSelection").getValue() !== "") {
			// 	var dPerioFrom = this.byId("idDateRangeSelection").getDateValue();
			// 	var dPerioTo = this.byId("idDateRangeSelection").getSecondDateValue();
			// 	aNewFilter.push(new Filter("PostingDateYM", "BT", formatter.dateFormatter(dPerioFrom, "yyyyMM"), formatter.dateFormatter(dPerioTo, "yyyyMM") )); 
			// }
			
			oNewFilter = new Filter({
				filters:aNewFilter,
				and:true
			});
			if (aNewFilter.length > 0) {
				oFilter.push(oNewFilter);
			}
		},
        onExportCsv: function () {
			var oTable = this.byId("reportTable1");
			var oBinding = oTable && oTable.getBinding("rows");

			if (!oBinding) {
				MessageToast.show("No data to export");
				return;
			}

			var iLength = oBinding.getLength();
			if (!iLength || iLength < 1) {
				MessageToast.show("No data to export");
				return;
			}

			var aContexts = oBinding.getContexts(0, iLength);
			var aDataRows = [];

			aContexts.forEach(function (oContext) {
				var oRow = oContext.getObject();
				if (!oRow) {
					return;
				}

				var oBase = {
					CATEGORY: "PLN",
					RYEAR: oRow.FiscalYear || "",
					POPER: oRow.FiscalPeriod || "",
					RBURKS: oRow.CompanyCode || "",
					PS_PSPID: oRow.Project || "",
					PS_POSID: oRow.WbsElementInternalID || "",
					RACCT: oRow.RevenueAccount || "",
					HSL: oRow.NetAmount,
					RHCUR: oRow.CompanyCodeCurrency || "",
				};

				if (oBase.RACCT === "" && (oBase.HSL === undefined || oBase.HSL === null || oBase.HSL === "")) {
					return;
				}

				aDataRows.push({
					CATEGORY: oBase.CATEGORY,
					RYEAR: oBase.RYEAR,
					POPER: oBase.POPER,
					RBURKS: oBase.RBURKS,
					PS_PSPID: oBase.PS_PSPID,
					PS_POSID: oBase.PS_POSID,
					RACCT: oBase.RACCT,
					HSL: oBase.HSL,
					RHCUR: oBase.RHCUR,
				});
			});

			if (aDataRows.length === 0) {
				MessageToast.show("No data to export");
				return;
			}

			var aHeaders = ["CATEGORY", "RYEAR", "POPER", "RBURKS", "PS_PSPID", "PS_POSID", "RACCT", "HSL", "RHCUR"];
			var aHeaderJa = ["計画カテゴリ", "会計年度", "会計期間", "会社コード", "プロジェクト", "WBS 要素", "勘定コード", "会社コード金額", "会社コード通貨"];
			var aHeaderMarker = ["X", "X", "X", "X", "X", "", "", "", ""];
			var aCsvLines = [
				aHeaders.join(","),
				aHeaderJa.join(","),
				aHeaderMarker.join(","),
			];

			aDataRows.forEach(function (oCsvRow) {
				var aLine = aHeaders.map(function (sHeader) {
					return this._escapeCsvValue(oCsvRow[sHeader]);
				}.bind(this));
				aCsvLines.push(aLine.join(","));
			}.bind(this));

			this._downloadCsv(aCsvLines.join("\r\n"));
		},

		_escapeCsvValue: function (vValue) {
			if (vValue === undefined || vValue === null) {
				return "";
			}

			var sValue = String(vValue);
			if (sValue.includes("\"") || sValue.includes(",") || sValue.includes("\n") || sValue.includes("\r")) {
				return "\"" + sValue.replace(/\"/g, "\"\"") + "\"";
			}

			return sValue;
		},

		_downloadCsv: function (sContent) {
			var sTimestamp = new Date().toISOString().replace(/[\-:TZ.]/g, "").slice(0, 14);
			var sFileName = "projectplan_export_" + sTimestamp + ".csv";
			var oBlob = new Blob(["\uFEFF" + sContent], {
				type: "text/csv;charset=utf-8;",
			});

			var sUrl = URL.createObjectURL(oBlob);
			var oLink = document.createElement("a");
			oLink.href = sUrl;
			oLink.download = sFileName;
			document.body.appendChild(oLink);
			oLink.click();
			document.body.removeChild(oLink);
			URL.revokeObjectURL(sUrl);
		},
    });
});