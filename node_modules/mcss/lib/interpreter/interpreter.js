/**
 * 无论多少个Parser 只有一个Interpreter 以维持一个根Context
 */


var Walker = require('../walker');
var parser = require('../parser');
var tree = require('../node');
var symtab = require('../symtab');
var state = require('../helper/state');
var Event = require('../helper/Event');
var promise = require('../helper/promise');
var path = require('../helper/path');
var u = require('../helper/util');
var io = require('../helper/io');
var options = require('../helper/options');
var binop = require('../helper/binop');
var functions = require('../functions');
var color = require('../node/color');
var colorify = require('../helper/color');
var error = require('../error');
// 可以转换为字符串的都转化为字符串

function Interpreter(options){
    this.options = options;
};

var _ = Interpreter.prototype = new Walker();
var walk = _._walk;

//mixin state
state.mixTo(_);
//mixin option
options.mixTo(_);
//mixin event
Event.mixTo(_);


_._walk = function(ast){
    var res = walk.apply(this, arguments);
    if(!ast || !ast.type) return res
    var name = ast.type.toLowerCase();
    // event hook
    this.trigger(name, res || ast);
    return res;
}


var errors = {
    'RETURN': u.uid()
}

var states = {
    'DECLARATION': u.uid()
}

/**
 * start interpret the ast build from parser
 * all scope,space,selector-combine ... will operated in this step
 *
 * @param  {Node} ast [description]
 * @return {}     [description]
 */

_.ierror = new Error();

_.interpret = function(ast){
    this.ast = ast;
    this.scope = this.globalScope = new symtab.Scope();
    // 相当于函数调用栈
    this.istack = [];
    this._globalImports =[]; 
    this.rulesets = [];
    this.medias = [];
    this.indent = 0;
    if(!this._handles){
        this._walk = walk;
    }
    return this.walk(ast);
}

/**
 * walk the root stylesheet ast
 * 
 * @param  {[type]} ast [description]
 * @return {[type]}     [description]
 */


_.walk_default = function(ast){
    return ast;
}

_.walk_stylesheet = function(ast){
    var plist  = ast.list, item;
    ast.list = [];
    for(ast.index = 0; !!plist[ast.index] ; ast.index++){
        if(item = this.walk(plist[ast.index])){
            u.merge(ast.list, item)
        }
    }
    return ast;
}

_.walk_directive = function(ast){
    ast.value = this.walk(ast.value);
    if(ast.block) ast.block = this.walk(ast.block);
    return ast;
}
_.walk_keyframes = function(ast){
    ast.name = this.walk(ast.name);
    ast.block = this.walk(ast.block);
    return ast;
}
_.walk_keyframe = function(ast){
    ast.steps = this.walk(ast.steps);
    ast.block = this.walk(ast.block);
    return ast;
}

_.walk_ruleset = function(ast){
    this.rulesets.push(ast);

    var rawSelector = this.walk(ast.selector),
        values = ast.values,res = [];

    this.rulesets.pop();
    var self = this;
    rawSelector.list.forEach(function(complex){
        self.define(complex.string, ast);
    });
    if(ast.abstract){
        rawSelector.list = [];
    }
    if(!values){
        ast.selector = rawSelector;
        ast.parent = this.rulesets[this.rulesets.length-1];
    }
    ast.lineno = rawSelector.lineno;
    ast.filename = this.get('filename')
    if(values){
        for(var i =0 ,len = values.length; i < len; i++){
            this.define('$i', {type:'DIMENSION', value: i})
            this.define('$item', values[i]);
            var block = ast.block.clone();
            var selector = tree.selectorlist([rawSelector.list[i]], ast.lineno);
            var ruleset = new tree.RuleSet(selector, block)
            res.push(this.walk(ruleset));
        }
    }else{
        this.down(ast);
        var block = this.walk(ast.block);
        this.up(ast);
        res = block.exclude();
        ast.block = block;
        if(res.length){
            res.unshift(ast);
        }
    }
    return res.length? res : ast;
}
_.walk_selectorlist = function(ast){
    var list = ast.list, 
        len = list.length,
        self = this,
        res = [];
    if(len === 1){
        this.enter('ACCEPT_LIST');
    }
    list = this.walk(list)
    if(Array.isArray(list[0])){
        list = list[0]
    }
    ast.list = list;
    this.leave('ACCEPT_LIST');
    return ast;
}


