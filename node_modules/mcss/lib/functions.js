/**
 * @TODO: percent -> float number
 */
/**
 * cli
 */
var fs = require('fs');
var path = require('path');
var tree = require('./node');
var binop = require('./helper/binop');
var u = require('./helper/util');
var tk = require('./tokenizer');
var Color = tree.Color;





var _ = module.exports = {
    // Color:
    // -------------------------

    /**
     * rgba color
     * @param  {Dimension|Hash} r 
     * @param  {Dimension} g 
     * @param  {Dimension} b [description]
     * @param  {Dimension} a [description]
     * @return {color}
     */
    rgba: u.accept(function(r, g, b, a){
        if(arguments.length<2) this.error('param error')
        if(r.type === 'color'){
            return new Color(r, getAlpha(g));
        }else{
            return new Color([r.value, g.value, b.value], getAlpha(a));
        }
    },['DIMENSION color','DIMENSION','DIMENSION','DIMENSION']),
    rgb: function(){

        return _.rgba.apply(this, arguments);
    },
    /**
     * hsla color
     * @param  {Dimension} h 
     * @param  {Dimension} s 
     * @param  {Dimension} l [description]
     * @param  {Dimension} a [description]
     * @return {color}
     */
    hsla: u.accept(function(h, s, l, a){

        if(arguments.length < 3) this.error('hsla need at least 3 arguments got:' + arguments.length);
        if(s.unit !== '%' || l.unit !== '%') this.error('hsl param saturation and light all only accept percent');
        if(a && a.unit === '%') a.value /= 100; 
        var node = Color.hsl([h.value, s.value, l.value], a && a.value);
        return node;
    }, ['DIMENSION', 'DIMENSION', 'DIMENSION', 'DIMENSION']),

    hsl: function(){

        return _.hsla.apply(this, arguments);
    },

    // from less bug copyright is sass
    // Copyright (c) 2006-2009 Hampton Catlin, Nathan Weizenbaum, and Chris Eppstein
    // http://sass-lang.com
    //
    mix: u.accept( function(c1, c2, weight){
        if(weight && weight.unit !== '%') this.error('weight param must be a percent')
        var a = c1.alpha - c2.alpha,
            p = (weight && weight.value || 50) /100,
            w = p*2 -1,
            w1 = (((w * a == -1) ? w : (w + a) / (1 + w * a)) + 1) / 2.0,
            w2 = 1 - w1,
            alpha = c1.alpha * p + c2.alpha*(1-p),
            channels = [
                c1[0] * w1 + c2[0] * w2,
                c1[1] * w1 + c2[1] * w2,
                c1[2] * w1 + c2[2] * w2
            ];
        return new Color(channels, alpha, c1.lineno);
    }, ['color', 'color', 'DIMENSION']),

    /**
     * Other build in function
     * ============================
     */

    /**
     * define the variable, the diff from VAR definition is 
     * define function can define name that isnt 'VAR'(ex. 'hello')
     * @return {ANY} return the value be assign
     */
    define: u.accept( function(name, value, global){
        name = name.value;
        if(!name || !value) this.error('invalid passed param in define');
        var scope = tree.toBoolean(global)? this.globalScope : this.scope;
        scope.define(name, value);
    }, ['TEXT STRING']),

    apply: u.accept( function(func, args){
        if(!func) this.error('function "apply" atleast need one prams')
        if(!func.name) this.define('null', func)
        var call = tree.call(func.name || 'null', args && args.list||[])
        return this.walk(call);
    }, ['func', 'valueslist values']),

    /**
     * return node's type
     * @param  {Node} node 
     * @return {String}  nodeType
     */
    typeof: function(node){
        return node.type.toLowerCase();
    },
    /**
     * exec the js code
     * @param  {String} string the javascript expression
     * @return {Mix}      the exec expression's value  
     */
    js: u.accept( function(string){
        try{
            return eval('(' + string.value + ')');
        }catch(e){
            this.error(e.message);
        }
    }, ['STRING']),
    /**
     * join the list(values, valueslist)
     * @param  {Values, ValuesList} list      
     * @param  {STRING} separator default '-'
     * @return {TEXT}   then joined TEXT
     */
    join: u.accept(function(list, separator){
        separator = separator? separator.value : '-'
        return tree.token('TEXT', list.list.map(tree.toStr).join(separator), list.lineno);
    }, ['valueslist values', 'TEXT STRING']),

    /**
     * try to convert any value to TEXT type
     * @return {TEXT}
     */
    t: function(node){
        var text = tree.toStr(node);
        if(text == null) text = '';
        return tree.token('TEXT', text, node.lineno);
    },
    match: u.accept(function(reg, str){
        if(!str || (str.type !== 'STRING' && str.type !== 'TEXT') ) 
            return false;
        var testReg = new RegExp(reg.value),
            strValue = str.value||'';
        return testReg.test(strValue);
    }, ['STRING TEXT']),
    // throw the error;
    //  @if arg == 1{
    //      error('can not be 1');
    //  }
    error: u.accept(function(message){
        this.error(message.value);
    }, ['STRING']),
    /**
     * get the argument with the index *only work in function block *
     * @param  {Dimension} number the arg's number
     * @return {Any Value} the argument
     * @example
     * ```
     * args(0) --> got the first arguments
     * ```
     */
    index: u.accept(function(list, index){
        var elem;
        if(!index || index.type !== 'DIMENSION'){
            this.error('invalid param:index passed to args()');
        }
        if(elem = list.list[index.value]){
            return elem;
        }else{
            return tree.null()
        }
    }, ['valueslist values','DIMENSION']),

    values: function(value){
        return tree.values(value && [value]);
    },
    valueslist: function(value){
        return tree.valueslist(value && [value]);
    },
    flattern: function(){

    },
    slice: u.accept( function(list, start, end){
        var clist = list.list.slice(start&&start.value || 0, end&&end.value || list.list.length);
        return tree[list.type](clist);
    }, ['valueslist values', 'DIMENSION', 'DIMENSION']),

    /**
     * get the specify index arguments
     * @param  {DIMENSION} index 
     * @return {Mix}       
     */
    args: function(index){
        var args = this.resolve('$arguments');
        if(!args){
            this.error('the args() must be called in function block');
        }
        return _.index.call(this, args, index);
    },
    len: u.accept( function(list){
        return tree.token('DIMENSION', list.list.length, list.lineno);
    }, ['values valueslist']),
    last: u.accept( function(list){
        return list.list[list.length-1];
    }, ['values valueslist']),
    'is-list': function(list){
        return !!(list && list.list);
    },
    /**
     * image related
     */
    'data-uri': u.accept( function(string){
        var value = string.value,
            url =  {type:'URL', value: value};

        if(!fs) return url;
        else{
            var fullname = path.resolve(path.dirname(this.get('filename')), value);
            var base64 = converToBase64(fullname)
            if(!base64) return url;
            url.value = base64;
            return url;
        }

    }, ['STRING'])

}
// LIST man
// ================================

