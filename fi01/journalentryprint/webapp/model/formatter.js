sap.ui.define([
    "sap/ui/core/format/DateFormat"
], function (DateFormat) {
    "use strict";
    return {
        // 此种方式其实没有考虑时区，就是用户选择什么输入什么数据库就保存什么
        // 当odata属性为Date类型时，在往后端传输日期字段时或change事件 先通过此函数转换可保证传输到后端的日期于前端（本地时间，用户选择的时间）一致，
        //主要针对odata v2 Edm.DateTime类型 且当时搭配smartfield 编辑日期字段的
        //前端UI绑定则需要搭配如下设置，将UTC设置为true（因为当前function会将时间设置成UTC时间，所以UTC转UTC时间不会变化，如果不设置，或者false则会转换成本地时间）
        //value="{path:'CurrPlannedGoodsIssueDate', type:'sap.ui.model.type.Date',formatOptions: {UTC: true} }"
        //或者使用sap.ui.model.odata.type.Date 则可以省略formatOptions: {UTC: true}， 因为odatatype 默认会转换成UTC且无法通过formatOptions设置为false，但odata.type.DateTime 不会自动换成UTC
        odataDate: function (v) {
            var odataDate = new Date(v);  //只能接收"/""-"","之类的符号间隔 在中文环境下，年月日的格式无法处理，所以要么在外部转换格式，要么直接传入日期格式
            if ( isNaN(odataDate.getTime()) ) {
                return "";
            }
            var oDateFormat = DateFormat.getDateTimeInstance({
                pattern: "yyyy-MM-dd"
            });
            var odataDateString = oDateFormat.format(odataDate, false);
            return new Date(odataDateString + "T00:00:00Z");
        }
    };
});