_.walk_complexselector = function(ast){
    var ruleset = this.rulesets[this.rulesets.length -1];
    var interpolations = ast.interpolations,
        i, len = interpolations.length, valuesList;
    var values = [];
    for(i = 0 ;i< len; i++){
        var value = this.walk(interpolations[i]);
        if(value.type === 'valueslist'){
            if(ruleset.values || !this.state('ACCEPT_LIST')){
                this.error('con"t has more than 2 interpolations in ComplexSelector', ast)
            }else{
                ruleset.values = value.list
                values.push(null)
            }
        }else{
            values.push(tree.toStr(value));
        }
    }
    // step 2 replace static value
    ast.string = ast.string.replace(/#\{(\d+)}/g, function(all, index){
        var value = values[parseInt(index)];
        if(typeof value === 'string'){
            return value
        }else{
            return '#{interpolation}'
        }
    })
    // replace valuesList
    if(valuesList = ruleset.values){
        var res = [], toStr = tree.toStr;
        for(var j = 0, jlen = valuesList.length; j< jlen;j++){
            var value = valuesList[j];
            var string = ast.string.replace(/#\{interpolation}/, function(){
                return toStr(value)
            })
            res.push(new tree.ComplexSelector(string))
        }
        return res;
    }
    return ast
}

_.walk_operator = function(ast){
    var op = ast.op;
    var left = this.walk(ast.left);
    var right = (op == '&&' || op == '||')? ast.right: this.walk(ast.right);
    if(tree.isRelationOp(op)){
        return binop.relation.call(this, left, right, op);
    }else{
        return binop[op].call(this, left, right);
    }
}
// _.walk_mixin = function(ast){
//     this.define(ast.name, ast);
// }
_.walk_assign = function(ast){
    if(ast.mode == 2){ // ?=
        var ref = this.resolve(ast.name);
        if(ref && ref.type !== 'NULL') return;
    }
    ;(ast.mode == 3? this.globalScope: this).define(ast.name, this.walk(ast.value));
}

//@TODO: var clone?
_.walk_var = function(ast){
    var symbol = this.resolve(ast.value);
    if(symbol){
        symbol = symbol;
        symbol.lineno = ast.lineno;
        return symbol;
    } 
    else{
        this.error('Undefined variable: '+ ast.value, ast);
    }
}

_.walk_url = function(ast){
    var self = this, symbol;
    // if(!ast.value) console.log(ast, this.get('filename'))
    ast.value = ast.value.replace(/#\{(\$\w+)}/g, function(all, name){
        if(symbol = self.resolve(name)){
            return tree.toStr(symbol)
        }else{
            self.error('Undefined ' + name + ' in interpolation', ast)
        }
    })
    return ast;
}

_.walk_unary = function(ast){
    var value = this.walk(ast.value),
        op = ast.op;
    switch(op){
        case '+':
        case '-':
            if(value.type !== 'DIMENSION'){
                this.error(op+' Unary operator only accept DIMENSION bug got ' + value.type, ast.lineno)
            }
            var rvalue = op === '-' && (-value.value);
            var node = tree.token('DIMENSION', rvalue, ast.lineno);
            node.unit = value.unit;
            return node;
        case '!':
            var test = tree.toBoolean(value)
            if(test === undefined){
                this.error('! Unary operator dont support valueType: ' + value.type, ast.lineno)
            }
            return {
                type: 'BOOLEAN',
                value: !test,
                lineno: ast.lineno
            }
        default:
            this.error('Unsupprt Unary operator ' + op, ast.lineno)

    }
}

/**
 * @todo : 修改 某些情况下并不需要得到值 
 * @param  {[type]} ast [description]
 * @return {[type]}     [description]
 */
_.walk_text = function(ast){
    var chs = color.maps[ast.value]
    if(chs){
        return new color(chs)
    }else{
        return ast;
    }
}

