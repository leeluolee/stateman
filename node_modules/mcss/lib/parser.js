/**
 * lineno 每个node都要
 */



module.exports = Parser;
var tk = require('./tokenizer');
var tree = require('./node');
var directive = require('./node/directive');
var _ = require('./helper/util');
var binop = require('./helper/binop');
var promise = require('./helper/promise');
var options = require('./helper/options');
var path = require('./helper/path');
var fs = require('fs');
var sysUrl = require('url');
var symtab = require('./symtab');
var state = require('./state');
var error = require('./error');
var io = require('./helper/io');
var remoteFileCache = state.remoteFileCache;


var perror = new Error();
var slice = [].slice;
var errors = {
    INTERPOLATE_FAIL: 1,
    DECLARION_FAIL:2,
    FILE_NOT_FOUND: 3
}

var assignMap = {
    '=': 1,
    '?=': 2,
    '^=': 3
}

// nodejs spec API

var combos = ['WS', '>', '~', '+'];
var skipStart = 'WS NEWLINE COMMENT ;'; 
var operators = '+ - * /';

// 判断
var isSkipStart = _.makePredicate(skipStart);
var isCombo = _.makePredicate(combos);
// probably selector segment
var isSelectorSep = _.makePredicate(combos.concat(['PSEUDO_CLASS','PSEUDO_ELEMENT', 'ATTRIBUTE', 'CLASS', 'HASH', '&', 'TEXT', '*', '#', '#{', ':', '.', '%', '-', 'compoundident', 'DIMENSION']));
var isOperator = _.makePredicate(operators);
var isColor = _.makePredicate("aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgrey darkgreen darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray grey green greenyellow honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgrey lightgreen lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen")

var isMcssAtKeyword = _.makePredicate('mixin extend var');
var isMcssFutureAtKeyword = _.makePredicate('if else css for');
var isCssAtKeyword = _.makePredicate('import page keyframe media font-face charset');

var isShorthandProp = _.makePredicate('background font margin border border-top border-right border-bottom border-left border-width border-color border-style transition padding list-style border-radius.')

var isWSOrNewLine = _.makePredicate('WS NEWLINE');
var isCommaOrParen = _.makePredicate(', )');

var isDirectOperate = _.makePredicate('DIMENSION STRING BOOLEAN TEXT NULL');
var isRelationOp = _.makePredicate('== >= <= < > !=');
var isNeg = function(ll){
    return ll.type === 'DIMENSION' && ll.value < 0;
}

var isProbablyModulePath = function(path){
    return /^[-\w]/.test(path) && !(/:/.test(path)); 
}


var states = {
    // 进入filter
    'FILTER_DECLARATION': _.uid(),
    // 失败则进入Ruleset
    'TRY_DECLARATION': _.uid(),
    'TRY_INTERPOLATION': _.uid(),
    // 当遇到特殊属性时
    'FUNCTION_CALL': _.uid()
}





function Parser(options){
    this.options = options || {};
}
// yy.Parser = Parser

