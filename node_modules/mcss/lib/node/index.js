var _ = require('../helper/util'),
    splice = [].splice,
    tk = require('../tokenizer'),
    isPrimary = _.makePredicate('rgba dimension string boolean text null url');


function Stylesheet(list){
    this.type = 'stylesheet';
    this.list = list || [];
}

Stylesheet.prototype.clone = function(){
    var clone = new Stylesheet();
    clone.list = cloneNode(this.list);
    return clone;
}

Stylesheet.prototype.exclude = function(){
    var res = [], 
        list = this.list,
        item;
    for(var len = list.length; len--;){
        item = list[len]
        if(item.type === 'media'){
            res.unshift(list.splice(len, 1)[0]);
        }
    }
    return res;
}

Stylesheet.prototype.abstract = function(){
    var list = this.list,
        i = list.length;
    for(;i--;){
        var ruleset = list[i];
        if(ruleset && ruleset.type == 'ruleset'){
            ruleset.abstract = true;
        }
    }
    // 只保留ruleset 的引用
    return this;
}

//  选择器列表
function SelectorList(list, lineno){
    this.type = 'selectorlist';
    this.list = list || [];
    this.lineno = lineno;
}

SelectorList.prototype.clone = function(){
    var clone = new SelectorList(cloneNode(this.list));
    return clone;
}
SelectorList.prototype.len = function(){
    return this.list.length;
}

exports.selectorlist = function(list, lineno){
    return new SelectorList(list, lineno)
}

// 复选择器
function ComplexSelector(string, interpolations){
    this.type = 'complexselector';
    this.string = string;
    this.interpolations = interpolations || [];
}

ComplexSelector.prototype.clone = function(){
    var clone = new ComplexSelector(this.string, cloneNode(this.interpolations));
    return clone;
}




function RuleSet(selector, block, abstract){
    this.type = 'ruleset';
    this.selector = selector;
    this.block = block;
    // @TODO for mixin
    this.ref = [];
    this.abstract = abstract || false;
}

RuleSet.prototype.addRef = function(ruleset){
    var alreadyHas = this.ref.some(function(item){
        return ruleset === item;
    })
    if(alreadyHas) return;
    this.ref.push(ruleset);
}
RuleSet.prototype.extend = function(){

}
RuleSet.prototype.getSelectors = function(){
    // 只计算一次
    // 因为media复制的ruleset与这个公用一个ruleset
    if(this.selector._compute == true) return this.selector.list;
    var selectors = this.selector.list;
    var plist;
    if(this.parent && (plist = this.parent.getSelectors()) && plist.length){
        selectors = this._concatSelector(selectors, plist)
    }

    if(!this.parent){
        this.selector.list.forEach(function(selector){
            selector.string = selector.string.replace(/&/g, '')
        })
    }
    if(this.ref.length){
        this.ref.forEach(function(ruleset){
            // console.log(ruleset.getSelectors())
            selectors = selectors.concat(ruleset.getSelectors())
            // console.log(ruleset.getSelectors())
        })
        this.ref = [];
    }
    this.selector.list = selectors;
    this.selector._compute = true;
    return selectors;
}
var comboSplit = /\s*[~+>\s]\s*/;
RuleSet.prototype._concatSelector = function(slist, plist){
    if(!plist.length || !slist.length) return [];
    var slen = slist.length,
        plen = plist.length,
        sstring, pstring, rstring,
        s, p, res = [];
    for(p = 0; p < plen; p ++){
        pstring = plist[p].string;
        for(s = 0; s < slen; s ++) {
            sstring = slist[s].string;
            if(~sstring.indexOf('&')){
                rstring = sstring.replace(/&/g, pstring)
            }else if(~sstring.indexOf('%')){
                var index = pstring.search(comboSplit);
                // @WARN 避免80%等也被计算在内(@keyframes中) 2013/7/9 21:45:58
                rstring = sstring.replace(/([^0-9]|^)%/g, function(all, a){
                    return (a||'') + ((~index)? pstring.slice(index):'');
                })
            }else{
                rstring = pstring + ' ' + sstring;
            }
            res.push(new exports.ComplexSelector(rstring));
        }
    }
    return res;
}