_.walk_string = function(ast){
    var self = this, symbol;
    ast.value = ast.value.replace(/#\{(\$\w+)}/g, function(all, name){
        if(symbol = self.resolve(name)){
            return tree.toStr(symbol)
        }else{
            self.error('not defined String interpolation', ast)
        }
    })
    return ast;
}


_.walk_debug = function(ast){
    var value = this.walk(ast.value);
    console.log(colorify('DEBUG', 'yellow') + ' ' + tree.toStr(value) + '  (' + colorify(value.type, 'green') +')'+ '\n')
}

_.walk_if = function(ast){
    var test = this.walk(ast.test);
    if(tree.toBoolean(test)){
        return this.walk(ast.block)
    }else{
        return this.walk(ast.alt)
    }
}

_.walk_for = function(ast){
    // ast.list is a 'valuesList'
    var list = this.walk(ast.list),
        index = ast.index,
        isIn = ast.isIn,
        by = this.walk(ast.by),
        element = ast.element,
        block, iscope , len, 
        res = [], item, key, value;

    by = (by && by.value)? Math.round(by.value): 1;

    if(!list.list){
        list = [list];
    }else{
        list = list.list;
    }
    var len = list.length,
        i = by < 0 ? len-1 : 0;
    for(; i < len && i >= 0; i+=by){
        item = list[i];
        if(isIn){
            if(item.type !== 'values'){
                this.error('list in @for in statement must confirm the all elem is values type',ast.list.lineno)
            }
            value = item.list[1];
            key = item.list[0];
        }else{
            value = item;
            if(index) key = tree.token('DIMENSION',i, ast.list.lineno)
        }
        this.define(element, value);
        if(index) this.define(index, key)
        block = this.walk(ast.block.clone());
        res=res.concat(block.list);
    }
    return res;
}

/**
 * [ description]
 * @return {[type]} [description]
 */
_.walk_call = function(ast){
    var func = this.resolve(ast.name), 
        iscope , params, named,
        args = this.walk(ast.args);
    if(!func || func.type !== 'func'){
        if(func = functions[ast.name]){
            this.lineno = ast.lineno;
            var value = tree.convert(func.apply(this, args));
            value.lineno = ast.lineno;
            this.lineno = null;
            return value;
        }else{
            if(ast.name.charAt(0) === '$') this.error('undefined function: ' + ast.name, ast)
            else{
                ast.args = this.walk(ast.args);
                return ast;
            }
        }
    }
    params = func.params;

    var prev = this.scope;
    var pref = this.get('filename');
    this.scope = func.scope;
    this.down();

    // named param
    if(named = ast.named){
        for(var i in named){
            var nindex = named[i];
            if(args[nindex]){
                this.define(i, args[nindex]);        
                args.splice(nindex,1);
            }
        }
        params = params.filter(function(item){
            return named[item.name] == null;
        })
    }

    for(var i = 0, offset=0, len = params.length;  i < len; i++){
        var param = params[i],
            pname = param.name;
        if(param.rest){
            // the remained params after rest
            var remained = len - 1 - i,
                restArgsLen = (args.length-i) - remained;
            restArgsLen = restArgsLen >= 0 ? restArgsLen: 0;
            var restArgs = args.slice(i, i + restArgsLen);

            var passArg = tree.valueslist(restArgs, ast.lineno);
            this.define(param.name, passArg);
            // i move ahead
            offset += restArgsLen - 1;
        }else{
            var value = args[i + offset] || param.default;
            if(value) this.define(param.name, value);
            else this.define(param.name, tree.null(args.lineno));
        }
    }
    this.define('$arguments', new tree.ValuesList(args));
    try{
        // function 可能会进入另一个filename
        this.set('filename', func.filename);

        var block = this.walk(func.block.clone());
    }catch(err){
        // this.scope = prev;
        // this.pop(iscope);
        // means vistor the return statement
        if(err.code === errors.RETURN){
            var value = tree.convert(err.value);
            // 存在在函数作用域定义的function
            this.up();
            this.scope = prev;
            this.set('filename', pref);
            return value;
        }else{
            throw err;
        }
    }
    this.up();
    this.scope = prev;
    this.set('filename', pref);
    return block;
}

