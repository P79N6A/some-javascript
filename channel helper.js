// ==UserScript==
// @name         payChannels
// @namespace    http://tampermonkey.net/
// @version      0.8
// @description  在渠道决策中显示银行名称
// @author       You
// @match        http://channeldecision.sys.baidu.com/*
// @match        http://nmg01-hpc-nj-w0016.nmg01.baidu.com:8791/*
// @match        http://bjyz-dba-pay01.bjyz.baidu.com:8791/*
// @grant        none
// ==/UserScript==

'use strict';
var nowsite = window.location.href;
var payChannel_listpage = /\/cache\/payChannels/i;
var signChannels_listpage = /\/cache\/signChannels/i;
var Channels_addpage = /\/cache\/data\/(payChannels|signChannels)\/(insert|copy|modify)/i;
var shuntRatio_insert = /\/cache\/data\/shuntRatio\/insert/i;
var shuntRatio_modify = /\/cache\/data\/shuntRatio\/modify/i;
var shuntRatio_query = /\/cache\/(queryShuntRatio|shuntRatio)/i;
var errorColor = 'rgb(255, 87, 34)';
var DColor = '#8bc34a';
var CColor = '#fdf59a';

//==========列表页改造
if(payChannel_listpage.test(nowsite) || signChannels_listpage.test(nowsite)){
    var bank = bank_obj();
    var modefy_url;
    var copy_url;

    if(payChannel_listpage.test(nowsite)){
        modefy_url = '/cache/data/payChannels/modify?frontKey=3165&channelKey=&releaseKey=&switchKey=&id=';
        copy_url = '/cache/data/payChannels/copy?frontKey=3165&channelKey=&releaseKey=&switchKey=&id=';
    }else{
        modefy_url = '/cache/data/signChannels/modify?frontKey=3165&channelKey=&releaseKey=&switchKey=&id=';
        copy_url = '/cache/data/signChannels/copy?frontKey=3165&channelKey=&releaseKey=&switchKey=&id=';
    }

    var r_middle_2 = 'body > div.layout_content > div.layout_rightmain > div:nth-child(2)';
    var r_middle_3 = '#r_middle_3';
    $('body > div.layout_content > div.layout_rightmain > div.r-top').after('<div class="r-middle" id="r_middle_3">');

    //修改添加按钮为新打开页面
    $('body > div.layout_content > div.layout_rightmain > div:nth-child(1) > a')
        .attr('target','_blank')
        .removeAttr('onclick')
        .eq(0).attr('href','/cache/data/payChannels/insert?frontKey=&channelKey=EPCC0303&releaseKey=&switchKey=&id=-1');

    //遍历表格
    $('#store tbody tr').each(function(k,ele){
        var bankname = $(ele).find('td').eq(1).html();
        if(k==0){
            return;
        }
        //添加银行名称
        if('undefined' != typeof(bank[bankname])){
            $(ele).find('td').eq(1).html(bankname + ' <span style="color: #08c;">' + bank[bankname] + '</span>');
        }
        //修改链接为新窗口打开
        var alink = $(ele).find('td a');
        alink.removeAttr('onclick');
        alink.attr('target','_blank');
        alink.eq(0).attr('href',copy_url + $(ele).find('td').eq(0).html());
        alink.eq(1).attr('href',modefy_url + $(ele).find('td').eq(0).html());
        //添加贷记卡背景色
        /*
        var frontBankCode = $(ele).find('td').eq(2).html();
        var payType = $(ele).find('td').eq(6).html();
        if(payType == 'D' || payType == 'easypay_deposit'){
            $(ele).find('td').eq(6).css('background-color',DColor);
        }else
        if(payType == 'C' || payType == 'easypay_credit'){
            $(ele).find('td').eq(6).css('background-color',CColor);
        }
        */
    });

    //添加“求总数”按钮
    $(r_middle_3).append('<input type="submit" class="btn" value="求总数" id="getcount" style="margin-left: 10px;">');
    $('#getcount').click(function(){alert('总数为:' + ($('#store tbody tr:visible').length - 2));});
    //添加“检查”按钮
    $(r_middle_3).append('<input type="submit" class="btn" value="检查借贷标记" id="checkdata" style="margin-left: 5px;">');
    $('#checkdata').click(function(){
        var flag = false;
        $('#store tbody tr').each(function(k,ele){
            if(k==0)return;
            var frontBankCode = $(ele).find('td').eq(2).html();
            var payType = $(ele).find('td').eq(6).html();
            if(
                (frontBankCode > 4000 && frontBankCode < 5000 && (payType == 'C' || payType == 'easypay_credit'))
                ||
                (frontBankCode > 3000 && frontBankCode < 4000 &&(payType == 'D' || payType == 'easypay_deposit'))
            ){
                console.log('id:' + $(ele).find('td').eq(0).html() + ' 借贷标记错误');
                flag = true;
                $(ele).find('td').css('background-color',errorColor);
                return;
            }
        });
        if(flag){
            $('#store tbody tr').each(function(k,e){
                if($(e).find('td').eq(0).css('background-color')=='rgb(255, 87, 34)'){
                    $(e)[0].removeAttribute('style');
                }else{
                    if(k!=0)
                        $(e).css('display','none');
                }
            });
            alert('存在错误，请检查!');
        }
    });
    //添加“分流按钮”按钮
    $(r_middle_3).append('<input type="submit" class="btn" value="分流按钮" id="shuntRatio" style="margin-left: 5px;">');
    $('#shuntRatio').click(function(){
        $('#fPartnerId').show();
        $('#store tbody tr').each(function(k,ele){
            var frontBankCode = $(ele).find('td').eq(2).html();
            var channelCode = $(ele).find('td').eq(4).html();
            var releaseState_e = $(ele).find('td').eq(9);
            var releaseState;
            if(releaseState_e.html()=='生产'){
                //生产环境
                releaseState = 'R';
            }else{
                //预上线
                releaseState = 'P';
            }
            releaseState_e.append('<br>');
            releaseState_e.append('<a href="javascript:;" onclick="add_shuntRatio('+frontBankCode+', \''+channelCode+'=1\', \'P\', \''+releaseState+'\', $(\'#fPartnerId\').val());$(this).css(\'background-color\',\'#00ffee\');">Pay</a>');
            releaseState_e.append('<a href="javascript:;" onclick="add_shuntRatio('+frontBankCode+', \''+channelCode+'=1\', \'S\', \''+releaseState+'\', $(\'#fPartnerId\').val());$(this).css(\'background-color\',\'#00ffee\');">Sign</a>');
        });
    });

    //添加“商户号”下拉框
    $(r_middle_3).append('<select id="fPartnerId" style="margin-left: 5px;font-size: 16px;height: 35px;width: 150px;display:none;">'+
                         '<option value="1000178529" selected>1000178529</option>'+
                         '<option value="3400000001">3400000001</option>'+
                         '<option value="1000105356">1000105356</option>'+
                         '</select>');

    //添加hover下划线
    $("#store tr").hover(function(){
        $(this).css("border-bottom-color","#08c");
        $(this).css("border-bottom-style","solid");
    },function(){
        $(this)[0].removeAttribute("style");
    });
}
//==========新增页改造
if(Channels_addpage.test(nowsite)){
    $('#fFrontBankCode').css('width','300px');
    frontbank_list();
}


