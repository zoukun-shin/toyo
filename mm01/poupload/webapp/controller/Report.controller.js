/* global XLSX:true */
sap.ui.define([
    "./Base",
    "../model/formatter",
    "../lib/xlsx",
    "sap/m/BusyDialog",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/export/Spreadsheet",
    "sap/ui/core/Messaging",
    "./messages"
], function (Base, formatter, xlsx, BusyDialog, MessageBox, MessageToast, Spreadsheet, Messaging, messages) {
    "use strict";

    return Base.extend("mm.poupload.controller.Report", {

        formatter: formatter,

        onInit: function () {
            // this._LocalData = this.getOwnerComponent().getModel("local");
            this._oDataModel = this.getOwnerComponent().getModel();
            this._ResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            this._BusyDialog = new sap.m.BusyDialog();

            // set message model
            this.getView().setModel(Messaging.getMessageModel(), "message");

            // activate automatic message generation for complete view
            Messaging.registerObject(this.getView(), true);
        },

        _initialize: function () {

            var sLanguage = sap.ui.getCore().getConfiguration().getLanguage().substring(0, 2).toUpperCase();
            // var oFilter = new sap.ui.model.Filter("Object", sap.ui.model.FilterOperator.EQ, "ZUPLOAD_SO_" + sLanguage);
            // var oControlBinding = this.byId("idTemplateCollection").getBinding("items");
            // oControlBinding.filter(oFilter);

            this._BusyDialog = new BusyDialog();
            // this._UserInfo = sap.ushell.Container.getService("UserInfo");
            // var sUser = this._UserInfo.getFullName() === undefined ? "" : this._UserInfo.getFullName();
            // var sEmail = this._UserInfo.getEmail() === undefined ? "" : this._UserInfo.getEmail();
            // var oContextBinding = this.getModel("Authority").bindContext("/User(Mail='" + sEmail + "',IsActiveEntity=true)", undefined, {
            //     "$expand": "_AssignPlant,_AssignCompany,_AssignSalesOrg,_AssignPurchOrg,_AssignRole($expand=_UserRoleAccessBtn)"
            // });
            // oContextBinding.requestObject().then(function (context) {
            //     var aAccessBtns = [],
            //         aAllAccessBtns = [];
            //     if (context._AssignRole && context._AssignRole.length > 0) {
            //         context._AssignRole.forEach(role => {
            //             aAccessBtns.push(role._UserRoleAccessBtn);
            //         });
            //         aAllAccessBtns = aAccessBtns.flat();
            //     }
            //     if (!aAllAccessBtns.some(btn => btn.AccessId === "zsalesorderupdate-View")) {
            //         if (!this.oErrorMessageDialog) {
            //             this.oErrorMessageDialog = new sap.m.Dialog({
            //                 type: sap.m.DialogType.Message,
            //                 state: "Error",
            //                 content: new sap.m.Text({
            //                     text: this.getModel("i18n").getResourceBundle().getText("noAuthorityView", [sUser])
            //                 })
            //             });
            //         }
            //         this.getView().destroy();
            //         this.oErrorMessageDialog.open();
            //     }
            //     this.getModel("local").setProperty("/authorityCheck", {
            //         button: {
            //             View: aAllAccessBtns.some(btn => btn.AccessId === "zsalesorderupdate-View"),
            //         },
            //         data: {
            //             PlantSet: context._AssignPlant,
            //             CompanySet: context._AssignCompany,
            //             SalesOrgSet: context._AssignSalesOrg,
            //             PurchOrgSet: context._AssignPurchOrg,
            //             RoleSet: context._AssignRole
            //         }
            //     });
            // }.bind(this), function (oError) {
            //     if (!this.oErrorMessageDialog) {
            //         this.oErrorMessageDialog = new sap.m.Dialog({
            //             type: sap.m.DialogType.Message,
            //             state: "Error",
            //             content: new sap.m.Text({
            //                 text: this.getModel("i18n").getResourceBundle().getText("getAuthorityFailed")
            //             })
            //         });
            //     }
            //     this.getView().destroy();
            //     this.oErrorMessageDialog.open();
            // }.bind(this));
        },

        onFileChange: function (oEvent) {
            var aExcelSet = [];
            var oFile = oEvent.getParameter("files")[0];
            if (!oFile) {
                this.getModel("local").setProperty("/excelSet", []);
                this.getModel("local").setProperty("/logInfo", "");
                return;
            }
            var oReader = new FileReader();
            oReader.readAsArrayBuffer(oFile);
            this._BusyDialog.open();
            oReader.onload = function (e) {
                var oWorkBook = XLSX.read(e.target.result, {
                    type: "binary"
                });
                var oSheet = oWorkBook.Sheets[Object.getOwnPropertyNames(oWorkBook.Sheets)[0]];
                var aSheetData = XLSX.utils.sheet_to_row_object_array(oSheet);
                // read valid data starting from line 
                for (var i = 1; i < aSheetData.length; i++) {
                    var item = {
                        "Status": "",
                        "Message": "",
                        "Row": i - 1,
                        "HEADNO": aSheetData[i]["HEADNO"] === undefined ? "" : aSheetData[i]["HEADNO"],
                        "DOCUMENTTYPE": aSheetData[i]["DOCUMENTTYPE"] === undefined ? "" : aSheetData[i]["DOCUMENTTYPE"],
                        "SUPPLIER": aSheetData[i]["SUPPLIER"] === undefined ? "" : aSheetData[i]["SUPPLIER"],
                        "COMPANYCODE": aSheetData[i]["COMPANYCODE"] === undefined ? "" : aSheetData[i]["COMPANYCODE"],
                        "PURCHASEORGANIZATION": aSheetData[i]["PURCHASEORGANIZATION"] === undefined ? "" : aSheetData[i]["PURCHASEORGANIZATION"],
                        "PURCHASEGROUP": aSheetData[i]["PURCHASEGROUP"] === undefined ? "" : aSheetData[i]["PURCHASEGROUP"],
                        "SUPPLYINGPLANT": aSheetData[i]["SUPPLYINGPLANT"] === undefined ? "" : aSheetData[i]["SUPPLYINGPLANT"],
                        "DOCUMENTCURRENCY": aSheetData[i]["DOCUMENTCURRENCY"] === undefined ? "" : aSheetData[i]["DOCUMENTCURRENCY"],
                        "ITEMNO": aSheetData[i]["ITEMNO"] === undefined ? "" : aSheetData[i]["ITEMNO"],
                        "CATEGORY": aSheetData[i]["CATEGORY"] === undefined ? "" : aSheetData[i]["CATEGORY"],
                        "ITEMCATEGORY": aSheetData[i]["ITEMCATEGORY"] === undefined ? "" : aSheetData[i]["ITEMCATEGORY"],
                        "MATERIAL": aSheetData[i]["MATERIAL"] === undefined ? "" : aSheetData[i]["MATERIAL"],
                        "MATERIALTEXT": aSheetData[i]["MATERIALTEXT"] === undefined ? "" : aSheetData[i]["MATERIALTEXT"],
                        "MATERIALGROUP": aSheetData[i]["MATERIALGROUP"] === undefined ? "" : aSheetData[i]["MATERIALGROUP"],
                        "PLANT": aSheetData[i]["PLANT"] === undefined ? "" : aSheetData[i]["PLANT"],
                        "STORAGELOCATION": aSheetData[i]["STORAGELOCATION"] === undefined ? "" : aSheetData[i]["STORAGELOCATION"],
                        "DELIVERYDATE": aSheetData[i]["DELIVERYDATE"] === undefined ? "" : aSheetData[i]["DELIVERYDATE"],
                        "ORDERQUANTITY": aSheetData[i]["ORDERQUANTITY"] === undefined ? "" : aSheetData[i]["ORDERQUANTITY"],
                        "ORDERQUANTITYUNIT": aSheetData[i]["ORDERQUANTITYUNIT"] === undefined ? "" : aSheetData[i]["ORDERQUANTITYUNIT"],
                        "RETURNFLAG": aSheetData[i]["RETURNFLAG"] === undefined ? "" : aSheetData[i]["RETURNFLAG"],
                        "TAXCODE":aSheetData[i]["TAXCODE"] === undefined ? "" : aSheetData[i]["TAXCODE"],
                        "NETPRICEAMOUNT":aSheetData[i]["NETPRICEAMOUNT"] === undefined ? "" : aSheetData[i]["NETPRICEAMOUNT"],
                        "NETPRICEQUANTITY":aSheetData[i]["NETPRICEQUANTITY"] === undefined ? "" : aSheetData[i]["NETPRICEQUANTITY"],
                        "ORDERPRICEUNIT":aSheetData[i]["ORDERPRICEUNIT"] === undefined ? "" : aSheetData[i]["ORDERPRICEUNIT"],
                        "WBSELEMENT": aSheetData[i]["WBSELEMENT"] === undefined ? "" : aSheetData[i]["WBSELEMENT"],
                        "ACCOUNT": aSheetData[i]["ACCOUNT"] === undefined ? "" : aSheetData[i]["ACCOUNT"],
                        "S4CODUMENT": aSheetData[i]["S4CODUMENT"] === undefined ? "" : aSheetData[i]["S4CODUMENT"],
                        "S4DOCUMENTITEM": aSheetData[i]["S4DOCUMENTITEM"] === undefined ? "" : aSheetData[i]["S4DOCUMENTITEM"],
                        "REQUESTPAYLOAD": aSheetData[i]["REQUESTPAYLOAD"] === undefined ? "" : aSheetData[i]["REQUESTPAYLOAD"]
                    };
                    aExcelSet.push(item);
                }
                this.getModel("local").setProperty("/excelSet", aExcelSet);
                console.log("excelSet:", aExcelSet);
                console.log("model:", this.getModel("local").getProperty("/excelSet"));
                this.getModel("local").setProperty("/logInfo", this.getResourceBundle().getText("logInfo", [aExcelSet.length, 0, 0]));
                this.byId("idFileUploader").clear();
                this._BusyDialog.close();
            }.bind(this);
        },

        onClear: function () {
            this.getModel("local").setProperty("/excelSet", []);
            this.getModel("local").setProperty("/logInfo", "");
        },

        onCheck: function () {
            this._callOData("CHECK");
        },

        onExcute: function () {
            //this._callOData("EXCUTE");
            this._callOData("EXCUTE");
        },

        // onExport: function () {
        //     this._callOData("EXPORT");
        // },

        _callOData: function (bEvent) {
            var aPromise = [];
            var aExcelSet = this.getModel("local").getProperty("/excelSet");
            var aGroupKey = this.removeDuplicates(aExcelSet, ["HEADNO"]);
            var aGroupItems;
            for (var m = 0; m < aGroupKey.length; m++) {
                const sHEADNO = aGroupKey[m].HEADNO;
                aGroupItems = [];
                for (var n = 0; n < aExcelSet.length; n++) {
                    if (aExcelSet[n].HEADNO === sHEADNO) {
                        aGroupItems.push(aExcelSet[n]);
                    }
                }
                aPromise.push(this._callODataAction(bEvent, aGroupItems));
            }

            try {
                this._BusyDialog.open();
                Promise.all(aPromise).then((aContext) => {
                    var oResult = {
                        iSuccess: 0,
                        iFailed: 0
                    };
                    this._BusyDialog.close();
                    var aExcelSet = this.getModel("local").getProperty("/excelSet");

                    for (const oData of aContext) {

                        // 👇 强烈建议先打印一次确认结构
                        console.log("V2 return:", oData);

                        // 👇 根据实际结构取值（这里给你2种常见情况）
                        var sZzkey = oData.Zzkey || (oData.processLogic && oData.processLogic.Zzkey);

                        if (!sZzkey) {
                            MessageBox.error("No Zzkey returned from backend");
                            continue;
                        }

                        JSON.parse(sZzkey).forEach(element => {
                            for (var index = 0; index < aExcelSet.length; index++) {
                                if (aExcelSet[index].Row === element.ROW) {
                                    aExcelSet[index].Status = element.STATUS;
                                    aExcelSet[index].Message = element.MESSAGE;
                                    aExcelSet[index].S4CODUMENT = element.S4CODUMENT;
                                    aExcelSet[index].S4CODUMENT = element.S4DOCUMENTITEM;
                                }
                            }

                            if (element.STATUS === 'E') {
                                oResult.iFailed += 1;
                            } else {
                                oResult.iSuccess += 1;
                            }
                        });
                    };
                    this.getModel("local").setProperty("/excelSet", aExcelSet);
                    this.getModel("local").setProperty("/logInfo", this.getModel("i18n").getResourceBundle().getText("logInfo", [aExcelSet.length, oResult.iSuccess, oResult.iFailed]));
                    MessageToast.show(this.getModel("i18n").getResourceBundle().getText("ProcessingCompleted"));
                    if (bEvent === "EXCUTE") {
                        //this.onExport(); // Automatically export after execution
                    }
                }).catch((error) => {
                    MessageBox.error(error);
                }).finally(() => {
                    this._BusyDialog.close();
                });
            } catch (error) {
                MessageBox.error(error);
                this._BusyDialog.close();
            }
        },

        // _callODataAction: function (bEvent, aRequestData) {
        //     return new Promise((resolve, reject) => {
        //         var uploadProcess = this.getModel().bindContext("/POUpload/com.sap.gateway.srvd.zui_poupload_o4.v0001.processLogic(...)");
        //         uploadProcess.setParameter("Event", bEvent);
        //         uploadProcess.setParameter("Zzkey", JSON.stringify(aRequestData));
        //         uploadProcess.setParameter("RecordUUID", '');
        //         uploadProcess.execute("$auto", false, null, /*bReplaceWithRVC*/false).then(() => {
        //             resolve(uploadProcess);
        //         }).catch((error) => {
        //             reject(error);
        //         });
        //     });
        // },

        _callODataAction: function (bEvent, aRequestData) {
            return new Promise((resolve, reject) => {
                this.getModel().callFunction("/processLogic", {
                    method: "POST", // 一般是 POST
                    urlParameters: {
                        Event: bEvent,
                        Zzkey: JSON.stringify(aRequestData),
                        RecordUUID: ""
                    },
                    success: function (oData) {
                        resolve(oData);
                    },
                    error: function (oError) {
                        reject(oError);
                    }
                });
            });
        },
        onExport: function () {
            var aData = this.getView().getModel("local").getProperty("/excelSet");

            if (!aData || aData.length === 0) {
                sap.m.MessageToast.show("No data to export.");
                return;
            }

            var oI18n = this.getView().getModel("i18n");

            var aColumns = [
                { label: oI18n.getProperty("Status"), property: "Status" },
                { label: oI18n.getProperty("Message"), property: "Message" },
                { label: oI18n.getProperty("HEADNO"), property: "HEADNO" },
                { label: oI18n.getProperty("DOCUMENTTYPE"), property: "DOCUMENTTYPE" },
                { label: oI18n.getProperty("SUPPLIER"), property: "SUPPLIER" },
                { label: oI18n.getProperty("COMPANYCODE"), property: "COMPANYCODE" },
                { label: oI18n.getProperty("PURCHASEORGANIZATION"), property: "PURCHASEORGANIZATION" },
                { label: oI18n.getProperty("PURCHASEGROUP"), property: "PURCHASEGROUP" },
                { label: oI18n.getProperty("ITEMNO"), property: "ITEMNO" },
                { label: oI18n.getProperty("CATEGORY"), property: "CATEGORY" },
                { label: oI18n.getProperty("ITEMCATEGORY"), property: "ITEMCATEGORY" },
                { label: oI18n.getProperty("MATERIAL"), property: "MATERIAL" },
                { label: oI18n.getProperty("MATERIALTEXT"), property: "MATERIALTEXT" },
                { label: oI18n.getProperty("MATERIALGROUP"), property: "MATERIALGROUP" },
                { label: oI18n.getProperty("PLANT"), property: "PLANT" },
                { label: oI18n.getProperty("STORAGELOCATION"), property: "STORAGELOCATION" },
                { label: oI18n.getProperty("DELIVERYDATE"), property: "DELIVERYDATE" },
                { label: oI18n.getProperty("ORDERQUANTITY"), property: "ORDERQUANTITY" },
                { label: oI18n.getProperty("ORDERQUANTITYUNIT"), property: "ORDERQUANTITYUNIT" },
                { label: oI18n.getProperty("RETURNFLAG"), property: "RETURNFLAG" },
                { label: oI18n.getProperty("WBSELEMENT"), property: "WBSELEMENT" },
                { label: oI18n.getProperty("ACCOUNT"), property: "ACCOUNT" },
                { label: oI18n.getProperty("S4CODUMENT"), property: "S4CODUMENT" },
                { label: oI18n.getProperty("S4DOCUMENTITEM"), property: "S4DOCUMENTITEM" }
            ];

            var aTitle = oI18n.getProperty("appTitle");

            var oSettings = {
                workbook: {
                    columns: aColumns
                },
                dataSource: aData,
                fileName: aTitle + "_export.xlsx"
            };

            var oSheet = new sap.ui.export.Spreadsheet(oSettings);
            oSheet.build().finally(function () {
                oSheet.destroy();
            });
        }
    });
});