/**
 * 返回与js一致
 * @return {[type]} [description]
 */
_.walk_return = function(ast){
    _.ierror.code = errors.RETURN;
    _.ierror.value = this.walk(ast.value);
    throw _.ierror;
}

_.walk_func = function(ast){
    ast.params = this.walk(ast.params);
    if(!ast.scope) ast.scope = this.scope;
    ast.filename = this.get('filename');
    return ast;
}

_.walk_param = function(ast){
    if(ast.default){
        ast.default = this.walk(ast.default);
    }
    return ast;
}

/**
 * struct 结构
 * 
 * @param  {[type]} ast [description]
 * @return {[type]}     [description]
 */
_.walk_module = function(ast){
    var block = this.walk(ast.block);
}



// _.walk_componentvalues = function(ast){
//     var self = this;
//     var list = [], tmp;
//     ast.list.forEach(function(item){
//         if(tmp = self.walk(item)){
//             var type = self._inspect(tmp);
//             if(type === 'variable'){
//                 list = list.concat(tmp.value.list)
//             }else{
//                 list.push(tmp);
//             }
//         } 
//         // 如果什么都没返回则装如原数据
//         else list.push(item)
//     })
//     ast.list = list;
//     return ast;
// }

_.walk_extend = function(ast){
    var ruleset = this.rulesets[this.rulesets.length-1];
    if(!ruleset) this.error('can not use @extend outside ruleset', ast);
    var selector = this.walk(ast.selector);
    var self = this;
    selector.list.forEach(function(item){
        var extend = self.resolve(item.string);
        if(extend){
            extend.addRef(ruleset);
        }
        // @MARK else prevent the error just ignored
    })
}

_.walk_import = function(ast){
    this.walk(ast.url);
    var url = ast.url;
    if(ast.stylesheet){
        var queryList = ast.queryList;
        var stylesheet = ast.stylesheet;
        // 改写成media
        if(queryList.length){
            var media = new tree.Media(queryList, stylesheet);
            return this.walk(media);
        }else{
            // @TODO: CANOT import twice? 
            if(~this._globalImports.indexOf(ast.filename)&&this.scope === this.globalScope){
                u.log(colorify('WARNING:', 'yellow') + '(' + ast.filename + ') is import twice, mcss forbid default')
                return;
            }else{
                this._globalImports.push(ast.filename);
            }
            // @TODO
            var pre = this.get('filename');
            // 进行work时
            this.set('filename', ast.filename);
            var list = this.walk(stylesheet).list;
            this.set('filename', pre);
            return list;
        }
    }else{
        return ast;
    }
}

_.walk_media = function(ast){
    ast.queryList = this.walk(ast.queryList);
    var rulesets = this.rulesets, ruleset, newRuleset;
    this.concatMedia(ast);
    this.down(null, ast);
    this.walk(ast.block);
    this.up(null, ast);
    var res = ast.block.exclude(true);
    if(res.length){
        if(Array.isArray(res[0])){
            var declarations = res.shift();
            // 如果外层没有ruleset 则忽略这些declaration
            if(declarations.length && rulesets.length){
                ruleset = rulesets[rulesets.length - 1];
                newRuleset = new tree.RuleSet(ruleset.selector, new tree.Block(declarations));
                newRuleset.parent = ruleset.parent;
                newRuleset.lineno = declarations[0].value.lineno || declarations[0].property.lineno;
                ast.block.list.unshift(newRuleset);
            }
        }
        res.unshift(ast);
    }

    return res.length? res: ast;

}
_.walk_mediaquery = function(ast){
    ast.expressions = this.walk(ast.expressions);
    return ast;
}

_.walk_mediaexpression = function(ast){
    ast.feature = this.walk(ast.feature);
    ast.value = this.walk(ast.value);
    return ast
}

_.walk_block = function(ast){
    var list = ast.list;
    var res = [], r;
    for(var i = 0, len = list.length; i < list.length ; i++){
        if(list[i] && (r = this.walk(list[i]))){
            u.merge(res, r)
        }
    }
    ast.list = res;
    return ast;
}