RuleSet.prototype.clone = function(){
    var clone = new RuleSet(cloneNode(this.selector), cloneNode(this.block), this.abstract);
    return clone;
}



function Block(list){
    this.type = 'block';
    this.list = list || [];
}

Block.prototype.clone = function(){
    var clone = new Block(cloneNode(this.list));
    return clone;
}

Block.prototype.exclude = function(isMedia){
    var res = [], 
        list = this.list,
        item;
    if(isMedia) var declarations = [];
    for(var len = list.length; len--;){
        item = list[len]
        if(isMedia){
            if(item.type === 'media') res.unshift(list.splice(len, 1)[0]);
            if(item.type === 'declaration') declarations.unshift(list.splice(len, 1)[0]);
        }else if(item.type !=='declaration'){
            res.unshift(list.splice(len, 1)[0]);
        }
    }
    if(declarations && declarations.length) res.unshift(declarations)
    return res;
}

Block.prototype.abstract = function(){
    var list = this.list,
        i = list.length;
    for(;i--;){
        var ruleset = list[i];
        if(ruleset && ruleset.type == 'ruleset'){
            ruleset.abstract = true;
        }
    }
    // 只保留ruleset 的引用
    return this;
}



// module Node
function Declaration(property, value, important){
    this.type = 'declaration';
    this.property = property;
    this.value = value;
    this.important = important || false;
}

Declaration.prototype.clone = function(name){
    var clone = new Declaration(cloneNode(this.property), cloneNode(this.value), this.important);
    return clone;
}




// module Node
function Values(list){
    this.type = 'values';
    this.list = list || [];
}

Values.prototype.clone = function(){
    var clone = new Values(cloneNode(this.list));
    return clone;
}

// 将内容便平化
Values.prototype.flatten = function(){
    var list = this.list,
        i = list.length,
        value;
    for(;i--;){
        value = list[i];
        if(value.type == 'values'){
            splice.apply(this, [i, 1].concat(value.list));
        }
    }
    return this;
}

exports.values = function(list,lineno){
    var node = new Values(list);
    node.lineno = lineno;
    return node;
}

function ValuesList(list, lineno){
    this.type = 'valueslist'
    this.list = list || [];
    this.lineno = lineno;
}
ValuesList.prototype.clone = function(){
    var clone = new ValuesList(cloneNode(this.list), this.lineno);
    return clone;
}
// 将内容便平化
ValuesList.prototype.flatten = function(){
    var list = this.list,
        i = list.length,
        values;
    for(;i--;){
        values = list[i];
        if(values.type == 'valueslist'){
            splice.apply(list, [i, 1].concat(values.list));
        }
    }
    return this;
}

ValuesList.prototype.first = function(){
    return this.list[0].list[0]
}

exports.valueslist = function(list, lineno){
    return new ValuesList(list, lineno);
}


// 所有侦测不出的类似统一放置在这里;
function Unknown(name){
    this.type = 'unknown';
    this.name = name;
}

Unknown.prototype.clone = function(){
    var clone = new Unknown(this.name);
    return clone;
}





// function Variable(name, value, kind){
//     this.type = 'variable';
//     // const or var
//     this.kind = kind || 'var';
//     this.name = name;
//     this.value = value || [];
// }

// Variable.prototype.clone = function(name){
//     var clone = new Variable(this.name,cloneNode(this.value), this.kind);
//     return clone;
// }

// mode 分为三种  =  ?= ^=  分别为1,2,3 
function Assign(name, value, mode){
    this.type = 'assign';
    // const or var
    this.name = name;
    this.value = value;
    this.mode = mode === undefined ? 1: mode;
}

Assign.prototype.clone = function(name){
    var clone = new Assign(this.name, cloneNode(this.value), this.mode);
    return clone;
}


