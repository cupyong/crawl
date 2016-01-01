/**
 * Created by zengzy on 2015/12/15.todo
 */

//teteasdasd
var crawler = require('crawler')
var URL = require('url');
var iconv =require('iconv-lite');
var cheerio = require('cheerio')
var fs = require('fs');

var c = new crawler({
    maxConnections : 100000,
    // This will be called for each crawled page
    callback : function (error, result, $) {
        // $ is Cheerio by default
        //a lean implementation of core jQuery designed specifically for the server
        $('a').each(function(index, a) {
            var toQueueUrl = $(a).attr('href');
            c.queue(toQueueUrl);
        });
    }
});


App=function(){
    var maxcompanyNum=1000;
    var compeleteHrurl=0;
    var existHrUrl=0;
    var companys=[];
    var server = this;
    var status=true
    var companyNum=0;

    this.crawlHtml = function(){
        status=true;
        compeleteHrurl=0;
        companyNum =0;
        existHrUrl=0;
        companys=[];
        c.queue([{
                uri: 'http://itjuzi.com/company',
                jQuery: true,
                // The global callback won't be called
                callback: function (error, result ,$) {
                    //console.log(result.body)
                    //console.log($(".follow_link"));
                    var maxPage=1;//最大页数
                    var maxUrl="";//最大页数
                    try{
                        $(".follow_link").each(function(index,page){
                            maxUrl = $(page).attr("href")
                        })
                        var p=URL.parse(maxUrl,true);
                        maxPage =parseInt(p.query.page);
                        console.log(p.query.page)
                        for(var i=0;i<maxPage;i++){
                            server.getSencodHtml("http://itjuzi.com/company?page="+i);
                        }
                    }catch(ex){

                    }

                }
            }]
        );
    }

    this.getSencodHtml = function(url){
        // console.log(url);
        c.queue([{
            uri: url,
            jQuery: true,
            // The global callback won't be called
            callback: function (error, result ,$) {
                try{

                        $(".company-list-item").each(function(index,div){
                            //console.log($(div).find('a').attr("href"))
                            server.getDetailCompany($(div).find('a').attr("href"))
                        })

                }catch(ex){

                }

            }
        }]);
    }

    this.getDetailCompany= function(url){
        if(status){
            c.queue([{
                uri: url,
                jQuery: true,
                // The global callback won't be called
                callback: function (error, result ,$) {
                    if(result&&result.body){
                        server.saveDetail(result.body);
                    }
                }
            }]);
        }
    }
    
    this.saveDetail=function(result){

        $=cheerio.load(result, {decodeEntities: false});
        var detail_info = $(".detail-info");
        var detail={};
        $(detail_info).find('li').each(function(index,li){
            // console.log($(li).html());
            if(($(li).html().indexOf("网址:")>-1)){
                if($(li).find('a').html()){
                    if($(li).find('a').html().indexOf("暂无")==-1){
                        detail.weisite=$(li).find('a').attr("href");
                    }
                }

            }
            if($(li).html().indexOf("公司:")>-1){
                detail.company=$(li).find('em').html();
            }
            if($(li).html().indexOf("时间:")>-1){
                detail.time=$(li).find('em').html();
            }
            if($(li).html().indexOf("状态:")>-1){
                detail.status=$(li).find('em').html();
            }
            if($(li).html().indexOf("阶段:  ")>-1){
                detail.period=$(li).find('a').html();
            }
            if($(li).html().indexOf("行业:")>-1){
                detail.industry=$(li).find('a').html();
            }
            if($(li).html().indexOf("子行业:")>-1){
                detail.industryChild=$(li).find('a').html();
            }
            if($(li).html().indexOf("简介:")>-1){
                detail.description=$(li).find('em').html();
            }
       })
        if(companys.length<maxcompanyNum){
            if(companys.length==maxcompanyNum-1){
                companys.push(detail);
                status=false;
                for(var i=0;i<companys.length;i++){
                    server.getHrUrl(companys[i],i);
                }
            }else{
                companys.push(detail);
            }
        }
    }
    //获取招聘页面url
    this.getHrUrl=function(detail,index){
      if(detail.weisite){
          c.queue([{
              uri: detail.weisite,
              jQuery: true,
              // The global callback won't be called
              callback: function (error, result ,$) {
                  compeleteHrurl++;
                  if(result&&result.body){
                     $=cheerio.load(result.body, {decodeEntities: false});
                      try{
                          $('a').each(function(index, a) {
                              if($(a).html().indexOf('人才')>-1)
                                  detail.hrUrl=$(a).attr("href");
                              if($(a).html().indexOf('招聘')>-1)
                                  detail.hrUrl=$(a).attr("href");
                          });
                          if( detail.hrUrl){
                              existHrUrl++;
                              console.log("index"+index);
                              companys[index]=detail;
                          }

                          console.log("compeleteHrurl"+compeleteHrurl);


                      }catch(ex){

                      }
                  }
                  if(compeleteHrurl==companys.length){
                      server.saveHtml();
                  }
               }
          }]);
      }else{
          compeleteHrurl++;
          console.log("compeleteHrurl"+compeleteHrurl);
          if(compeleteHrurl==companys.length){
              server.saveHtml();
          }
      }
    }

    this.saveHtml=function(){
        console.log("companys"+companys.length)
        var outputFilename = 'companies.json';
        companys.push({"existHrUrl":existHrUrl});

        fs.writeFile(outputFilename, JSON.stringify(companys), function(err) {
            if(err) {
                console.log(err);
            } else {
                console.log("JSON saved to " + outputFilename);
            }
        });
    }
}

exports.App = App;
