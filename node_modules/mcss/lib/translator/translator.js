// the latest walker for output the translate css;
// add before an after event hook;

// @TODO: format === 3;

var Walker = require('../walker');
var tree = require('../node');
var error = require('../error');
var u = require('../helper/util');
var options = require('../helper/options');
var path = require('path');
var buffer = require('../buffer');


function Translator(options){
    this.options = options || {};
}

var _ = Translator.prototype = new Walker();


var walk = _.walk;

options.mixTo(_);

var formats = {
    COMMON: 1,
    COMPRESS: 2,
    ONELINE: 3
}

_.translate = function(ast){
    // this.sourcemap = sourcemap(this.options);
    this.ast = ast; 
    this.buffer = buffer(this.options);
    // 层级
    this.level = 0;
    this.indent = this.get('indent') || '\t';
    this.newline = (this.get('format') > 1)? '': '\n';
    this.walk_stylesheet(ast, true);

    // the buffer just concat the string, the diffrence is
    // buffer also compute the line and column for the sourcemap
    var text = this.buffer.toString();

    if(path && this.options.sourceMap && this.options.dest){ // detect if the browser env
        var base64 = new Buffer(this.buffer.getMap()).toString('base64');
        // text += '\n// #sourceMappingURL=data:application/json;base64,' + base64 + '';
        text += '/*@ sourceMappingURL= ' + path.basename(this.get('dest'), '.css') + '.css.map */'
        var sfilepath = this.get('dest') + '.map';
        u.writeFile(sfilepath, this.buffer.getMap(), function(err){
            if(err) console.error('sourcemap wirte fail');
            console.log(sfilepath + ' sourcemap generated')
        })
    }
    return text 
}

_.walk_stylesheet = function(ast, blank){
    this.walk_block(ast, blank);
}


_.walk_ruleset = function(ast){
    var buffer = this.buffer;
    var slist = ast.getSelectors(), 
        plist, parent = ast.parent;
        
    if(!slist || !slist.length) return false;
    while(parent){
        if(parent.getSelectors().length == 0) return false;
        parent = parent.parent;
    }
    if(typeof ast.lineno === 'number' && ast.filename){
        buffer.addMap({line: ast.lineno -1 , source: ast.filename})
    } 
    // if(ast.parent){
    //     var plist = ast.parent.getSelectors()
    //     if(plist){
    //         var selector = this._concatSelector(slist, plist);
    //         if(selector) ast.selector = selector;
    //     }
    // }
    if(!ast.block.list.length) return false;
    buffer.add(this.walk(ast.selector.list).join(','))
    this.walk(ast.block)
}

_.walk_selectorlist = function(ast){
    return this.walk(ast.list).join(','+this.newline);
}
_.walk_complexselector = function(ast){
    return ast.string;
}

_.walk_block = function(ast, blank){
    this.level++;
    var indent = this.indents();
    var buffer = this.buffer;
    var res = [];
    if(!blank) buffer.add('{')
    var list = ast.list;
    if(!blank) buffer.add(this.newline + indent);
    for(var i=0,len=list.length; i<len;i++){
        var item = this.walk(list[i]);
        // @TODO remote item
        if(item !== false){
            //@remove format 3
            if(list[i].type !== 'declaration'
                && this.has('format', 3) && item !== ''){
                buffer.add('\n');
            }
            if(i !== len-1 && item !== ''){
                buffer.add(this.newline + indent);
            }
            
        }
    }
    this.level--;
    if(!blank){
        buffer.add(this.newline +this.indents() + '}')
    }
}
_.walk_valueslist = function(ast){
    var text = this.walk(ast.list).join(',');
    return text;
}

_.walk_values = function(ast){
    var text = this.walk(ast.list).join(' ');
    text = text.replace(/ \/ /g, '/');
    return text;
}


_.walk_import = function(ast){
    var outport = ['@import ',this.walk_url(ast.url)]
    if(ast.queryList && ast.queryList.length){
        outport.push(this.walk(ast.queryList).join(','))
    }
    this.buffer.add(outport.join(' ') + ';')
}


_.walk_media = function(ast){
    var str = '@media ';
    str += this.walk(ast.queryList).join(',');
    this.buffer.add(str);
    this.walk_block(ast.block);
}

