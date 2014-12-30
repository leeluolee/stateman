// add line and exports style.map

var path = require('path');
module.exports = function(options){
    var sourceMap = require('./mcss').sourcemap;
    var options = options || {};
    var buffers = [];
    var mapper = {};
    var generator = (path && options.sourceMap)? new sourceMap.SourceMapGenerator({
        file: path.basename(options.dest)
    }): null;
    var lines = 1;
    var column = 0;
    var outport = '';
    var marked =null;

    return {
        add: function(content){
            if(options.sourceMap){
                var newline = (content.match(/\n/g) || '').length;
                lines += newline;
                var clen = content.length;
                if(newline){
                    column = clen - content.lastIndexOf('\n') - 1;
                }else{
                    column += clen;
                }
            }
            if(typeof marked === 'string') marked += content;
            outport += content;
        },
        addMap: function(map){
            if(options.sourceMap){
                generator.addMapping({
                    generated: {column: column, line: lines},
                    source: path.relative(path.dirname(options.dest), map.source),
                    original: {column: 1, line: map.line}
                });
            }
        },
        toString: function(){
            return outport;
        },
        getMap: function(){
            // browser
            if(!generator) return null;
            return generator.toString();
        },
        mark: function(){
            marked = '';
        },
        restore: function(){
            var res = marked
            marked = null;
            return res;
        }
    }
}