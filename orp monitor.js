// ==UserScript==
// @name         orp monitor
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  batch monitor
// @author       yusen
// @match        http://cron.orp.baidu.com/cron/tasks?productId=1276&platform=orp&uuid=&productName=wallet-monitor&reqflag=1&taskId=&appId=&status=1&name=&runScript=&opName=v_wangyusen_dxm
// @match        http://cron.orp.baidu.com/cron/jobhistory
// @grant        none
// @require      https://cdn.bootcss.com/echarts/4.1.0.rc2/echarts.min.js
// ==/UserScript==

(function() {
    'use strict';

    // Your code here...
    var mainArr = [
        {'taskId':13108,'name':'【实时】新漏斗任务(2:10)', 'data':[]},
        {'taskId':13210,'name':'动态更新错误码(2:10)', 'data':[]},
        {'taskId':13301,'name':'【实时】同步前1天漏斗数据到palo(7:10)', 'data':[]},
        {'taskId':13211,'name':'银行通道数据统计(8:00)', 'data':[]},
        {'taskId':12938,'name':'7天前create埋点定时备份到palo(12:10)', 'data':[]},
        {'taskId':13202,'name':'7天前rcs埋点备份到palo(13:10)', 'data':[]},
        {'taskId':13203,'name':'7天前verify埋点备份到palo(14:10)', 'data':[]},
        {'taskId':13204,'name':'7天前sign埋点备份都palo(15:10)', 'data':[]},
        {'taskId':13205,'name':'7天前cardinfo埋点备份都palo(16:10)', 'data':[]},
        {'taskId':13206,'name':'7天前cardbind埋点备份都palo(17:10)', 'data':[]},
        {'taskId':13207,'name':'7天前pay埋点备份到palo(18:10)', 'data':[]},
    ];

    function return_date_list(){
        var date_obj = new Date();
        var re_arr = {};
        var date_item;
        if(re_arr.length != 0){
            return re_arr;
        }
        for(var i=0;i<33;i++){
            date_obj.setDate(date_obj.setDate()-i);
            date_item = (date_obj.getYear()+1900)+'-'+(date_obj.getMonth()+1)+'-'+date_obj.getDay();
            re_arr[date_item] = 0;
        }
        return re_arr;
    }
    function line_simple(data){
        var option = {
            title: {
                text: data[0].name
            },
            tooltip : {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross',
                    label: {
                        backgroundColor: '#6a7985'
                    }
                }
            },
            xAxis: {
                type: 'category',
                data: [],
            },
            yAxis: {
                type: 'value',
                position: 'right',
                name: '运行时间',
                axisLabel: {
                    formatter: '{value} s'
                }
            },
            series: []
        };
        var date_list;
        for(var o=0;o<data.length;o++){
            option['series'][o] = {
                data: [],
                type: 'line',
                name: '',
            };
            date_list = return_date_list();
            //console.log(date_list);
            for(var i=0,l=data[o]['data'].length; i < l; i++){
                //option['xAxis']['data'][i] = data[o]['data'][i][1].substr(0,10);
                //option['series'][o]['data'][i] = data[o]['data'][i][6];

                var date_orp = data[o]['data'][i][1].substr(0,10);
                var date_orp2 = data[o]['data'][i][2].substr(0,10);
                var num_orp = data[o]['data'][i][6];
                if(date_orp == ''){
                    if(date_orp2 == ''){
                        continue;
                    }else{
                        date_list[date_orp2] = NaN;
                    }
                }else{
                    if(date_orp2 == ''){
                        date_list[date_orp] = NaN;
                    }else{
                        date_list[date_orp2] = num_orp;
                    }
                }
            }
            for(var item in date_list){
                if(o==0)option['xAxis']['data'].push(item);
                option['series'][o]['data'].push(date_list[item]);
            }
            option['series'][o]['name'] = data[o]['name'];
            option['series'][o]['data'].reverse();
        }
        option['xAxis']['data'].reverse();
        //console.log(option,date_list);
        return option;
    };

    $('#taskSearForm').after('<div id="canvas_main" style="width:100%;height:auto;"></div>');
    var chart = [];
    for(var i=0;i<11;i++){
        $('#canvas_main').append('<div id="chart'+i+'" style="width:650px;height:300px;float:left;"></div>');
        chart[i] = echarts.init(document.getElementById('chart'+i));
    }

    var chart_data;
    $.each(mainArr,function(key,item){
        $.get('http://cron.orp.baidu.com/cron/jobhistory?taskId=' + item['taskId'] + '&productId=1276&platform=orp&reqflag=1&uuid=&productName=wallet-monitor')
            .success(function(doc){
            $(doc).find('table > tbody > tr').each(function(key2,item2){
                mainArr[key]['data'][key2] = [];
                $(item2).find('td').each(function(key3,item3){
                    mainArr[key]['data'][key2][key3] = $.trim(item3.innerText);
                });
                mainArr[key]['data'][key2][6] = (new Date(mainArr[key]['data'][key2][2]).getTime()-new Date(mainArr[key]['data'][key2][1]).getTime())/1000;
            });

            if(key < 11){
                chart_data = line_simple([mainArr[key]]);
                chart[key].setOption(chart_data);
                return false;
            }
            if(key == 5){
                chart_data = line_simple([mainArr[4],mainArr[5]]);
                chart[4].setOption(chart_data);
            }
            if(key == 10){
                chart_data = line_simple(mainArr.slice(6));
                chart[5].setOption(chart_data);
                //console.log(mainArr);
            }
        });

    });

})();