// list is a block statement
// defaults is default params
function Func(params, block,name){
    this.type = 'func'
    this.params = params || [];
    this.block = block;
}

Func.prototype.clone = function(){
    var clone = new Func(cloneNode(this.params), this.block);
    return clone;
}


function Param(name, dft, rest){
    this.type = 'param'
    this.name = name;
    this.default = dft;
    this.rest = rest || false;
}

Param.prototype.clone = function(){
    var clone = new Param(this.name, cloneNode(this.default), this.rest);
    return clone;
}




// params default
function Extend(selector){
    this.type = 'extend';
    this.selector = selector;
}

Extend.prototype.clone = function(){
    var clone = new Extend(this.selector);
    return clone;
}

exports.extend = function(selector){
    return new Extend(selector);
}

function Module(name, block){
    this.type = 'module';
    this.block = block;
}

Module.prototype.clone = function(){
    var clone = new Module(this.name, cloneNode(this.block));
    return clone;
}

function Pointer (name, key){
    this.type = 'pointer';
    this.name = name;
    this.key = key;
}

Pointer.prototype.clone = function(){
    var clone = new Pointer(this.name, this.key);
    return clone;
}


function Import(url, queryList, stylesheet){
    this.type = 'import'
    this.url = url;
    this.queryList = queryList || [];
    this.stylesheet = stylesheet;
}

Import.prototype.clone = function(){
    var clone = new Import(this.url, this.queryList, this.stylesheet);
    return clone;
}


// if statement
function IfStmt(test, block, alt){
    this.type = 'if';
    this.test = test;
    this.block = block;
    this.alt = alt;
}



IfStmt.prototype.clone = function(){
    var clone = new IfStmt(cloneNode(this.test), cloneNode(this.block), cloneNode(this.alt));
    return clone;
}

// if statement
function ForStmt(element, index, list, block, isIn, by){
    this.type = 'for'
    this.element = element;
    this.index = index;
    this.list = list;
    this.block = block;
    this.isIn = isIn || false;
    this.by = by;
}

ForStmt.prototype.clone = function(){
    var clone = new ForStmt(this.element, this.index, cloneNode(this.list), cloneNode(this.block), this.isIn, cloneNode(this.by));
    clone.isIn = this.isIn;
    return clone;
}

function ReturnStmt(value){
    this.type = 'return';
    this.value = value;
}

ReturnStmt.prototype.clone = function(){
    var clone = new ReturnStmt(cloneNode(this.value));
    return clone;
}

// 
function CompoundIdent(list){
    this.type = 'compoundident';
    this.list = list || [];
}

CompoundIdent.prototype.clone = function(){
    var clone = new CompoundIdent(cloneNode(this.list));
    return clone;
}

CompoundIdent.prototype.toString = function(){
    return this.list.join('');
}

function Dimension(value, unit){
    this.type = 'dimension';
    this.value = value;
    this.unit = unit;
}

Dimension.prototype.clone = function(){
    var clone = new Dimension(this.value, this.unit);
    return clone;
}

Dimension.prototype.toString = function(){
    return '' + this.value + (this.unit || '');
}



function Operator(op, left, right){
    this.type = 'operator';
    this.op = op;
    this.left = left;
    this.right = right;
}

Operator.prototype.clone = function(){
    var clone = new Operator(this.op, cloneNode(this.left), cloneNode(this.right));
    return clone;
}

Operator.prototype.toBoolean = function(){

}




function Range(left, right){
    this.type = 'range';
    this.left = left;
    this.right = right;
}

Range.prototype.clone = function(){
    var clone = new Range(cloneNode(this.left), cloneNode(this.right));
    return clone;
}




function Unary(value, op){
    this.type = 'unary';
    this.value = value;
    this.op = op;
}

Unary.prototype.clone = function(){
    var clone = new Unary(cloneNode(this.value), this.op);
    return clone;
}


function Call(name, args, named ,lineno){
    this.type = 'call';
    this.name = name;
    this.args = args || [];
    this.named = named;
    this.lineno = lineno;
}