Parser.prototype = {
    // ===============
    // main 
    // ===============
    parse: function(tks){
        try{
            var p = new promise();
            // @TODO: 这些要与import 合并 2013/5/12 0:29:42
            if(typeof tks === 'string'){
                var filename = this.get('filename');
                if(filename && !this.get('imports')[filename]){
                    this.get('imports')[filename] = tks;
                }
                tks = tk.tokenize(tks, this.options);
            }
            // this.tokenizer = tk(input, _.extend(options||{}, {ignoreComment:true}));
            this.lookahead = tks;
            // this.lookahead = [this.tokenizer.lex(), this.tokenizer.lex(), this.tokenizer.lex()];
            this.p = 0;
            this.length = this.lookahead.length;
            this._states = {};
            // symbol table
            this.scope = this.options.scope || new symtab.Scope();
            this.marked = null;
            // this.setInput(input, options)
            this.promises = [];

            var ast = this.stylesheet();
        }catch(e){
            return p.reject(e);            
        }
        // callback
        var self = this;
        if(this.promises.length){
            promise.when.apply(this, this.promises).done(function(){
                return p.resolve(ast);
            }).fail(function(err1){
                p.reject(err1);
            })
        }else{
            return p.resolve(ast);
        }
        return p;
    },
    // store intermidia state
    state: function(state){
        return this._states[state] === true;
    },
    // enter some state
    enter: function(state){
        this._states[state] = true;
    },
    // enter some state
    leave: function(state){
        this._states[state] =false;
    },
    // read the next token;
    // @TODO return to token stream!
    next: function(k){
        k = k || 1;
        this.p += k;
    },
    lookUpBefore:function(lookup, before){
        var i = 1, la;
        while(i++){
            if( (la = this.la(i)) === lookup) return true
            if( la === before || la === 'EOF' || la === '}' ){
                return false;
            }
        }
        return false;
    },
    match: function(tokenType){
        var ll;
        if(!(ll = this.eat.apply(this, arguments))){
            var ll = this.ll();
            // _.log(this.lookahead, this.ll(2));
            this.error('expect:"' + tokenType + '" -> got: "' + ll.type + '"', ll.lineno, tokenType)
        }else{
            return ll;
        }
    },
    matchSemiColonIfNoBlock: function(){
        this.eat('WS');
        if(this.la()!=='}') this.match(';');
    },
    // Temporarily set to ll(3) parser,
    ll: function(k){
        k = k || 1;
        if(k < 0) k = k + 1;
        var pos = this.p + k - 1;
        if(pos > this.length-1){
            return this.lookahead[this.length-1];
        }
        return this.lookahead[pos];
        // return this.lookahead[(this.p + k - 1) % 3];
    },
    // lookahead
    la: function(k){
        return this.ll(k).type;
    },
    // type at pos is some type
    is: function(pos, tokenType){
        return this.la(pos) === tokenType;
    },
    // 简单版本 只允许mark一次
    mark: function(){
        this.marked = this.p;
        return this;
    },
    restore: function(){
        if(this.marked != undefined) this.p = this.marked;
        this.marked = null;
        return this;
    },
    // expect
    // some times we need to ignored some lookahead , etc. NEWLINE
    // 
    // while to eat ';'
    // 1. eat ;
    // 2. eat newLine;
    eat: function(tokenType){
        var ll = this.ll();
        for(var i = 0, len = arguments.length; i < len; i++){
            if(ll.type === arguments[i]){
                this.next();
                return ll;
            }
        }
        return false;
    },
    skip: function(type){
        var skiped, la, test;
        while(true){
            la = this.la();
            test = typeof type ==='string'? 
                type === la: type(la);
            if(test){
                this.next();
                skiped = true;
            }
            else break;    
        }
        return skiped;
    },
    skipStart: function(){
        return this.skip(isSkipStart);
    },
    skipWSorNewlne: function(){
        return this.skip(isWSOrNewLine);
    },
    error: function(msg, ll, expect){
        if(typeof msg === 'number') {
            perror.code = msg
            perror.message = 'Uncauched Error'
            throw perror;
        }
        var lineno = ll.lineno || ll;
        var err = new error.SyntaxError(msg, lineno, this.options)
        if(expect) err.expect = expect;
        throw err;
    },
    // parse Function
    // ===================
    // 1.main



    // stylesheet(topLevel)
    //  : WS      {skipWhiteSpace}
    //  | stmt EOF
    //  | 
    //  ;
    //           
    stylesheet: function(){
        return this.block(true);
    },

    // statement
    // stmt
    //  : ruleset
    //  | atrule
    //  ;
    stmt: function(){
        var ll = this.ll(), 
            la = ll.type, 
            node = false;
        if(la === 'AT_KEYWORD'){
            node = this.atrule();
        }
        if(la === 'VAR'){
            switch(this.la(2)){
                case '(':
                    node = this.fnCall();
                    this.matchSemiColonIfNoBlock();
                    break;
                case ':':
                    node = this.transparentCall();
                    this.matchSemiColonIfNoBlock();
                    break;
                case '=':
                case '?=':
                case '^=':
                    node = this.assign();
                    if(node.value.type !== 'func'){
                        this.matchSemiColonIfNoBlock();
                    }
                    break;

                default:
                    this.error('UNEXPECT token after VARIABLE', this.ll(2))
            }
        }
        if(la === 'FUNCTION'){
            node = this.fnCall();
            this.matchSemiColonIfNoBlock();
        }
        if(isSelectorSep(la)){
            node = this.ruleset(true);
        }

        if(node !== false){
            return node
        }
        this.error('INVALID statementstart ' + ll.type, ll);
    },
    // atrule
    //  : css_atrule(@import, @charset...)
    //  : bi_atrule(@if, @else, @mixin...)
    //  : directive 
    //  ;
    atrule: function(){
        var fullname = this.ll().value.toLowerCase();
        var name = this._removePrefix(fullname);
        if(typeof this[name] === 'function'){
            var node = this[name]();
        }else{
            node = this.directive();
        }
        node.fullname = fullname;
        return node;
        
    },
    // 天然支持document、charset等等
    directive: function(){
        var ll = this.ll();
        var name = ll.value.toLowerCase();
        var dhook = directive.getDirective(name);
        if(dhook){
            // this.error('undefined atrule: "' + this.ll().value + '"')
            //@TODO add customer syntax
            console.log('has hook');
        }else{
            this.match('AT_KEYWORD');
            this.eat('WS')
            var value = this.valuesList();
            this.eat('WS');
            if(this.eat(';')){
                return tree.directive(name, value);
            }else{
                var block = this.block();
                return tree.directive(name, value, block);
            }
            this.error('invalid customer directive define', ll);
        }
        
    },
    extend: function(){
        var ll = this.match('AT_KEYWORD');
        this.eat('WS');
        var node = tree.extend(this.selectorList());
        node.lineno = ll.lineno;
        this.matchSemiColonIfNoBlock();
        return node;
        // if(la === 'IDENT' || la === 'CLASS'){
        //     var mixin = this.scope.resolve(ll.value);
        //     if(!mixin) {
        //         this.error('undefined mixin -> ' + ll.value);
        //     }
        //     if(mixin.refs === undefined){
        //         this.error('not a expected type mixin -> ' + ll.value); 
        //     }else{
        //         this.next();
        //         node = new tree.Extend();
        //         node.mixin = mixin;
        //         this.matcheNewLineOrSemeColon();
        //         return node;
        //     }
        // }
    },
    return: function(){
        this.match('AT_KEYWORD');
        this.eat('WS');
        var value = this.assignExpr(true);
        var node = new tree.ReturnStmt(value);
        this.skip('WS');
        if(value && value.type !== 'func'){
            this.matchSemiColonIfNoBlock();
        }
        return node;
    },
    // @import Ident?  url media_query_list
    // @import xx ()
    import: function(){
        var node, url, queryList,ll,la, self = this;
        this.match('AT_KEYWORD');
        this.eat('WS');
        ll = this.ll();
        la = this.la();

        if(la === 'STRING' || la ==='URL'){
            url = ll;
            this.next();
        }else{
            this.error('expect URL or STRING' + ' got '+ ll.type, ll.lineno);
        }
        this.eat('WS');
        if(!this.eat(';')){
            queryList = this.media_query_list();
            this.matchSemiColonIfNoBlock();
        }
        var node = new tree.Import(url, queryList)
            ,extname = path.extname(url.value), 
            filename, stat, p;
        if(extname === '.css'){
            if(this.get('importCSS')){

            }
        }
        if(extname !== '.css' || this.get('importCSS')){
            if(!extname) url.value += '.mcss';
            var p =this._import(url, node).done(function(ast){
                if(ast){
                    node.stylesheet = ast;
                }
            });

            this.promises.push(p);
        }
        return node;
    },
    abstract: function(){
        var la, url, ruleset;
        this.match('AT_KEYWORD');
        this.eat('WS');
        if((la = this.la()) !== '{'){
            // @abstract 'test/url.mcss'
            if(url = this.eat('STRING', 'URL')){
                var node = new tree.Import(url);
                var p =this._import(url, node).done(function(ast){
                    if(ast){
                        node.stylesheet = ast.abstract();
                    }
                });
                this.promises.push(p);
                this.matchSemiColonIfNoBlock();
                return node;
            }else{
                // @absctract tag .classname{
                //      .......
                // }
                ruleset = this.ruleset();
                ruleset.abstract = true;
                return ruleset;
            }
        // @abstarct {
        //   .......
        // }
        }else{
            var list = this.block()
                .abstract().list;
            return list;
        }
    },
    url: function(){
        return this.match('STRING', 'URL');
    },
    // ifStatement(test, cons, alt)
    // test: expression
    // block: block
    // alt: stmt
    if: function(){
        this.match('AT_KEYWORD');
        var test = this.expression(), 
            block = this.block(),alt, ll;
        this.eat('WS');
        ll = this.ll();
        if(ll.type == 'AT_KEYWORD'){
            if(ll.value === 'else'){
                this.next();
                this.eat('WS')
                alt = this.block();
            }
            if(ll.value === 'elseif'){
                alt = this.if();
            }
        }
        return new tree.IfStmt(test, block, alt);
    },
    // 'FOR' $item, $i of item1, item2, itme3...
    // 'FOR' $value, $key of key1 value1, key2 value2...
    // WARNING:
    //  mcss's hashmap is fake from valueslist
    //  __for example__
    //  $maps = 
    //      name (value, value),
    //      name2 value,
    //      name3 (value31, value32);
    //      
    // add 'by' to resolve the while requirement 
    // inspired by Roole thx :)
    for: function(){
        var element, index, list, 
            of, block, by;
        this.match('AT_KEYWORD');
        this.eat('WS');
        element = this.ll().value;
        this.match('VAR');
        if(this.eat(',')){
            index = this.ll().value;
            this.match('VAR')
        }
        this.eat('WS');
        if(this.ll().value === 'by'){
            this.next();
            this.eat('WS');
            by = this.expression();
            this.eat('WS');
        }
        of = this.match('TEXT');
        if(of.value !== 'of' && of.value !=='in'){
            this.error('for statement need of or in KEYWORD but got:' + of.value, of.lineno)   
        }
        list = this.valuesList();
        this.eat('WS');
        block = this.block();
        return new tree.ForStmt(element, index, list, block, of.value == 'in', by)
    },
    // interpolate accept expression
    // inter_exp
    //  : ident
    //  : list literal
    //  ;
        // literal: function(){

    // },
    // // list中只能有基本类型
    // list: function(){
    //     var list = [this.expression()];
    //     while(this.eat(',')){
    //         list.push(this.expression());
    //     }
    //     if(list.length ===1) return list[0];
    //     return new tree.List(list);
    // },
    // range: function(){
    //     var node = tree.Range();
    //     node.start = this.ll().value.number, end;
    //     this.match('DIMENSION');
    //     this.match('...');
    //     node.end = this.ll().value.number;
    //     return node;
    // },


    //      media
    // ==================
    // media
    //   : MEDIA media_query_list;
    //   | 
    //
    // media_query_list
    //   : media_query_list , media_query;
    //   | 

    // media_query
    //   : media_query_prefixer

    // media_query_prefixer
    //   : media_query_prefixer

    // media_query_keyword
    //   : 

    // media_query_expression
    //   : 

    media: function(){
        this.match('AT_KEYWORD');
        this.eat('WS');
        var list = this.media_query_list();
        this.skip('WS');
        var block = this.block();
        return new tree.Media(list, block)
    },
    // [<media_query>[',' <media_query>]*]?
    media_query_list: function(){
        var list = [];
        do{
            list.push(this.media_query()); 
        }while(this.eat(','))
        return list;
    },
    // [only | not]? <media_type> [and <expression>]* 
    // | <expression> [and <expression>]*
    media_query: function(){
        var expressions = [], ll, type = '';
        if(this.la() === '('){
            expressions.push(this.media_expression());
        }else{
            ll = this.ll();
            if(ll.value === 'only' || ll.value === 'not'){
                type = ll.value;
                this.next(1);
                this.eat('WS');
                ll = this.ll();
            }
            this.match('TEXT');
            type += (type? ' ': '') + ll.value;
        }
        this.eat('WS');
        while( (ll = this.ll()).type === 'TEXT'&& ll.value === 'and'){
            this.next();            
            this.eat('WS');
            expressions.push(this.media_expression());
            this.eat('WS')
        }
        return new tree.MediaQuery(type, expressions);
    },
    // '('<media_feature>[:<value>]?')'
    media_expression: function(){
        var feature,value
        this.match('(');
        this.eat('WS');
        feature = this.expression();
        if(this.eat(':')){
            value = this.valuesList();
        }
        this.eat('WS');
        this.match(')');
        return new tree.MediaExpression(feature, value);
    },
    // @font-face{font-family:name;src:<url>;sRules;}
    // "font-face": function(){
    //     this.match('AT_KEYWORD');
    //     this.eat('WS');
    //     return new tree.FontFace(this.block());
    // },
    // @keyframes <identifier> '{' keyframe* '}'
    keyframes: function(){
        var lineno = this.ll().lineno;
        this.match('AT_KEYWORD');
        this.eat('WS');
        var name = this.expression();
        if(!name) this.error('@keyframes\'s name should specify', lineno);
        if(name.type === 'FUNCTION'){
            this.eat('WS');
            this.match('(');
            this.eat('WS');
        }
        this.eat('WS');
        var block = this.block();
        // this.match('{')
        // this.eat('WS');
        // var list = [];
        // while(!this.eat('}')){
        //     list.push(this.keyframe()); 
        //     this.eat('WS');
        // }
        var node = new tree.Keyframes(name, block);
        return node
    },
    // 
    //[ [ from | to | <percentage> ] [, from | to | <percentage> ]* block ]*
    keyframe: function(){
        var steps = [];
        do{
           steps.push(this.expression());
        }
        while(this.eat(','))
        var block = this.block();
        return new tree.Keyframe(steps, block);
    },
    page: function(){
        var keyword = this.match('AT_KEYWORD');
        this.eat('WS');
        var selector = this.complexSelector().string;
        // if(/^:[-a-zA-Z]+$/.test(selector) === false) this.error('@page only accept PSEUDO_CLASS', keyword.lineno)
        this.eat('WS');
        var block = this.block();
        return tree.directive('page', tk.createToken('TEXT', selector, keyword.lineno), block);
    },
    debug: function(){
        this.match('AT_KEYWORD');
        this.eat('WS');
        var value= this.valuesList();
        var node =new tree.Debug(value);
        this.matchSemiColonIfNoBlock();
        return node;
    },
    // TODO: 对vain中的所有
    // @vain selectorList
    // @vain 'url' | url()
    // @vain block;
    vain: function(){
        var selector, block;
        this.match('AT_KEYWORD');
        this.eat('WS');
        if(this.la() !== '{'){
            selector = this.selectorList();
        }else{
            block = this.block();
        }
    },
    // ruleset
    //  :  selectorlist '{' rule ((NewLine|;) rule)* '}'

    ruleset: function(){
        var node = new tree.RuleSet(),
            rule;
        // 1. 是Selector Sep 2 
        // 2. 在是IDENT(Selector Sep之一)时后续不接: 代表不是declaration //  &&(la !== 'IDENT'|| this.la(2) !== ':'
        // @changelog: 2 remove 这不需要
        node.selector = this.selectorList();
        this.eat('WS');
        node.block = this.block();
        return node;
    },
    /**
     * 
     * @param  {Boolean} noBlock whether has '{}'
     * @return {[type]}           [description]
     */
    block: function(noBlock){
        var end = noBlock? 'EOF' :'}'
        this.eat('WS');
        var node = new tree.Block();
        if(!noBlock)this.match('{');
        this.skip('WS');
        while(!this.eat(end)){
            if(noBlock) {
                var declareOrStmt = this.stmt();
            }else{
                declareOrStmt = this.mark().declaration() || this.restore().stmt(); 
            }
            node.list.push(declareOrStmt);
            this.skipStart();
        }
        return node;
    },
    // selectorList
    //  : complexSelector (, complexSelector)*
    //  ;
    selectorList: function(){
        var node = new tree.SelectorList();
        do{
            node.list.push(this.complexSelector())
        }while(this.eat(','))
        node.lineno = node.list[0].lineno;
        return node;
    },
    // 简化处理 之允许id、class、type插值
    complexSelector: function(){
        var node = new tree.ComplexSelector();
        var selectorString = '',value;
        var i = 0, ll, interpolation, start;
        while(true){
            ll = this.ll();
            if(ll.type === '#{' && this.ll(2) !== '}'){
                interpolation = this.interpolation()
                if(interpolation){
                    selectorString += '#{' + (i++) + '}'
                    node.interpolations.push(interpolation);
                }else{
                    break;
                }
            } else if(isSelectorSep(ll.type)){
                value = ll.type === 'DIMENSION'? tree.toStr(ll) :(ll.value || (ll.type === 'WS' ? ' ' : ll.type ));
                selectorString += value;
                this.next();
            }else{
                break;
            }
        }
        node.string = selectorString; 
        node.lineno = ll.lineno;
        return node;
    },
    declaration: function(noEnd){
        var node = new tree.Declaration();
        var ll1 = this.ll(1), ll2 = this.ll(2);
        if(ll1.type === '*' && ll2.type =='TEXT'){
            this.next(1);
            ll2.value = '*' + ll2.value;
        }
        node.property = this.compoundIdent();
        // dont't start with tag  or dont't ll(2) !== ':'
        if(!node.property){
            return;
        }
        this.eat('WS')
        if(!this.eat(':')) return;
        // filter_declaration在IE下是支持一些不规则的语法
        if(node.property.value && /filter$/.test(node.property.value.toLowerCase())){
            this.enter(states.FILTER_DECLARATION)
        }
        this.enter(states.TRY_DECLARATION);
        try{
            node.value = this.valuesList();
            this.leave(states.TRY_DECLARATION);
        // if catch error
        }catch(error){
            this.leave(states.TRY_DECLARATION);
            if(error.code === errors.DECLARION_FAIL){
                return;
            }else{
                throw error;
            }
            
        }
        
        if(this.eat('IMPORTANT')){
            node.important = true;
        }
        if(!noEnd){
            this.matchSemiColonIfNoBlock();
        }
        this.leave(states.FILTER_DECLARATION)
        return node;
    },
    // 1px 1px #fff , 1px 1px #fff ...
    // comma separated values
    // valuesList
    valuesList: function(){
        var list = [], values;
        do{
            values = this.values();
            if(values) list.push(values);
            else break;
        }while(this.eat(','))
        if(list.length === 1){
            return list[0]
        }
        return new tree.ValuesList(list);
        
    },
    // component Values 
    values: function(){
        var list = [],
            value;
        while(true){
            value = this.expression();
            if(!value) break;
            // if range
            list.push(value)
        }
        if(list.length === 1) return list[0];
        if(list.length === 0) return null;
        return new tree.Values(list)
    },
    assign: function(){
        var ll = this.ll(),la,
            name = ll.value, 
            value;
        this.match('VAR');
        var op = this.match('=', '?=', '^=').type;
        value = this.assignExpr(true);
        //@FIXIT conflict with parenExpr
        return new tree.Assign(name, value, assignMap[op]||1);
    },
    /**function();
     * can be assign expression
     * function | valueslist | values
     * @param  {Boolean} hasComma whether has comma in the expression
     * @return {mixin}
     */
    assignExpr: function(hasComma){
        var la = this.la(), node, 
            fn = hasComma? 'valuesList' : 'values';
        if(la === '{') return this.func();
        // 可能是parenExpr 也可能是function
        if(la === '('){
            this.mark();
            try{
                var res =  this.func();
                return res;
            }catch(e){
                if(e.expect&& e.expect == '{' || e.expect =='VAR' || e.expect == ')'){
                    this.restore();
                    return this[fn]();
                }else{
                    throw e;
                }
            }
        }else{
            return this[hasComma? 'valuesList' :'values']();
        }
    },
    func: function(){
        var params, 
            block, lineno = this.ll().lineno;
        if(this.eat('(')){
            this.eat('WS');
            var params = this.params();
            this.match(')');
        }
        block = this.block();
        return new tree.Func(params, block);
    },
    params: function(){
        var rest = 0, params = [];
        if(this.la() !== ')'){
            do{
                var param = this.param();
                if(param.rest) rest++;
                params.push(param);
            }while(this.eat(','))
            if(rest >=2) this.error('can not have more than 2 rest param', lineno);
            this.eat('WS');
        }
        return params
    },
    // mixin' params
    param: function(){
        var ll = this.ll(),
            name = ll.value, 
            dft, rest = false;
        this.match('VAR');
        if(this.eat('...')){
            rest = true
        }
        if(this.eat('=')){
            if(rest) this.error('rest type param can"t have default params', ll)
            dft = this.values();
        }
        return new tree.Param(name, dft, rest);
    },
    expression: function(){
        this.eat('WS');
        return this.logicOrExpr();
    },
    // || 
    logicOrExpr: function(){
        var left = this.logicAndExpr(), ll,la, right;
        while((la = this.la()) === '||'){
            this.next();
            right = this.logicAndExpr();
            if(!right) this.error(la + ' require right operand', left)
            var bValue = tree.toBoolean(left)
            if(bValue != null){
                if(bValue === false){
                    left = right;
                }
            }else{
                left = new tree.Operator(la, left, right)
            }
            this.eat('WS');
        }
        return left;
    },
    // &&
    logicAndExpr: function(){
        var node = this.relationExpr(), ll,la, right;
        while((la = this.la()) === '&&'){
            this.next();
            right = this.relationExpr();
            if(!right) this.error(la + ' require right operand', node)
            var bValue = tree.toBoolean(node)
            if(bValue != null){
                if(bValue === true){
                    node = right;
                }
            }else{
                node = new tree.Operator(la, node, right)
            }
            this.eat('WS');
        }
        return node;
    },
    // ==
    // !=
    // >=
    // <=
    // >
    // <
    relationExpr: function(){
        var left = this.binop1(),la, right;
        while(isRelationOp(la = this.la())){
            this.next();
            this.eat('WS');
            right = this.binop1();
            if(!right) this.error(la + ' require right operand', left)
            if(tree.isPrimary(left.type) && tree.isPrimary(right.type)){
                left = binop.relation.call(this,left, right, la)
            }else{
                left = new tree.Operator(la, left, right)
            }
            this.eat('WS');
        }
        return left;
    },
    // range: function(){
    //     var left = this.ll(),
    //         node = new tree.ValuesList(),
    //         right, lc, rc, reverse;
    //     this.match('DIMENSION')
    //     this.eat('...');
    //     right = this.ll();
    //     this.match(left.type);
    //     lc = left.value;
    //     rc = right.value;
    //     reverse = lc > rc;

    //     for(; lc != rc ;){
    //         node.list.push({
    //             type: left.type,
    //             value: lc
    //         })
    //         if(reverse)  lc -= 1
    //         else lc += 1
    //     }
    //     node.list.push({
    //         type: left.type,
    //         value: lc
    //     })
    //     return node;
    // },

    // + - 
    binop1: function(){
        var left = this.binop2(), right, la, ll;
        this.eat('WS')
        while((la = this.la()) === '+' 
                || la === '-'){
            this.next();
            this.eat('WS');
            right = this.binop2();
            if(!right) this.error(la + ' require right operand', left)
            if(right.type === 'DIMENSION' 
                && left.type === 'DIMENSION'){
                left = binop[la].call(this, left, right);
            }else{
                left = new tree.Operator(la, left, right)
            }
            this.eat('WS');
        }
        return left;

    },
    // * / % ... (@TODO 将range与binop2结合, 即同一优先级)
    binop2: function(){
        var left = this.unary(), right, la, ws;
        if(this.eat('WS')) ws = true;
        la = this.la();
        if(la === '...'){
            this.next();
            this.eat('WS');
            right = this.unary()
            return tree.range(left, right, left.lineno);
        }
        while(la === '*' 
                || la === '/' || la === '%'){
            // 即一个空格也没有
            if(la == '/' && !ws && this.la(2) !== 'WS'){
                return left;
            }
            this.next();
            this.eat('WS');
            right = this.unary();
            if(!right) this.error(la + ' require right operand', left)
            if(right.type === 'DIMENSION' 
                && left.type === 'DIMENSION'){
                left = binop[la].call(this,left, right);
            }else{
                left = new tree.Operator(la, left, right)
            }
            this.eat('WS');
            la = this.la();
        }
        return left;
    },
    // 一元数
    // @TODO : 加入 ！一元数
    unary: function(){
        var ll=this.ll(), value, la;
        if((la = ll.type) === '-' || la === '+' || la === '!' ){
            this.next();
            this.eat('WS');
            value = this.unary();
            var node = new tree.Unary(value, la);
            node.lineno = ll.lineno;
            return node;
        }else{
            return this.primary();
        }
    },
    // primar   y
    //  : Ident
    //  : Dimension
    //  : function
    //  : Var
    primary: function(){
        var ll = this.ll(), node, value;
        switch(ll.type){
            case '(':
                return this.parenExpr();
            case '=':
                // filter: alpha(xx=80, xx=xx, ddd=xx)
                if(this.state(states.FILTER_DECLARATION) 
                    && this.state(states.FUNCTION_CALL)){
                    this.next();
                    return ll
                }
                break;
            case '/':
                this.next();
                return ll;
            case '-':
                var ll2 = this.ll(2);
                if(ll2.type === 'TEXT' || ll2.type === '#{'){
                    return this.CompoundIdent()
                }
            case '#{':
            case 'TEXT':
                return this.compoundIdent()
            case 'FUNCTION':
                return this.fnCall();
            case 'HASH':
                this.next();
                value = ll.value;
                if(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)){
                    node = new tree.Color(value);
                    node.lineno = ll.lineno;
                }else{
                    node = new tree.Unknown(ll.value);
                }
                return node;
            // TODO 插值
            case 'STRING':
            case 'DIMENSION':
            case 'BOOLEAN':
            case 'VAR':
            case 'NULL':
            case 'URL':
                this.next()
                return ll;
            case '>':
            case '~':
            case '+':
            case '.':
            case '#':
            case '&':
            case '{':
            case ':':
            case '*':
            case 'PSEUDO_CLASS':
            case 'CLASS':
            case 'ATTRIBUTE':
                if(this.state(states.TRY_DECLARATION)){
                    this.error(errors.DECLARION_FAIL);
                    break;
                }
                
            default:
                return null;
        }

    },
    // parenExpr
    //  : '(' expresion ')'
    parenExpr: function(){
        this.match('(');
        this.eat('WS');
        var lineno = this.ll().lineno;
        var node = this.valuesList();
        node.lineno = lineno;
        this.eat('WS');
        this.match(')');
        return node;
    },
    // compoundIdent 组合Ident
    //  : (interpolation| TEXT) +
    compoundIdent: function(){
        var list =[] , ll, sep, node,
            slineno = this.ll().lineno;
        while(true){
            ll = this.ll();
            if(ll.type === '#{'){
                sep = this.interpolation();
                list.push(sep)
            }else if(ll.type === 'TEXT' || ll.type === '-'){
                this.next();
                list.push(ll.value || ll.type)
            }
            else break;
        }
        if(!sep){
            if(!list.length) return null;
            return {
                type: 'TEXT',
                value: list[0],     
                lineno: slineno
            }
        }else{
            node = new tree.CompoundIdent(list)
            node.lineno = slineno;
            return node;
        }
    },
    //  : '#{' values '}'
    interpolation: function(){
        var node;
        this.match('#{')
        node = this.valuesList();
        this.match('}')
        return node;
    },
    // fnCall 
    //  : FUNCTION '('  expresion * ')'
    fnCall: function(){
        var ll = this.ll(),
            name = ll.value, pargs;
        this.match('FUNCTION', 'VAR');
        if(ll.args){
            return tree.call(name, ll.args, null, ll.lineno)
        }
        this.eat('WS');
        this.match('(');
        this.enter(states.FUNCTION_CALL);
        this.eat('WS');
        var la = this.la();
        if(la !== ')'){
            pargs = this.args();
        }else{
            pargs = {args:[]}
        }
        this.leave(states.FUNCTION_CALL);
        this.match(')');
        var node = tree.call(name, pargs.args, pargs.named, ll.lineno);
        return node;
    },
    //@TODO start named arguments
    args: function(end){
        var ll, expr,
            args = [],
            named = null,i = 0;

        do{
            var ll = this.ll();
            if(ll.type === 'VAR' && this.la(2) === '='){
                this.next(2);
                if(!named) named = {};
                named[ll.value] = i;
            }
            args.push(this.assignExpr())
            this.skip('WS');
            i++;
        }while(this.eat(','))

        return {
            args: args,
            named: named
        }
    },
    // stylus inspired feature;
    transparentCall: function(){
        var ll = this.ll();
        var name = ll.value;
        this.match('VAR');
        this.match(':');
        this.eat('WS')
        var pargs = this.args();
        // if(args.type === 'values'){
        //     args = new tree.ValuesList(args.list);
        // }

        // if(args.type !== 'valueslist') args = [args];
        // else args = args.list;
        return tree.call(name, pargs.args, pargs.named, ll.lineno);
    },
    // private function
    // inspect lookahead array
    _lookahead: function(){
        return this.lookahead.map(function(item){
            return item.type
        }).join(',')
    },

    /**
     * pass a filename(any format, nec/reset.mcss, etc) get a promise to detect success
     * any atrule want to load other module will use this method
     * _import also has some operating to exec;
     * 
     * @param  {String} url       the file(path or url) to load
     * @return {promise}          the parse promise
     *                            the promise doneCallback will accept a ast parsed by parser
     */
    _import: function(url, node){
        var pathes = this.get('pathes'),
            extname = path.extname(url.value);
        // // the promise passed to this.promises
        //     readyPromise = promise();

        // browser env is not support include
        if(!path.isFake && pathes.length && isProbablyModulePath(url.value)){
            var inModule = pathes.some(function(item){
                filename = path.join(item, url.value);
                try{
                    stat = fs.statSync(filename);
                    if(stat.isFile()) return true;
                }catch(e){}
            })
        }
        if(!inModule){
            //@TODO is abs
            if(/^\/|:\//.test(url.value)){//abs
                var filename = url.value;
                if(/^(https|http):\/\//.test(filename)){
                    var isRemote = true
                }
            }else{//relative
                var base = path.dirname(this.options.filename),filename;
                if(/^(https|http):\/\//.test(base) && sysUrl){
                    filename = sysUrl.resolve(this.options.filename, url.value)
                    isRemote = true;
                }else{
                    filename = path.join(base, url.value);
                }
            }
        }

        filename += (extname? '':'.mcss');
        var options = _.extend({filename: filename}, this.options);
        var self = this;
        // beacuse  parser is stateless(all symbol & scope defined in interpret step)
        // mcss' require-chain's checking is veryeasy
        var _requires = this.get('_requires');
        if(_requires && ~_requires.indexOf(filename)){
            this.error('it is seems file:"' + filename + '" and file: "'+this.get('filename')+'" has Circular dependencies', url.lineno);
        }

        options._requires = _requires? 
            _requires.concat([this.get('filename')]):
            [this.get('filename')];

        var pr = promise();
        var imports = this.get('imports'), 
            text = imports[filename];
        // in cache now;
        // @TODO, allow import twice? 
        if(typeof text === 'string' || (isRemote && (text = remoteFileCache.get(filename))) ){
            new Parser(options).parse(text).always(pr);
        }else{
            io.get(filename).done(function(text){
                if(isRemote){
                    remoteFileCache.set(filename, text);
                }else{
                    imports[filename] = text;
                }
                
                new Parser(options).parse(text).always(pr).fail(pr);
            }).fail(function(){
                var err = new error.SyntaxError(filename + ' FILE NOT FOUND', url.lineno, self.options);
                pr.reject(err)
            })
        }
        // @TODO 修改为只检查文件 io.get
        return pr.done(function(ast){
                node.filename = filename;
            })
    },

    /**
     * remove at-rule的prefix
     */
    _removePrefix: function(str){
        return str.replace(/^-\w+-/, '');
    }
}

options.mixTo(Parser);

