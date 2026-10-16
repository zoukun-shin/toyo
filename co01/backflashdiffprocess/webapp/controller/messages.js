/**
 * Message handling
 **/
sap.ui.define([
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (MessageBox, MessageToast) {

    "use strict";

    return {

        // Extracts error messages from a DEEP interaction failure
        parseErrors: function (oError) {
            var messages = "",
                exceptions = [],
                i;
            try {
                var response = JSON.parse(oError.responseText);
                var errordetails = response.error.innererror.errordetails;
                for (i = 0; i < errordetails.length; i++) {
                    if (errordetails[i].target === "exceptions") {
                        exceptions = JSON.parse(errordetails[i].message).EXCEPTIONS;
                        break;
                    }
                }
                if (exceptions.length === 0) {
                    messages = messages + errordetails[errordetails.length - 1].message + "，\n";
                } else {
                    for (i = 0; i < exceptions.length; i++) {
                        messages += (exceptions[i].Message + "，\n");
                    }
                }
            } catch {
                messages = oError.statusCode + "：" + oError.statusText + "\n" + oError.message + "，\n";
            } finally {
                return messages.slice(0, messages.length - 2);
            }
        },

        // Error message box
        showError: function (sText) {
            MessageBox.error(sText, {
                styleClass: "sapUiSizeCompact"
            });
        },

        // Warning message box
        showWarning: function (sText) {
            MessageBox.warning(sText, {
                styleClass: "sapUiSizeCompact"
            });
        },

        // Success message box
        showSuccess: function (sText) {
            MessageBox.success(sText, {
                styleClass: "sapUiSizeCompact"
            });
        },

        // Information message box
        showInformation: function (sText) {
            MessageBox.information(sText, {
                styleClass: "sapUiSizeCompact"
            });
        },

        // Shows the message as a toast
        showText: function (sText) {
            MessageToast.show(sText, {
                width: (sText.length + 2) + "rem",
                my: sap.ui.core.Popup.Dock.CenterCenter,
                at: sap.ui.core.Popup.Dock.CenterCenter
            });
        },

        // Confirmation handling
        confirmAction: function (sTitle, sText, sChannelId, sEventId, oContext) {
            MessageBox.confirm(sText, {
                title: sTitle,
                icon: MessageBox.Icon.WARNING,
                styleClass: "sapUiSizeCompact",
                actions: [
                    MessageBox.Action.YES,
                    MessageBox.Action.NO
                ],
                onClose: function (sResult) {
                    oContext._result = sResult;
                    if (sResult === MessageBox.Action.YES) {
                        oContext.getOwnerComponent().getEventBus().publish(sChannelId, sEventId, oContext);
                    }
                }
            });
        }
    };
});