//渠道分流配置
if(shuntRatio_query.test(nowsite)){
    $('body > div.layout_content > div.layout_rightmain > div.r-top > div > div > table:nth-child(3) > tbody > tr:nth-child(1) > td:nth-child(3)').css('width','20%');
    $('.i-operate').attr('target','_blank').removeAttr('onclick');;
    frontbank_list();
}
if(shuntRatio_insert.test(nowsite) || shuntRatio_modify.test(nowsite)){
    frontbank_list();
    $('#fId').after('<input type="button" class="btn" value="签约" id="sign_config" style="margin-left:10px;"/>');
    $('#fId').after('<input type="button" class="btn" value="支付" id="pay_config" style="margin-left:10px;"/>');
    $('#fId').after('<span style="font-size: 30px;margin-left: 10px;">|</span>');
    $('#fId').after('<input type="button" class="btn" value="预发" id="online_private" style="margin-left:10px;"/>');
    $('#fId').after('<input type="button" class="btn" value="本番测试" id="online_test" style="margin-left:10px;"/>');
    var terminal = function(){
        $('#formDetail > table > tbody > tr:nth-child(4) > td:nth-child(2) > table')
            .find('input')
            .map(function(k, ele){
            $(ele).prop('checked', true);
            /*if(k < 5){
                $(ele).prop('checked', true);
            }else{
                $(ele).prop('checked', false);
            }*/
        });
    }
    //生产测试
    $('#online_test').click(function(){
        terminal();
        $('#fPartnerId').val(3400000001);
        $('#fTerminalVersion').val('.*');
        $('#fReleaseState').val('R');
        $('#fStatus').val('Y');
    });
    //预发
    $('#online_private').click(function(){
        terminal();
        $('#fPartnerId').val(3400000001);
        $('#fTerminalVersion').val('.*');
        $('#fReleaseState').val('P');
        $('#fStatus').val('Y');
    });
    //支付
    $('#pay_config').click(function(){
        $('#fShuntRuleType').val('P');
        $('#fShuntRuleType').change();
    });
    //签约
    $('#sign_config').click(function(){
        $('#fShuntRuleType').val('S');
        $('#fShuntRuleType').change();
    });
}


