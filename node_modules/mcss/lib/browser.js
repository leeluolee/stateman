// just for browser version package outport to dist/  folder
// =================================

var mcss = module.exports = require('./mcss.js');
mcss.env = 'BROWSER';

var options = global.mcssOptions || {};
var path = mcss.path;
var io = mcss.io;

var $ = function(selector){
    return mcss._.slice(document.querySelectorAll(selector));
}
var text = function(node){
    return node.innerText || node.contentText;
}
$('link[rel="stylesheet/mcss"], style[type="text/mcss"]').forEach(function(node){
    var nodename = node.nodeName.toLowerCase();
    var style = document.createElement('style');
    document.head.appendChild(style);
    if(nodename === 'link'){
        var filename = path.join(path.dirname(location.pathname), node.getAttribute('href'))
        io.get(filename).done(function(text){
            mcss({
                filename: filename
            }).translate(text).done(function(mcssContent){
                style.textContent = mcssContent;
            }).fail(function(error){
                mcss.error.format(error);
                console.error(error.message)
            })
        }).fail(function(error){
        })
    }else{
        var filename = location.pathname;
        mcss({
            filename: filename
        }).translate(text(node)).done(function(mcssContent){
            style.textContent = mcssContent;
        }).fail(function(error){
            mcss.error.format(error);
            console.error(error.message);
        })
    }
    document.head.removeChild(node);
})


