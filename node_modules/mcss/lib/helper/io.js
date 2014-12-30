var fs = require('fs');
var path = require('path');
var promise = require('./promise');
var Parser = require('../parser');

exports.get = function(path){
    var pr;

    if(/^http/.test(path) && fs){
        var request = require('../mcss.js').request;

        pr = promise();
        request(path,function(err, response, body){
            if(err) return pr.reject(err);
            if (!err && response.statusCode >=200 && response.statusCode < 400) {
                pr.resolve(body);
            }else{
                pr.reject('http request error with code: ' + response.statusCode)
            }
        })
        return pr;
    }else{
        if(fs){
            return file(path, 'utf8');
        }else{
            return http(path);
        }
    }

}



exports.parse = function(path, options){
    var p = promise();
    options.filename = path;
    exports.get(path).done(function(text){
        new Parser(options).parse(text).always(p);
    }).fail(p)
    return p;
}



var http = function(url){
    var p = promise();
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onreadystatechange = function(){
        if(xhr.readyState !== 4) return;
        var status = xhr.status;
        if((status >= 200 && status < 300)){
            p.resolve(xhr.responseText)
        }else{
            p.reject(xhr);
        }
    }
    xhr.send();
    return p;
}

var file = function(path){
    var p = promise();
    fs.readFile(path, 'utf8', function(error, content){
        if(error) return p.reject(error);
        p.resolve(content);
    })
    return p;
}