Call.prototype.clone = function(){
    var clone = new Call(this.name, cloneNode(this.args), this.named);
    return clone;
}

exports.call = function(name, args, named, lineno){
    var node = new(Call)(name, args, named, lineno);
    return node;

}

function FontFace(block){
    this.type = 'fontface';
    this.block = block;

}

FontFace.prototype.clone = function(){
    var clone = new FontFace(param);
    return clone;
}

function Media(queryList, block){
    this.type = 'media';
    this.queryList = queryList || [];
    this.block = block
}

Media.prototype.clone = function(){
    var clone = new Media(cloneNode(this.queryList), cloneNode(this.block));
    return clone;
}

function MediaQuery(type ,expressions){
    this.type = 'mediaquery'
    // sreen
    this.mediaType = type;
    this.expressions = expressions || [];
}

MediaQuery.prototype.clone = function(){
    var clone = new MediaQuery(this.mediaType, cloneNode(this.expressions));
    return clone;
}
MediaQuery.prototype.equals = function(media){
    var expressions = this.expressions,
        len = expressions.length,
        test, exp;
    if(!media) return false;
    if(this.mediaType !== media.mediaType){
        return false
    }
    if(len !== media.length){
        return false
    }
    for(; len--;){
        exp = expressions[len - 1];
        test = media.expressions.some(function(exp2){
            return exp.equals(exp2);
        })
    }
}


function MediaExpression(feature, value){
    this.type = 'mediaexpression';
    this.feature = feature; 
    this.value = value;
}

MediaExpression.prototype.clone = function(){
    var clone = new MediaExpression(cloneNode(this.feature), cloneNode(this.value));
    return clone;
}
MediaExpression.prototype.equals = function(exp2){
    return this.feature == exp2.feature 
        && this.value === exp2.feature;
}


function Keyframes(name, list){
    this.type = 'keyframes'
    this.name = name;
    this.block = list;
}
Keyframes.prototype.clone = function(){
    var clone = new Keyframes(cloneNode(this.name),cloneNode(this.block));
    // @FIXIT
    clone.fullname = this.fullname;
    return clone;
}


function Keyframe(steps, block){
    this.type = 'keyframe';
    this.steps = steps || steps;
    this.block = block;
}
Keyframe.prototype.clone = function(){
    var clone = new Keyframe(cloneNode(this.steps), cloneNode(this.block));
    return clone;
}





function Page(selector, block ){
    this.type = 'page';
    this.selector = selector;
    this.block = block;
}

Page.prototype.clone = function(){
    var clone = new Page(this.selector, cloneNode(this.block));
    return clone;
}


// @beidirective支持

function Debug(value){
    this.type = 'debug'
    this.value = value;
}

Debug.prototype.clone = function(){
    var clone = new Debug(cloneNode(this.value));
    return clone;
}

function Directive(name, value, block ){
    this.type = 'directive'
    this.name = name;
    this.value = value;
    this.block = block;
}

Directive.prototype.clone = function(){
    var clone = new Directive(this.name,cloneNode(this.value),cloneNode(this.block));
    clone.fullname = this.fullname;
    return clone;
}

function Range(start, end){
    this.type = 'range';
    this.start = start;
    this.end = end;
}
Range.prototype.clone = function(){
    var clone = new Range(cloneNode(this.start), cloneNode(this.end));
    clone.lineno = this.lineno;
    return clone;
}
exports.range = function(start, end, lineno){
    var node = new Range(start, end);
    node.lineno = lineno;
    return node;
}

exports.directive = function(name, value, block){
    return new Directive(name,value,block);
}


// function Print(string, list){
//     this.string = string;
//     this.list = list || [];
// }

// Print.prototype.clone = function(){
//     var clone = new Print(cloneNode(this.string), cloneNode(this.list));
//     return clone;
// }
// Print.prototype.fill = function(){
//     this.list.forEach(function(){
        
//     })
// }



