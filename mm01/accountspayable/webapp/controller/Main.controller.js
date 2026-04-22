sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "./messages",
    "sap/ui/model/Filter",
    "../model/formatter",
], (Controller,messages,Filter,formatter) => {
    "use strict";

    return Controller.extend("mm.accountspayable.controller.Main", {
        formatter: formatter,
        onInit() {
        },
        onBeforeRebindTable: function (oEvent) {
			var oFilter = oEvent.getParameter("bindingParams").filters;
			var oNewFilter, aNewFilter = [];
			if (this.byId("idDateRangeSelection").getValue() !== "") {
				var dPerioFrom = this.byId("idDateRangeSelection").getDateValue();
				var dPerioTo = this.byId("idDateRangeSelection").getSecondDateValue();
				aNewFilter.push(new Filter("PostingDateYM", "BT", formatter.dateFormatter(dPerioFrom, "yyyyMM"), formatter.dateFormatter(dPerioTo, "yyyyMM") )); 
			}
			
			oNewFilter = new Filter({
				filters:aNewFilter,
				and:true
			});
			if (aNewFilter.length > 0) {
				oFilter.push(oNewFilter);
			}
		},


    });
});