function frontbank_list(){
    $('#fFrontBankCode').after('<input type="text" id="frontbank_select" style="padding: 4px 2px;height: 30px;margin-left: 2px;vertical-align: top;" />');

    //添加select筛选
    var opts = $('#fFrontBankCode option').map(function () {
        return [[this.value, $(this).text()]];
    });
    $('#frontbank_select').keyup(function () {
        var rxp = new RegExp($('#frontbank_select').val(), 'i');
        var optlist = $('#fFrontBankCode').empty();
        opts.each(function () {
            if (rxp.test(this[1])) {
                optlist.append($('<option/>').attr('value', this[0]).text(this[1]));
            }
        });

    });
}

//返回银行对象
function bank_obj(){
    return {"QLBANK":"青隆银行","GDRCBANK":"广东农村信用社","JINZHOUBANK":"锦州银行","PINGAN":"平安银行","ABC":"农业银行","AHRCU":"安徽省农村信用社联合社","AIBANK":"百信银行","BALANCE":"余额","BDBANK":"保定银行","BHT":"百行通","BJRCB":"北京农商行","BOB":"北京银行","BOBBG":"广西北部湾银行","BOC":"中国银行","BOCD":"承德银行","BODD":"丹东银行","BODG":"东莞银行","BODL":"大连银行","BOFAX":"鞍山银行","BOFX":"阜新银行","BOGS":"甘肃银行","BOHLD":"葫芦岛市商业银行","BOLF":"廊坊银行","BOQZ":"泉州银行","BOS":"上海银行","BSB":"包商银行","CANGZHOUBANK":"沧州银行","CBHB":"渤海银行","CCAB":"长安银行","CCB":"建设银行","CDCCB":"成都银行","CDRCB":"成都农村商业银行","CEB":"光大银行","CGB":"广发银行","CGNB":"南充市商业银行","CIB":"兴业银行","CITIC":"中信银行","CJCCB":"江苏长江商业银行","CMB":"招商银行","CMBC":"民生银行","COMM":"交通银行","CQBANK":"重庆银行","CQRCB":"重庆农村商业银行","CRBANK":"珠海华润银行","CREDIT_PAY":"有钱支付","CSCB":"长沙银行","CSRCBANK":"常熟市农村商业银行","CZB":"浙商银行","CZCCB":"长治银行","CZXRHCBANK":"长子县融汇村镇银行","DIANXIN_PCARD":"电信手机充值卡","DIANXIN_SMS":"电信固话短信","DLRCB":"大连农商行农信银","DNA":"银行DNA支付","DRCBANK":"东莞农村商业银行","DYCCB":"德阳银行","DYGCCB":"东营银行","DZBANK":"德州银行","DZCCB":"达州市商业银行","FJHXBANK":"福建海峡银行","FJNX":"福建省农村信用社联合社","FTYZB":"深圳福田银座村镇银行","FUDIANCB":"富滇银行","FUSHUNBANK":"抚顺银行","GANZHOUBANK":"赣州银行","GDHXBANK":"广东华兴银行","GSRCU":"甘肃农村信用社","GUANGZHOUBANK":"广州银行","GUANGZHOURCB":"广州农村商业银行","GUILINBANK":"桂林银行","GUIYANGBANK":"贵阳银行","GUIZHOUBANK":"贵州银行","GXRCB":"广西壮族自治区农村信用社联合社","GZYZB":"江西赣州银座村镇银行","HANA":"韩亚银行","HANDANBANK":"邯郸银行","HARBINBANK":"哈尔滨银行","HEBEIBANK":"河北银行","HEBNX":"河北农村信用社","HENGSHUIBANK":"衡水银行","HFB":"恒丰银行","HKB":"汉口银行","HKBEA":"东亚银行","HLJRCU":"黑龙江农商行","HNNX":"海南农信","HNRCC":"湖南农村信用社","HNRCU":"河南省农村信用社","HRXJBANK":"华融湘江银行","HSBANK":"徽商银行","HUANANCRB":"华南农商行","HURCB":"湖北农信","HUZHOUBANK":"湖州银行","HXBANK":"华夏银行","HZCB":"杭州银行","ICBC":"工商银行","JCB":"JCB国际信用卡","JIANGSUBANK":"江苏银行","JIANGSURCB":"江苏农村信用社","JIANGXINXS":"江西省农村信用社","JIAXINGBANK":"嘉兴银行","JILINBANK":"吉林银行","JINCHENGBANK":"晋城银行","JINGZHOUBANK":"荆州银行","JINHUABANK":"金华银行","JININGBANK":"济宁银行","JINZHONGBANK":"晋中银行","JIUYOU_YXCARD":"久游游戏点卡","JJCCB":"九江银行","JLNLS":"吉林农信联合社","JNRCB":"江苏江南农村商业银行","JNYZB":"浙江景宁银座村镇银行","JRCB":"江苏江阴农村商业银行","JSHBANK":"晋商银行","JSRCU":"江苏农村商业银行","JUNWANG_YXCARD":"骏网游戏点卡","JXCB":"江西银行","JZBANK":"锦州银行","JZCTB":"焦作中旅银行","KLB":"昆仑银行","KSRB":"昆山农商银行","LHBANK":"漯河银行","LIANTONG_PCARD":"联通手机充值卡","LIANTONG_SMS":"联通固话短信","LIAOYANGBANK":"辽阳银行","LINSHANGBANK":"临商银行","LNRCC":"辽宁农信社农信银","LONGJIANGBANK":"龙江银行","LSBANK":"莱商银行","LSCB":"乐山市商业银行","LUOYANGBANK":"洛阳银行","LUZHOUCCBANK":"泸州市商业银行","LZBANK":"兰州银行","LZCCB":"柳州银行","MASTER":"MaterCard国际信用卡","MYCCB":"绵阳市商业银行","NANYUEBANK":"广东南粤银行","NBBANK":"宁波银行","NBTSBANK":"宁波通商银行","NEIMENGGUBANK":"内蒙古银行","NINGXIABANK":"宁夏银行","NJCB":"南京银行","NXYRRCB":"黄河农村商业银行","NYCBANK":"南阳村镇银行","ORDOSBANK":"鄂尔多斯银行","PAB":"平安银行","PANJINCCBANK":"盘锦市商业银行","PCARD":"手机卡充值","PDSB":"平顶山银行","PETTY_WITHOUT_PASSWORD":"小额免密支付","PSBC":"邮储银行","PZHCCB":"攀枝花市商业银行","QDCCB":"青岛银行","QHDBANK":"秦皇岛银行","QHRC":"青海省农村信用社","QILUBANK":"齐鲁银行","QINGHAIBANK":"青海银行","QISHANGBANK":"齐商银行","QIUSHANGBANK":"商丘银行","QIYZB":"重庆黔江银座村镇银行","QQ_YXCARD":"QQ游戏点卡","QYBANK":"企业银行","RAODURCB":"尧都区农村信用合作社联社","RIZHAOBANK":"日照银行","SCB":"渣打银行","SHANDONGRCC":"山东农村信用联合社","SHANGRAOBANK":"上饶银行","SHAOXINGBANK":"绍兴银行","SHENGDA_YXCARD":"盛大游戏点卡","SHINHANBANK":"新韩银行","SHRCB":"上海农商银行","SHUNDERCB":"顺德农商银行","SJBANK":"盛京银行","SMYZB":"浙江三门银座村镇银行","SOUHU_YXCARD":"搜狐游戏点卡","SPDB":"浦发银行","SRCB":"深圳农村商业银行","SRCU":"山西农信借记","SUZHOUBANK":"苏州银行","SXNXS":"陕西信合","SYYZB":"北京顺义银座村镇银行","SZSBANK":"石嘴山银行","TAIANBANK":"泰安银行","TAINONGCCB":"浙江泰隆商业银行","TAIZHOUBANK":"台州银行","TANGSHANBANK":"唐山银行","TCRCB":"太仓农村商业银行","TIANHONG_YXCARD":"天宏游戏点卡","TIANJINBANK":"天津银行","TIANXIA_YXCARD":"天下游戏点卡","TJBHB":"天津滨海农商行","TRC":"天津农村商业银行","UPOP":"银联","URB":"联合村镇银行","URUMQIBANK":"乌鲁木齐市商业银行","VISA":"VISA国际信用卡","WANGYI_YXCARD":"网易游戏点卡","WANMEI_YXCARD":"完美游戏点卡","WEIFANGBANK":"潍坊银行","WEIHAIBANK":"威海市商业银行","WHBANK":"外换银行（中国）有限公司","WHRCB":"武汉农商行","WJRCB":"吴江农村商业银行","WOORIBANK":"友利银行","WUHAIBANK":"乌海银行","WUJIANGRCB":"吴江银行","WXRCB":"江苏无锡农商行","WZCB":"温州银行","XIANCB":"西安银行","XINGTAIBANK":"邢台银行","XINHUIBANK":"大连开发区鑫汇村镇银行","XJRCCB":"新疆农村信用社","XMCCB":"厦门银行","YANTAIBANK":"烟台银行","YBYZB":"重庆渝北银座村镇银行","YCRXCZBANK":"榆次融信村镇银行","YICHANGCCB":"宜昌银行","YIDONG_PCARD":"移动手机充值卡","YIDONG_SMS":"移动固话短信","YINCHUANCCB":"银川银行","YINGKOUBANK":"营口银行","YINGKOUYHBANK":"营口沿海银行","YUNNANRCB":"云南省农村信用社","YZBANK":"鄞州银行","ZAOZHUANGBANK":"枣庄银行","ZGBANK":"自贡市商业银行","ZHEJIANGRCB":"浙江省农村信用社联合社","ZHENDTU_YXCARD":"征途游戏点卡","ZHENGZHOUCBANK":"郑州银行","ZJCZCBANK":"浙江稠州商业银行","ZJKCCB":"张家口银行","ZJMTCCB":"浙江民泰商业银行","ZONGYOU_YXCARD":"纵游游戏点卡","ZRCBANK":"张家港农商行","ZYBANK":"中原银行"};
}
console.log('添加分流信息  add_shuntRatio(1234, "ABC0303=1", "P", "R")');
//ajax添加分流信息
window.add_shuntRatio = function(fFrontBankCode, fShuntRatio, fShuntRuleType, fReleaseState, fPartnerId){
    console.log(fFrontBankCode, fShuntRatio, fShuntRuleType, fReleaseState, fPartnerId);

    /*参数：
    前端编码，分流配置，支付P|签约S，生产R|预上线P
    如：
    add_shuntRatio(4080, "EPCC0303=1", "P", "R")
    */
    //var fPartnerId = $('#fPartnerId').val();
    //验证
    var reg_fFrontBankCode = /^[1-9]\d{2,3}$/;
    var reg_fShuntRatio = /^[0-9A-Z]+=\d+$/;
    var reg_fShuntRuleType = /^P|S$/;
    var reg_fReleaseState = /^R|P$/;

    if (!reg_fFrontBankCode.test(fFrontBankCode)){
        console.log('前端编码error'); return;
    }
    if (!reg_fShuntRatio.test(fShuntRatio)) {
        console.log('分流配置error'); return;
    }
    if (!reg_fShuntRuleType.test(fShuntRuleType)) {
        console.log('支付还是签约error'); return;
    }
    if (!reg_fReleaseState.test(fReleaseState)) {
        console.log('配置环境error'); return;
    }

    //默认配置
    var fTerminal = "(0|1|2|3|4|5|6|7|8)";

    var timestamp = new Date();
    var strfStart = timestamp.toLocaleDateString().replace(/\//g, "-") + " " + timestamp.toTimeString().substr(0, 8);
    var strfEnd = (timestamp.getFullYear() + 1) + timestamp.toLocaleDateString().replace(/\//g, "-").match(/-\d+-\d+/)[0] + " " + timestamp.toTimeString().substr(0, 8);

    if (fReleaseState == 'P'&& fPartnerId==''){
        fPartnerId = "3400000001";
    }
    $.ajax({
        url: '/cache/update/shuntRatio/insert',
        method: 'POST',
        cache: false,
        contentType: 'application/json;charset=UTF-8',
        dataType: 'json',
        data: JSON.stringify({
            "fId": "",
            "fFrontBankCode": fFrontBankCode,
            "fShuntRuleType": fShuntRuleType,
            "fPartnerId": fPartnerId,
            "strfStart": strfStart,
            "strfEnd": strfEnd,
            "fShuntRatio": fShuntRatio,
            "fTerminal": fTerminal,
            "fReleaseState": fReleaseState,
            "fTerminalVersion": ".*",
            "fOperator": "wangyusen",
            "fStatus": "Y"
        }),
        error:function(data){
            alert(data.dest + ':' + data.result);
        },
        success: function (data){
            if(fShuntRuleType=='P'){
                fShuntRuleType = '支付';
            }else{
                fShuntRuleType = '签约';
            }
            if(fReleaseState=='P'){
                fReleaseState = '预发';
            }else{
                fReleaseState = '生产';
            }
            if(data.result == 'CND0000'){
                console.log('前端:',fFrontBankCode,' 通道:',fShuntRatio,' 环境:',fReleaseState,' 类型:',fShuntRuleType,' 商户号:',fPartnerId);
                return true;
            }else{
                console.log(data.dest + ':' + data.result);
                return false;
            }
        },
    });
}
window.del_shuntRatio = function(fID){
$.ajax({
    url: '/cache/update/shuntRatio/delete',
    method: 'POST',
    cache: false,
    contentType: 'application/json;charset=UTF-8',
    dataType: 'json',
    data: JSON.stringify({
        "fId": fID
    }),
    error:function(data){
        alert(data.dest + ':' + data.result);
    },
    success: function (data){
        console.log(fID,data);
    },
});
}