exports.Stylesheet = Stylesheet;
exports.SelectorList = SelectorList;
exports.ComplexSelector = ComplexSelector;
exports.RuleSet = RuleSet;
exports.Block = Block;
exports.Declaration = Declaration;
exports.ValuesList = ValuesList;
exports.Values = Values;
exports.Unknown = Unknown;
exports.Func = Func;
exports.Param = Param;
exports.Extend = Extend;
exports.IfStmt = IfStmt;
exports.ForStmt = ForStmt;
exports.ReturnStmt = ReturnStmt;
exports.Module = Module;
exports.Debug = Debug;
exports.Pointer = Pointer;
exports.Range = Range;
exports.Import = Import;
exports.Page = Page;
exports.Directive = Directive;
exports.Color = require('./color');
exports.Unary = Unary;
exports.Assign = Assign;
exports.Call = Call;
exports.Operator = Operator;
exports.CompoundIdent = CompoundIdent;
exports.Media = Media;
exports.MediaQuery = MediaQuery;
exports.MediaExpression = MediaExpression;
exports.Keyframes = Keyframes;
exports.Keyframe = Keyframe;



exports.null = function(lineno){
    return {
        type: 'NULL',
        value: 'null',
        lineno: lineno
    }
}

exports.token = function(type, value, lineno){
    return {
        type: type,
        value: value,
        lineno: lineno
    }
}








exports.inspect = function(node){
    return node.type? node.type.toLowerCase(): null;
}


// 看看是否有便利的方法
var cloneNode = exports.cloneNode = function(node){
    if(!node) return node;
    if(node.clone){
        var clone_node = node.clone()
        clone_node.lineno = node.lineno;
        return clone_node;
    } 
    // array
    if(Array.isArray(node)) return node.map(cloneNode)
    // token
    if(node.type){
        var res = {type: node.type, value: node.value, lineno: node.lineno}
        if(node.type === 'DIMENSION') res.unit = node.unit;
        return res;
    }
    if(typeof node !== 'object') return node;
    else{
        _.error(node);
        throw Error('con"t clone node')
    }
}


//精确到小数点后6位
var precision = 6;
exports.toStr = function(ast){
    if(!ast) return '';
    switch(ast.type){
        case 'TEXT':
        case 'BOOLEAN':
        case 'NULL':
            return String(ast.value);
        case 'DIMENSION':
            var value = ''+ _.round(ast.value) + (ast.unit? ast.unit : '');
            return value;
        case 'STRING':
            return ast.value;
        case 'color':
            return ast.toCSS();
        case 'func':
            return '';
        case 'values': 
            return ast.list.map(function(item){
                return exports.toStr(item)
            }).join(' ');
        case 'valueslist':
            return ast.list.map(function(item){
                return exports.toStr(item)
            }).join(',')
        case 'call':
            return ast.name + '(' +
                ast.args.map(exports.toStr).join(',') + ')';
        case 'selectorlist': 
            return ast.list.map(function(selector){
                return selector.string
            }).join(',');

        default: 
            return ast.value;
    } 
}

exports.toBoolean = function(node){
    if(!node) return false;
    var type = node.type;
    switch(type){
        case 'DIMENSION':
            return node.value != 0;
        case 'STRING':
        case 'TEXT':
            return node.value.length !== 0
        case 'BOOLEAN':
            return node.value === true;
        case 'NULL':
            return false;
        case 'valueslist':
        case 'values':
            return node.list.length > 0;
        case 'color':
            return true;
        case 'func':
            return true;
    }

}

exports.isPrimary = isPrimary;

exports.isRelationOp = _.makePredicate('== >= <= < > !=');

exports.convert = function(primary){
    var type = _.typeOf(primary);
    var tType;
    switch(type){
        case 'string':   tType = 'STRING';       break;
        case 'boolean':  tType = 'BOOLEAN';      break;
        case 'number':   tType = 'DIMENSION';       break;
        case 'undefined':
        case 'null':     tType = 'NULL';         break;
        case 'object':
            return primary;
    }
    if(tType) return tk.createToken(tType, primary);
    return primary;
}