_.walk_declaration = function(ast){
    this.enter('DECLARATION');
    ast.property = this.walk(ast.property);
    ast.value = this.walk(ast.value);
    this.leave('DECLARATION');
    return ast;
}

_.walk_compoundident = function(ast){
    var text = '', self = this;
    this.walk(ast.list).forEach(function(item){
        text += typeof item === 'string' ? item : tree.toStr(self.walk(item));
    })
    return {
        type: 'TEXT',
        value: text,
        lineno: ast.lineno
    }
}

_.walk_valueslist = function(ast){
    ast.list = this.walk(ast.list);
    return ast;
}

_.walk_values = function(ast){
    ast.list = this.walk(ast.list);
    return ast
}

_.walk_range = function(ast){
    var start = this.walk(ast.start),
        end = this.walk(ast.end),
        lineno = ast.lineno;
    if(start.type !== 'DIMENSION' || end.type !== 'DIMENSION'){
        this.error('range"s start and end must be all DIMENSION type');
    }
    var svalue = Math.round(start.value), 
        evalue = Math.round(end.value),
        list = [];
    for(;svalue <= evalue; svalue++){
        list.push(tree.token('DIMENSION', svalue, ast.lineno))
    }
    return tree.valueslist(list, ast.lineno);
}



// util function
// ===========================


// lexel scope down
_.down = function(ruleset, media){
    if(ruleset) this.rulesets.push(ruleset);
    if(media) this.medias.push(media);
    this.scope = new symtab.Scope(this.scope);
}

// lexel scope up
_.up = function(ruleset, media){
    if(ruleset) this.rulesets.pop();
    if(media) this.medias.pop();
    this.scope = this.scope.getOuterScope();
}
// _.concatSelector = function(selectorList){
//     var ss = this.rulesets;
//     if(!ss.length) return selectorList;
//     var parentList = ss[ss.length - 1].selector,
//         slist = selectorList.list,
//         plist = parentList.list,
//         slen = slist.length, 
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
//             }else{
//                 rstring = pstring + ' ' + sstring;
//             }
//             res.list.push(new tree.ComplexSelector(rstring));
//         }
//     }
//     return res
// }

/**
 * concat nested mediaquery list
 * @param  {Media} media current visted media
 * @return {[type]}       [description]
 */
_.concatMedia = function(media){
    var ss = this.medias;
    if(!ss.length) return media;
    var slist = ss[ss.length-1].queryList,
        mlist = media.queryList,
        queryList = [];
    // index,len, mediaquery
    var s, m, slen = slist.length, mlen = mlist.length,
        mm, sm, nm;
    for(m = 0; m < mlen; m ++){
        mm = mlist[m];
        for(s = 0; s < slen; s ++) {
            sm = slist[s];
            // 1. all have mediaType then can't concat
            nm = new tree.MediaQuery()
            // @TODO 忽略无法concat的组合
            if(sm.mediaType && mm.mediaType){
                var noConcat = true;
                break;
            }else{
                nm.mediaType = mm.mediaType || sm.mediaType;
                nm.expressions = sm.expressions.concat(mm.expressions);
                queryList.push(nm);
            }
        }
    }
    if(!noConcat){
        media.queryList = queryList;
    }
    return media;
    
}

// push function scope
_.push = function(scope){
    this.istack.push(scope);
}

// push function scope
_.pop = function(){
    this.istack.pop()
}

_.peek = function(){
    var len;
    if(len = this.istack.length) return this.istack[len - 1];
}

_.getScope = function(){
    return this.peek() || this.scope;
}

_.define = function(id, symbol){
    this.scope.define(id, symbol);
}

_.resolve = function(id){
    var scope, symbol;
    if((scope = this.peek()) && (symbol =  scope.resolve(id))){
        return symbol;
    }
    return this.scope.resolve(id);
}

_.expect = function(ast, type){
    if(!(this._inspect(ast) === type)){
        this.error('interpreter error! expect node: "'+ type +'" got: "' + ast.type + '"', ast)
    }
}

_.error = function(msg, ll){
    if(ll){
        var lineno = ll.lineno || ll;
    }else{
        lineno = this.lineno;
    }
    throw new error.McssError(msg, lineno, this.options)
}







module.exports = Interpreter;

