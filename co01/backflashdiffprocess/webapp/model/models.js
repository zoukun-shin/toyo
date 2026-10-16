sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], 
function (JSONModel, Device) {
    "use strict";

    return {
        /**
         * Provides runtime information for the device the UI5 app is running on as a JSONModel.
         * @returns {sap.ui.model.json.JSONModel} The device model.
         */
        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        },

        /**
         * Creates a JSONModel for state held on the view side.
         * In case line items are kept on the view side, setSizeLimit is raised so the
         * default limit of 100 entries does not truncate them.
         * @returns {sap.ui.model.json.JSONModel} The view-specific state model.
         */
        createLocalModel: function () {
            var oModel = new JSONModel({
                busy: false,
                hasUIChanges: false
            });
            oModel.setSizeLimit(9999);
            return oModel;
        }
    };

});