_.list = u.accept( function(list, index, value){

}, ['values valueslist']);
//migrare array 's  function to mcss
['push', 'unshift', 'pop', 'shift'].forEach(function(name){
    _[name.toLowerCase()] = function(list, item){
        var type = list.type;
        if(type !== 'valueslist' && type !== 'values'){
            this.error(name + ' first param only accept values or valueslist');
        }
        return list.list[name](item);
    }
})





// Color
// ========================================
_['-adjust'] = u.accept(function(color, prop, weight, absolute){
    var p = prop.value, key = channelsMap[p];
    var isAbsolute = tree.toBoolean(absolute);
    if(isRGBA(p)){
        if(!weight) return color[key];
        if(p === 'a' && weight.unit === '%') {
            weight.unit = null;
            weight.value /= 100;
        }
        if(weight.unit) this.error('rgba adjust only accept NUMBER');
        var clone = color.clone();
        if(isAbsolute){
            clone[key] = weight.value;
        }else{
            clone[key] += weight.value;
        }
        Color.limit(clone);
        return clone;
    }
    if(isHSL(p)){
        var hsl = color.toHSL();
        if(!weight){
            switch(p){
                case 'saturation':
                case 'lightness':
                    return {
                        type: 'DIMENSION',
                        value: hsl[key],
                        unit: '%'
                    } 
            }
            return hsl[key];
        }
        if(isAbsolute){
            hsl[key] = weight.value;
        }else{
            hsl[key] += weight.value;
        }
        var node = Color.hsl(hsl, color.alpha);
        node.lineno = color.lineno;
        return node;
    }
    this.error('invalid adjust property ' + p + " " +color.lineno);
}, ['color', 'STRING', 'DIMENSION'])

var RGBA_STR = "red green blue alpha";
var HSL_STR = "hue saturation lightness";
var isRGBA = u.makePredicate(RGBA_STR);
var isHSL = u.makePredicate(HSL_STR);

var channelsMap = {
    // channels index pos ops
    'hue': 0,
    'saturation': 1,
    'lightness': 2,
    'red': 0,
    'green': 1,
    'blue': 2,
    'alpha': 'alpha'
}

_.argb = u.accept(function(color){
    return color.toCSS(true);
}, ['color']);

;(RGBA_STR + " " + HSL_STR).split(' ').forEach(function(name){
    var text = tk.createToken('STRING', name);
    _[name.charAt(0)+'-adjust'] = _[name] = function(color, amount, absolute){
        return _['-adjust'].call(this, color, text, amount, absolute);
    }
})
// conflict with alpha()
_.fade = _.alpha;
delete _.alpha;




// Math realted
// =======================================
;['floor', 'ceil', 'round', 'abs', 'max', 'min', 'sin', 'cos', 'tan'].forEach(function(name){
    _[name] = u.accept(function(d){
        if(arguments.length < 1) this.error('at least pass one argument')
        var clone = tree.cloneNode(d);
        var args = u.slice(arguments).map(function(item){
            return item.value
        });    
        clone.value = Math[name].apply(Math, args);
        return clone;
    }, ['DIMENSION']);
});




/**
 * base 64 related
 * @type {Object}
 */
var mediatypes = {
    '.eot'       : 'application/vnd.ms-fontobject',
    '.gif'       : 'image/gif',
    '.ico'       : 'image/vnd.microsoft.icon',
    '.jpg'       : 'image/jpeg',
    '.jpeg'      : 'image/jpeg',
    '.otf'       : 'application/x-font-opentype',
    '.png'       : 'image/png',
    '.svg'       : 'image/svg+xml',
    '.ttf'       : 'application/x-font-ttf',
    '.webp'      : 'image/webp',
    '.woff'      : 'application/x-font-woff'
}


function converToBase64(imagePath){
    imagePath = imagePath.replace(/[?#].*/g, '');
    var extname = path.extname(imagePath),
        stat, img;
    try{
        stat = fs.statSync(imagePath)
        if(stat.size > 1024 * 6){// ignore 6k 
            return false
        }
        img = fs.readFileSync(imagePath, 'base64');
        return 'data:' + mediatypes[extname] + ';base64,' + img
    }catch(e){
        return false; 
    }
}

function getAlpha(node){
    if(node){
        var res= node.unit === '%'? node.value / 100 : node.value;
    }
    return res;
}

