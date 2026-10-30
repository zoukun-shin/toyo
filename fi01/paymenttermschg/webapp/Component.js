sap.ui.define([
    "sap/ui/core/UIComponent",
    "fi01/paymenttermschg/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("fi01.paymenttermschg.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // enable routing
            this.getRouter().initialize();

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // set the local model
            this.setModel(models.createLocalModel(), "local");
        }
    });
});