_.walk_mediaquery = function(ast){
    var outport = this.walk(ast.expressions);
    if(ast.mediaType) outport.unshift(ast.mediaType);
    return outport.join(' and ');
}

_.walk_mediaexpression = function(ast){
    var str = '';
    str += this.walk(ast.feature);
    if(ast.value) str += ': ' + this.walk(ast.value);
    return '(' + str + ')'
}
_.walk_keyframes = function(ast){
    var prefix = this.get('prefix'),
        buffer = this.buffer,
        store;
    // 好复制prefix
    // if(prefix && prefix.length && ast.fullname === 'keyframes') buffer.mark()
    var str = '@' + ast.fullname + ' ' + this.walk(ast.name);
    buffer.add(str);
    this.walk(ast.block);
    // if(store = buffer.restore()){
    //     for(var i =0 ; i < prefix.length ; i++){
    //         buffer.add('\n' + store.replace('@keyframes', '@-' + prefix[i] + '-keyframes'))
    //     }
    // }

}
var stepmap = {from: '0%', to: '100%'}
_.walk_keyframe = function(ast){
    var self = this;
    //@FIXIT ERROR should handle in interpret
    var steps = ast.steps.map(function(item){
        var step;
        if(item.type === 'TEXT') {
            step = stepmap[item.value.toLowerCase()]
            if(step) return step;
        }
        if(item.type === 'DIMENSION'){
            if(item.unit == '%') return tree.toStr(item); 
        }
        self.error('@keyframe step only accept [from | to | <percentage>]', item.lineno)
    })
    this.buffer.add(this.newline + this.indents() + steps.join(','));
    this.walk(ast.block);
}

_.walk_declaration = function(ast){
    var text = this.walk(ast.property);
    var value = this.walk(ast.value);
    var str = text + ':' + value + (ast.important? ' !important':'');
    this.buffer.add(str + ';');
}


_.walk_string = function(ast){
    return '"' + ast.value + '"';
}

_['walk_='] = function(ast){
    return '=';
}
_['walk_/'] = function(ast){
    return '/';
}


_.walk_unknown = function(ast){
    return ast.name;
}


_.walk_url = function(ast){
    return 'url("' + ast.value + '")';
}

_.walk_color = function(ast){
    return ast.toCSS();
}

_.walk_directive = function(ast){
    var str = '@' + ast.fullname + ' ';
    if(ast.value){
        str += this.walk(ast.value);
    }
    this.buffer.add(str);
    if(ast.block){
        this.walk(ast.block);
    }else{
        this.buffer.add(';');
    }
}

_.walk_call = function(ast){
    return ast.name + '(' +
        this.walk(ast.args).join(',') + ')';
}


_.walk_default = function(ast){
    if(!ast) return '';
    // u.error('no '+ ast.type + " walker founded");
    var str = tree.toStr(ast);
    if(typeof str !== 'string'){
        return ''
    }
    return str
}

_.error = function(msg, ll){
    var lineno = ll.lineno || ll;
    throw new error.McssError(msg, lineno, this.options)
}


_.indents = function(){
    if(this.get('format') > 1){
        return '';
    }else{
        return Array(this.level).join(this.indent);
    }
}

_._getSassDebugInfo = function(){
     return '@media -sass-debug-info'
}

// _._concatSelector = function(slist, plist){
//     if(!plist.length || !slist.length) return null;
//     var slen = slist.length,
//         plen = plist.length,
//         sstring, pstring, rstring,
//         s, p, res;
//     var res = new tree.SelectorList();
//     for(p = 0; p < plen; p ++){
//         pstring = plist[p].string;
//         for(s = 0; s < slen; s ++) {
//             sstring = slist[s].string;
//             if(~sstring.indexOf('&')){
//                 rstring = sstring.replace(/&/g, pstring)
//             }else if(~sstring.indexOf('%')){
//                 rstring = sstring.replace(/%/g, pstring.split(comboSplit)[1]||'');
//             }else{
//                 rstring = pstring + ' ' + sstring;
//             }
//             res.list.push(new tree.ComplexSelector(rstring));
//         }
//     }
//     return res;
// }









module.exports = Translator;
