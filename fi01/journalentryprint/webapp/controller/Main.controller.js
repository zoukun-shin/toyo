sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/format/NumberFormat",
    "sap/m/BusyDialog",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Text",
    "sap/ui/core/format/DateFormat",
    "../model/formatter",
    "./messages",
    "../lib/xml-js",
    "../lib/pdf-lib.min"
], (Controller, Filter, FilterOperator, NumberFormat, BusyDialog, Dialog, Button, Text, DateFormat, formatter, messages) => {
    "use strict";

    // ADS のテンプレート（フォーム名/テンプレート名）
    const ADS_TEMPLATE = "FICO038/journalentryprint";
    // 1ページの明細行数（テンプレート journalentryprint.xdp の明細欄に合わせる）
    const ITEM_ROWS_PER_PAGE = 11;
    // ADS に1回で渡す仕訳件数。件数が多いと ADS がタイムアウトするので分割して作成し、最後に1つの PDF に結合する
    const ADS_BATCH_SIZE = 100;

    return Controller.extend("fi.journalentryprint.controller.Main", {
        formatter: formatter,

        onInit() {
            this._bSearched = false;
            // 仕訳番号クリック時の遷移先（S/4HANA Cloud の FLP）のホストを後端から取得しておく
            this._pS4Host = this._callPrintData("URL", []).catch(() => "");
            // 会計年度の初期値は当年（元帳の0LはCDSのdefaultValueで設定済み）
            this.byId("idFiscalYear").setDateValue(new Date());
        },

        // タブ切替は検索済みのときだけ再検索
        onTabSelect() {
            if (this._bSearched) {
                this.byId("idSmartFilterBar").search();
            }
        },

        onBeforeRebindTable(oEvent) {
            const oBindingParams = oEvent.getParameter("bindingParams");
            const aFilters = oBindingParams.filters;

            // customControl の値は getFilters() に入らないので手動で追加
            const sFiscalYear = this.byId("idFiscalYear").getValue();
            if (!sFiscalYear) {
                const oBundle = this.getView().getModel("i18n").getResourceBundle();
                messages.showError(oBundle.getText("fiscalYearRequired"));
                oBindingParams.preventTableBind = true;
                return;
            }
            aFilters.push(new Filter("FiscalYear", FilterOperator.EQ, sFiscalYear));

            const sFiscalPeriod = this.byId("idFiscalPeriod").getSelectedKey();
            if (sFiscalPeriod) {
                aFilters.push(new Filter("FiscalPeriod", FilterOperator.EQ, sFiscalPeriod));
            }

            const sPrintStatus = this.byId("idPrintStatus").getSelectedKey();
            if (sPrintStatus) {
                aFilters.push(new Filter("PrintStatus", FilterOperator.EQ, sPrintStatus));
            }

            this._pushDateRange(aFilters, "DocumentDate", this.byId("idDRDocumentDate"));
            this._pushDateRange(aFilters, "PostingDate", this.byId("idDRPostingDate"));

            const sTitleType = this.byId("idTitleTabBar").getSelectedKey();
            aFilters.push(new Filter("TitleType", FilterOperator.EQ, sTitleType));
            this._bSearched = true;
        },

        // 只选了一个日期时 getSecondDateValue() 为 null，按同一天处理
        _pushDateRange(aFilters, sPath, oDateRange) {
            const oFrom = oDateRange.getDateValue();
            if (oFrom) {
                const oTo = oDateRange.getSecondDateValue() || oFrom;
                aFilters.push(new Filter(sPath, FilterOperator.BT, formatter.odataDate(oFrom), formatter.odataDate(oTo)));
            }
        },


        // Excel 出力：反対仕訳済は画面と同じ「はい／いいえ」で出す（未指定だと true/false）
        onBeforeExport(oEvent) {
            const oBundle = this.getView().getModel("i18n").getResourceBundle();
            const mExcelSettings = oEvent.getParameter("exportSettings");

            // ファイル名：タイトル_yyyyMMddHHmmss
            const oNow = new Date();
            mExcelSettings.fileName = oBundle.getText("title") + "_" +
                DateFormat.getDateInstance({ pattern: "yyyyMMdd" }).format(oNow) +
                DateFormat.getTimeInstance({ pattern: "HHmmss" }).format(oNow);

            const aColumns = mExcelSettings.workbook.columns;
            aColumns.forEach((oColumn) => {
                if (oColumn.property === "IsReversed") {
                    oColumn.type = "Boolean";
                    oColumn.trueValue = oBundle.getText("yes");
                    oColumn.falseValue = oBundle.getText("no");
                }
            });
        },

        // 1.3 仕訳番号クリックで F0717A の明細画面を新しいタブで開く
        onDocumentPress(oEvent) {
            const oRow = oEvent.getSource().getBindingContext().getObject();
            const sHash = "#AccountingDocument-manageV2&/C_ManageJournalEntryTP(" +
                "CompanyCode='" + encodeURIComponent(oRow.CompanyCode) + "'," +
                "FiscalYear='" + encodeURIComponent(oRow.FiscalYear) + "'," +
                "AccountingDocument='" + encodeURIComponent(oRow.AccountingDocument) + "')/";
            // 画面は BTP の launchpad 上で動くので、F0717A は S/4HANA Cloud 側の FLP で開く
            // ポップアップブロック回避のため、クリック時点でタブを開いてから URL を入れる
            const oWindow = window.open("", "_blank");
            this._pS4Host.then((sHost) => {
                const sBase = sHost
                    ? "https://" + sHost.replace(/^https?:\/\//, "").replace("-api.", ".").replace(/\/$/, "") + "/ui"
                    : window.location.href.split("#")[0];
                if (oWindow) {
                    oWindow.location.href = sBase + sHash;
                } else {
                    window.open(sBase + sHash, "_blank");
                }
            });
        },

        onPrint() {
            const oBundle = this.getView().getModel("i18n").getResourceBundle();
            const oTable = this.byId("idJournalEntryTable");
            const aIndices = oTable.getSelectedIndices();
            if (aIndices.length === 0) {
                messages.showWarning(oBundle.getText("noSelection"));
                return;
            }

            if (!this._oPrintBusy) {
                this._oPrintBusy = new BusyDialog({ title: oBundle.getText("print") });
                this.getView().addDependent(this._oPrintBusy);
            }
            this._oPrintBusy.setText(oBundle.getText("printLoading"));
            this._oPrintBusy.open();

            this._getSelectedRows(oTable, aIndices)
                .then((aRows) => this._printInBatches(aRows))
                .then((oResult) => {
                    this._oPrintBusy.close();
                    // 印刷ステータスの再表示は PDF 表示より先に（表示で失敗しても状態は最新にする）
                    oTable.clearSelection();
                    this.byId("idSmartTable").rebindTable();
                    if (oResult.pdf) {
                        this._openPdfViewer(oResult.pdf);
                    }
                    if (oResult.error) {
                        // 途中で失敗：成功した分だけ PDF 表示・印刷済みにして、失敗理由を出す
                        messages.showError(oBundle.getText("printPartial", [oResult.done, oResult.total]) +
                            "\n" + oResult.error);
                    } else {
                        messages.showText(oBundle.getText("printDone", [oResult.done]));
                    }
                })
                .catch((vError) => {
                    this._oPrintBusy.close();
                    messages.showError(this._errorText(vError));
                });
        },

        // ADS_BATCH_SIZE 件ずつ「取数 → ADS → 印刷履歴更新」を順番に実行し、PDF を結合する
        async _printInBatches(aRows) {
            const oBundle = this.getView().getModel("i18n").getResourceBundle();
            // キー名は後端 ty_key の項目名に合わせる
            const aKeys = aRows.map((oRow) => ({
                companycode: oRow.CompanyCode,
                fiscalyear: oRow.FiscalYear,
                ledger: oRow.Ledger,
                accountingdocument: oRow.AccountingDocument
            }));
            const aPdfs = [];
            let iDone = 0;
            let sError = "";
            for (let i = 0; i < aKeys.length; i += ADS_BATCH_SIZE) {
                const aBatch = aKeys.slice(i, i + ADS_BATCH_SIZE);
                this._oPrintBusy.setText(oBundle.getText("printProgress", [iDone, aKeys.length]));
                try {
                    const sJson = await this._callPrintData("DATA", aBatch);
                    const aPages = this._buildPages(JSON.parse(sJson || "[]"));
                    const sXml = json2xml({ PrintData: { results: aPages } }, { compact: true, spaces: 0 });
                    aPdfs.push(await this._renderPdf(sXml));
                    await this._callPrintData("RECORD", aBatch);
                    iDone += aBatch.length;
                } catch (vError) {
                    sError = this._errorText(vError);
                    break;
                }
            }
            this._oPrintBusy.setText(oBundle.getText("printMerging"));
            const oPdf = aPdfs.length > 0 ? await this._mergePdfs(aPdfs) : null;
            return { pdf: oPdf, done: iDone, total: aKeys.length, error: sError };
        },

        // 各バッチの PDF（base64）を1つにまとめる
        async _mergePdfs(aPdfBase64) {
            if (aPdfBase64.length === 1) {
                return this._base64ToBytes(aPdfBase64[0]);
            }
            const oMerged = await PDFLib.PDFDocument.create();
            for (const sPdf of aPdfBase64) {
                const oDoc = await PDFLib.PDFDocument.load(this._base64ToBytes(sPdf), { ignoreEncryption: true });
                const aPages = await oMerged.copyPages(oDoc, oDoc.getPageIndices());
                aPages.forEach((oPage) => oMerged.addPage(oPage));
            }
            return oMerged.save();
        },

        _base64ToBytes(sBase64) {
            const sBinary = atob(sBase64);
            const aBytes = new Uint8Array(sBinary.length);
            for (let i = 0; i < sBinary.length; i++) {
                aBytes[i] = sBinary.charCodeAt(i);
            }
            return aBytes;
        },

        _errorText(vError) {
            const oBundle = this.getView().getModel("i18n").getResourceBundle();
            return (vError && vError.message) || vError || oBundle.getText("printFailed");
        },

        // 全選択時は未スクロールの行がまだ読み込まれていない（context が null）ので、
        // 選択範囲をまとめて読み込んでから行データを返す
        _getSelectedRows(oTable, aIndices) {
            const fnCollect = () => aIndices.map((iIndex) => oTable.getContextByIndex(iIndex));
            const aContexts = fnCollect();
            if (aContexts.every((oContext) => oContext)) {
                return Promise.resolve(aContexts.map((oContext) => oContext.getObject()));
            }
            const oBinding = oTable.getBinding("rows");
            const iLength = Math.max.apply(null, aIndices) + 1;
            return new Promise((resolve, reject) => {
                oBinding.attachEventOnce("dataReceived", () => {
                    const aLoaded = fnCollect();
                    if (aLoaded.every((oContext) => oContext)) {
                        resolve(aLoaded.map((oContext) => oContext.getObject()));
                    } else {
                        reject(this.getView().getModel("i18n").getResourceBundle().getText("printFailed"));
                    }
                });
                oBinding.getContexts(0, iLength, 0);
            });
        },

        // printData アクション（DATA:印刷データ取得 / RECORD:印刷履歴更新）
        _callPrintData(sEvent, aKeys) {
            return new Promise((resolve, reject) => {
                this.getView().getModel().callFunction("/printData", {
                    method: "POST",
                    urlParameters: {
                        Event: sEvent,
                        Zzkey: JSON.stringify(aKeys)
                    },
                    success: (oData) => {
                        const oResult = oData.printData || oData;
                        resolve(oResult.Zzkey);
                    },
                    error: (oError) => {
                        reject(messages.parseErrors(oError));
                    }
                });
            });
        },

        // 仕訳ごとに明細を ITEM_ROWS_PER_PAGE 行ずつページに分割し、各ページにヘッダを持たせる
        // （枚数/総数は仕訳単位でカウント）
        _buildPages(aPrint) {
            const aPages = [];
            aPrint.forEach((oDoc) => {
                const oHeader = this._mapHeader(oDoc);
                const aItems = (oDoc.items || []).map((oItem) => this._mapItem(oItem, oDoc));
                const iTotal = Math.max(1, Math.ceil(aItems.length / ITEM_ROWS_PER_PAGE));
                for (let i = 0; i < iTotal; i++) {
                    aPages.push(Object.assign({}, oHeader, {
                        PageNo: String(i + 1),
                        PageTotal: String(iTotal),
                        Items: aItems.slice(i * ITEM_ROWS_PER_PAGE, (i + 1) * ITEM_ROWS_PER_PAGE)
                    }));
                }
            });
            return aPages;
        },

        _mapHeader(oDoc) {
            const sCc = oDoc.companycodecurrency;
            const sTc = oDoc.transactioncurrency;
            return {
                CompanyCodeName: oDoc.companycodename || "",
                TitleText: "＊　＊　＊　" + (oDoc.titletext || "") + "　＊　＊　＊",
                PrintDateTime: oDoc.printdatetime || "",
                AccountingDocument: this._alphaOut(oDoc.accountingdocument),
                LedgerGroup: oDoc.ledgergroup || "",
                ReversedOriginalDocument: this._alphaOut(oDoc.reversedoriginaldocument),
                InvoiceNumber: oDoc.invoicenumber || "",
                IsReversed: (oDoc.isreversed === true || oDoc.isreversed === "X") ? "X" : "",
                ReverseDocument: this._alphaOut(oDoc.reversedocument),
                InvoiceRegistrationNumber: oDoc.invoiceregistrationnumber || "",
                FiscalPeriod: oDoc.fiscalperiod || "",
                PostingDate: this._formatDate(oDoc.postingdate),
                DocumentDate: this._formatDate(oDoc.documentdate),
                DocumentType: this._joinText(oDoc.accountingdocumenttype, oDoc.accountingdocumenttypename),
                TransactionCurrency: sTc || "",
                ExchangeRate: this._formatRate(Number(oDoc.exchangerate) || (sTc && sTc === sCc ? 1 : 0)),
                CreatedByUserName: oDoc.createdbyusername || "",
                CreationDate: this._formatDate(oDoc.creationdate),
                HeaderText: oDoc.accountingdocumentheadertext || "",
                DocumentReferenceID: oDoc.documentreferenceid || "",
                DebitTaxCode: this._joinText(oDoc.debittaxcode, oDoc.debittaxcodename, oDoc.debittaxcodemore ? "など" : ""),
                DebitTaxCc: this._formatAmount(oDoc.debittaxamountcc, sCc, true),
                DebitGrossCc: this._formatAmount(oDoc.debitgrossamountcc, sCc, true),
                DebitNetCc: this._formatAmount(oDoc.debitnetamountcc, sCc, true),
                DebitTaxTc: this._formatAmount(oDoc.debittaxamounttc, sTc, true),
                DebitGrossTc: this._formatAmount(oDoc.debitgrossamounttc, sTc, true),
                DebitNetTc: this._formatAmount(oDoc.debitnetamounttc, sTc, true),
                CreditTaxCode: this._joinText(oDoc.credittaxcode, oDoc.credittaxcodename, oDoc.credittaxcodemore ? "など" : ""),
                CreditTaxCc: this._formatAmount(oDoc.credittaxamountcc, sCc, true),
                CreditGrossCc: this._formatAmount(oDoc.creditgrossamountcc, sCc, true),
                CreditNetCc: this._formatAmount(oDoc.creditnetamountcc, sCc, true),
                CreditTaxTc: this._formatAmount(oDoc.credittaxamounttc, sTc, true),
                CreditGrossTc: this._formatAmount(oDoc.creditgrossamounttc, sTc, true),
                CreditNetTc: this._formatAmount(oDoc.creditnetamounttc, sTc, true)
            };
        },

        // 明細の外貨列は取引通貨＝会社コード通貨のとき空欄
        _mapItem(oItem, oDoc) {
            const sCc = oDoc.companycodecurrency;
            const sTc = oDoc.transactioncurrency;
            const bForeign = sTc && sTc !== sCc;
            return {
                LineItem: oItem.lineitem || "",
                GLAccount: this._joinText(this._alphaOut(oItem.glaccount), oItem.glaccountname),
                ItemText: oItem.documentitemtext || "",
                Project: oItem.project || "",
                CostCenter: this._joinText(this._alphaOut(oItem.costcenter), oItem.costcentername),
                BusinessPartner: this._joinText(this._alphaOut(oItem.businesspartner), oItem.businesspartnername),
                DebitCc: this._formatAmount(oItem.debitamountcc, sCc, false),
                DebitTc: bForeign ? this._formatAmount(oItem.debitamounttc, sTc, false) : "",
                CreditCc: this._formatAmount(oItem.creditamountcc, sCc, false),
                CreditTc: bForeign ? this._formatAmount(oItem.creditamounttc, sTc, false) : ""
            };
        },

        // 金額は「1,000 JPY」形式。明細のゼロは空欄、まとめ欄はゼロも表示
        _formatAmount(vAmount, sCurrency, bShowZero) {
            const fAmount = Number(vAmount || 0);
            if (!fAmount && !bShowZero) {
                return "";
            }
            if (!this._oCurrencyFormat) {
                this._oCurrencyFormat = NumberFormat.getCurrencyInstance({ showMeasure: false });
            }
            return this._oCurrencyFormat.format(fAmount, sCurrency) + " " + (sCurrency || "");
        },

        _formatRate(vRate) {
            if (vRate === undefined || vRate === null || vRate === "") {
                return "";
            }
            return NumberFormat.getFloatInstance({ minFractionDigits: 5, maxFractionDigits: 5, groupingEnabled: false })
                .format(Number(vRate));
        },

        // 後端の日付（YYYY-MM-DD / YYYYMMDD）→ YYYY/MM/DD
        _formatDate(sDate) {
            const s = String(sDate || "").replace(/\D/g, "");
            if (s.length !== 8 || Number(s) === 0) {
                return "";
            }
            return s.substring(0, 4) + "/" + s.substring(4, 6) + "/" + s.substring(6);
        },

        _alphaOut(sValue) {
            const s = String(sValue || "");
            return /^\d+$/.test(s) ? s.replace(/^0+(?=\d)/, "") : s;
        },

        _joinText(...aTexts) {
            return aTexts.filter((s) => s).join(" ");
        },

        // ADS で PDF を作成（参考：PP006 productionorderprint）
        _renderPdf(sXml) {
            const sBody = JSON.stringify({
                xdpTemplate: ADS_TEMPLATE,
                xmlData: btoa(unescape(encodeURIComponent('<?xml version="1.0" encoding="UTF-8"?><form>' + sXml + "</form>")))
            });
            const sUrl = sap.ui.require.toUrl("fi/journalentryprint") + "/ADS/v1/adsRender/pdf?templateSource=storageName";
            return fetch(sUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: sBody
            }).then((oResponse) => {
                if (!oResponse.ok) {
                    return oResponse.text().then((sText) =>
                        Promise.reject(sText || ("ADS: HTTP " + oResponse.status + " " + (oResponse.statusText || ""))));
                }
                return oResponse.json().then((oData) => oData.fileContent);
            });
        },

        // 件数に関係なく「PDF を開く／ダウンロード」で統一（ボタン押下で開くのでポップアップブロックされない）
        _openPdfViewer(aPdfBytes) {
            if (this._sPdfUrl) {
                URL.revokeObjectURL(this._sPdfUrl);
            }
            this._sPdfUrl = URL.createObjectURL(new Blob([aPdfBytes], { type: "application/pdf" }));
            this._openPdfDialog();
        },

        _openPdfDialog() {
            const oBundle = this.getView().getModel("i18n").getResourceBundle();
            if (!this._oPdfDialog) {
                this._oPdfDialog = new Dialog({
                    title: oBundle.getText("print"),
                    content: new Text({ text: oBundle.getText("pdfReady") }).addStyleClass("sapUiSmallMargin"),
                    beginButton: new Button({
                        text: oBundle.getText("pdfOpen"),
                        type: "Emphasized",
                        press: () => {
                            window.open(this._sPdfUrl, "_blank");
                            this._oPdfDialog.close();
                        }
                    }),
                    endButton: new Button({
                        text: oBundle.getText("pdfDownload"),
                        press: () => {
                            const oLink = document.createElement("a");
                            oLink.href = this._sPdfUrl;
                            oLink.download = "journalentryprint.pdf";
                            document.body.appendChild(oLink);
                            oLink.click();
                            document.body.removeChild(oLink);
                            this._oPdfDialog.close();
                        }
                    })
                });
                this.getView().addDependent(this._oPdfDialog);
            }
            this._oPdfDialog.open();
        }
    });
});
