// ### TODO:


var util = require('./helper/util');
var tree = require('./node');
var error = require('./error');
var slice = [].slice;



/**
 * register regexp pattern
 * @return {[type]} [description]
 */
var $ = (function(){
    var table = {}
    return function(name, pattern){
        if(!pattern){
            // $('WS')
            if(/^[a-zA-Z]+$/.test(name)){
                return table[name];
            }
            pattern = name;
            name = null;
        }
        if(typeof pattern !== 'string'){
            pattern = String(pattern).slice(1,-1);
        }
        pattern = pattern.replace(/\{([a-zA-Z]+)}/g, function(all, name){
            var p = table[name];
            if(!p) throw Error('no register pattern "'+name+'" before')
            var pstart = p.charAt(0),
                pend = p.charAt(p.length-1);
            if(!(pstart === '[' && pend === ']') 
                && !(pstart ==='(' && pend === ')') ){
                p = '(?:' + p + ')' 
            }
            return p;
        })
        if(name) table[name] = pattern;
        return new RegExp(pattern);
    }
})();

// local var or util function
var toAssert = function(str){
    var arr = typeof str == "string" ? str.split(/\s+/) : str,
        regexp = new RegExp("^(?:" + arr.join("|") + ")$");

    return function(word){
      return regexp.test(word);
    }
};
    // the more fast version
var toAssert2 = util.makePredicate;


// create Token
function createToken(type, value, lineno){
    var token = typeof type === 'object'? type : {type: type, value: value}
    token.lineno = lineno;
    return token;
}


// tokenizer function

exports.tokenize = function(input, options){
    return new Tokenizer(options).tokenize(input);
}

exports.Tokenizer = Tokenizer;
exports.$ = $;
exports.createToken = createToken;


// Token Types
// ===========================================

// // inspectToken, get tokenName with TokenType(uid)
// tokenizer.inspect = function(tokenType){
//     var typeType = tokenType.type || tokenType;
//     for(var i in tokenizer){
//         if(typeof tokenizer[i] === 'number' && tokenizer[i] === tokenType) return i;
//     }
// }




// var VARIABLE = tokenizer.VARIABLE


// // NESS KEYWORD

var isUnit = toAssert2("% em ex ch rem vw vh vmin vmax cm mm in pt pc px deg grad rad turn s ms Hz kHz dpi dpcm dppx");
// var isPseudoClass = toAssert2(["dir","lang","any-link", "link", "visited", "local-link","target", "scope", "current", "past", "future", "active", "hover", "focus", "active-drop", "valid-drop", "invalid-drop", "enabled", "disabled", "enabled", "disabled", "read-only", "read-write", "placeholder-shown", "default", "checked", "indeterminate", "valid", "invalid", "in-range", "out-of-range", "required", "optional", "root", "empty", "blank", "nth-child", "nth-last-child", "first-child", "last-child", "only-child", "nth-of-type", "nth-last-of-type", "first-of-type", "last-of-type", "only-of-type", "nth-match", "nth-last-match", 'nth-column', 'nth-last-column', 'not', 'matches', 'before', 'after', '-moz-placeholder']);
// var isBifs = toAssert2(bifs.concat(['rgb', 'rgba', 'url', 'counter', 'attr', 'calc', 'min', 'max', 'cycle', 'linear-gradient', 'radial-gradient', 'repeating-linear-gradient', 'repeating-radial-gradient']), true)
// color keywords
var isPseudoClassWithParen = toAssert2('current local-link nth-child nth-last-child nth-of-type nth-last-of-type nth-match nth-last-match column nth-column nth-last-column lang matches not', true)


//http://dev.w3.org/csswg/css-syntax/#maximum-allowed-codepoint
var MAX_ALLOWED_CODEPOINT = parseInt('10FFFF',16);
var REPLACEMENT_CHARACTER = parseInt('FFFD', 16);


// http://www.w3.org/TR/css3-syntax/#lexical











var $rules = [];
var $links = {};

var addRules = function(rules){
    $rules = $rules.concat(rules)
    var rule, reg, state, link, retain;

    for(var i = 0; i< $rules.length; i++){
        rule = $rules[i];
        reg = typeof rule.regexp !== 'string'? String(rule.regexp).slice(1, -1): rule.regexp;
        if(!~reg.indexOf("^(?")){
            rule.regexp = new RegExp("^(?:" + reg + ")");
        }
        state = rule.state || 'init';
        link = $links[state] || ($links[state] = []);
        link.push(i);
    }
    return this;
}

// $('h',/[0-9a-f]/);

// // new line
// $('nonascii', /[\200-\377]/);
// $('unicode', /\\{h}{1,6}[ \t\r\n\f]?/);
// $('escape', /{unicode}|\\[ -~\200-\377]/);
// $('name', /{nmchar}+/)
// $('num', /[0-9]+|[0-9]*\.[0-9]+/);
// // $('url', /([-!#\$%&*~]|{nonascii}|{escape})*/);
// $('range', /\?{1,6}|{h}(\?{0,5}|{h}(\?{0,4}|{h}(\?{0,3}|{h}(\?{0,2}|{h}(\??|{h})))))/)


// // punctor
// $('arith', /[+-*\/=]/)
// $('logic', /&&|\|\|/)
// $('punctor', )
// $('opunctor')
// [ \t\r\n\f]+        {return S;}

// \/\*[^*]*\*+([^/][^*]*\*+)*\/   /* ignore comments */


// "~="            {return INCLUDES;}
// "|="            {return DASHMATCH;}


// {string}        {return STRING;}

// {ident}         {return IDENT;}

// "#"{name}       {return HASH;}

// "@import"       {return IMPORT_SYM;}
// "@page"         {return PAGE_SYM;}
// "@media"        {return MEDIA_SYM;}
// "@font-face"        {return FONT_FACE_SYM;}
// "@charset"      {return CHARSET_SYM;}
// "@namespace"        {return NAMESPACE_SYM;}

// "!{w}important"     {return IMPORTANT_SYM;}

// registed macros
// =====================



// newline
$('nl', /\r\n|[\r\f\n]/);
// whitespce
$('w', /[ \t\r\n\f]/);
$('d', /[0-9]/);
$('escape', /\\[0-9a-f]{1,6}/);
$('nmchar', /[_-\w\u00A1-\uFFFF]|{escape}/);
// single line or multiline comment
$('nmstart',/[_a-zA-Z\u00A1-\uFFFF]|{escape}/ );
$('ident', /-?{nmstart}{nmchar}*/);



addRules([

    {   //Multiline Comment | singleline scomment
        
        regexp: /\/\*([^\x00]+?)\*\/|\/\/([^\n\r]*)/,
        action: function(yytext, mcomment, scomment){
            var isSingle = mcomment === undefined
            if(this.options.comment){
                this.options.comment({
                    type: isSingle ? 'singleline': 'multiline',
                    content: isSingle? scomment : mcomment
                })
            }
        }
    },
    {   //Url http://dev.w3.org/csswg/css-syntax/#function-diagram
        regexp: $(/(url|url\-prefix|domain|regexp){w}*\((['"])?{w}*([^\r\n\f]*?)\2{w}*\)/),
        action: function(yytext, name , quote, url){
            this.yyval = url;
            if(name === 'url') return 'URL'
            return {
                type: 'FUNCTION',
                value: name,
                args: [{type: 'STRING', value: url}]
            }
        }
    },
    {   //Function http://dev.w3.org/csswg/css-syntax/#function-diagram
        regexp: $(/(?:\$?-?[_A-Za-z][-_\w]*)(?=\()/),
        action: function(yytext){
            this.yyval = yytext;
            return 'FUNCTION';
        }
    },
    {
        // $  variable 
        regexp: /\$(-?[_A-Za-z][-_\w]*)/,
        action: function(yytext, value){
            this.yyval = yytext;
            return 'VAR'
        }
    },
    {   //IDENT http://dev.w3.org/csswg/css-syntax/#ident-diagram
        // 即 -o-webkit-xx 是允许的
        regexp: $(/{ident}/),
        action: function(yytext){
            if(yytext === 'false' || yytext === 'true'){
                this.yyval = yytext === 'false'? false : true;
                return 'BOOLEAN'
            }
            this.yyval = yytext;
            if(yytext === 'null') return 'NULL'
            return 'TEXT';
        }
    },

    // {   // @css atrule no parse
    //     reg: /@css{w}*{/,
    //     action: function(yytext){
    //     }
    // },
    {   // DIMENSION NUMBER + UNIT
        //
        regexp: $(/(-?(?:{d}*\.{d}+|{d}+))(\w*|%)?/),
        action: function(yytext, value, unit){
            if(unit && !isUnit(unit)){
                this.error('Unexcept unit: "' + unit + '"');
            }
            return {
                type: 'DIMENSION',
                value: parseFloat(value),
                unit: unit
            }
        }
    },
    {
        // class
        regexp: $(/\.({nmchar}+)/),
        action: function(yytext){
            this.yyval = yytext
            return 'CLASS';
        }
    },
    {
        // @  alt word
        regexp: /@(-?[_A-Za-z][-_\w]*)/,
        action: function(yytext, value){
            this.yyval = value;
            return 'AT_KEYWORD'
        }
    },

    {   //!important
        regexp: $(/!{w}*important/),
        action: function(yytext){
            return 'IMPORTANT';
            }
    },
    {   // pesudo-class
        regexp: $(":([-_a-zA-Z]+)" + //伪类名
            "(?:\\(" + //括号开始
            "([^\\(\\)]*" + //第一种无括号
            "|(?:" + //有括号(即伪类中仍有伪类并且是带括号的)
            "\\([^\\)]+\\)" + //括号部分
            /*"|[^\\(\\)]*" +*/ ")+)" + //关闭有括号
            "\\))"),
        action: function(yytext, value){
            // false 使用其它方式再token一次
            if((~yytext.indexOf('(')) && !isPseudoClassWithParen(value)){
                return false
            }
            this.yyval = yytext;
            return 'PSEUDO_CLASS';
        }
    },
    {   // pesudo-element
        regexp: $("::({nmchar}+)"),
        action: function(yytext){
            this.yyval = yytext;
            return 'PSEUDO_ELEMENT';
        }
    },
    {   // attribute   [title=haha]
        regexp: $("\\[\\s*(?:{nmchar}+)\\s*(?:([*^$|~!]?=)\\s*[\'\"]?(?:[^\'\"\\[]*)[\'\"]?)?\\s*\\]"),
        action: function(yytext){
            this.yyval = yytext;
            return 'ATTRIBUTE';
        }
    },
    {   // RGBA, RGB, 这里注意与selector的区分
        // regexp: /#([0-9a-f]{3} [0-9a-f]{6})(?![#\*.\[:a-zA-Z])/,
        // action: function(yytext, value){
        //     this.yyval = value;
        //     return value.length === 3? 'RGB' : 'RGBA';
        // }
        regexp: $(/#{nmchar}+/),
        action: function(yytext, value){
            this.yyval = yytext;
            return 'HASH';
        }
    },
    {   // String
        regexp: /(['"])([^\r\n\f]*?)\1/,
        action: function(yytext, quote, value){
            this.yyval = value || '';
            return 'STRING';
        }

    },
    {   // punctor can ignore 'WS'
        regexp: $(/{w}*(&&|\|\||[\*\$\^~\|>=<!?]?=|\.\.\.|[\{;,><]){w}*/),
        action: function(yytext, punctuator){
            return punctuator;
        }

    },
    {
          regexp: $('WS',/{w}+/),
          action: function(){
              return 'WS'
          }
    },
    {   
        // punctor | operator | logic | other
        // .. ::  
        // []{}() ; , : & #
        // ->     
        // *= // $= // ^= ~= |= 
        // >= <= == != =
        // < > / * + -
        // ..  or .
        regexp: /($|#\{|:|::|[~!#()\[\]&\.]|[\}%\-+*\/])/,
        action: function(yytext, punctuator){
            if(!punctuator) return 'EOF';
            return punctuator;
        }
    },
    {   // escaped unicode conver to TEXT
        regexp: $(/\\([0-9a-fA-F]{1,6})/),
        action: function(yytext, value){
            var hex = parseInt(value, 16);
            if(hex > MAX_ALLOWED_CODEPOINT){
                hex = '\uFFFD';
            }
            hex = '\\' + hex.toString(16);
            this.yyval = hex;
            return 'TEXT';
        }
    }

    // sub state 
    // --------------------------------
]);



/**
 * Tokenizer Class
 * @param {[type]} input   [description]
 * @param {[type]} options [description]
 */
function Tokenizer(options){
    this.options = options || {};
    this.options.ignoreComment = true;
}



Tokenizer.prototype = {
    constructor: Tokenizer,
    tokenize: function(input){
        // @TODO: options
        //simplify newline token detect
        this.input = input
        // remained input
        this.remained = this.input;
        this.length = this.input.length;
        this.lineno = 1;
        this.states = ['init'];
        this.state = 'init';
        return this.pump()
    },
    // 依赖next
    lex: function(){
        var token = this.next();
        if (typeof token !== 'undefined') {
            // console.log(token)
            return token;
        } else {
            return this.lex();
        }
    },
    // 一次性输出所有tokens
    pump: function(){
        var tokens = [], t;
        var i = 0;
        while(t = this.lex()){
            i++;
            tokens.push(t);
            if(t.type == 'EOF') break;
        }
        return tokens;
    },
    // get the latest state
    next: function(){
        var tmp, action, rule, token,
            tokenType, lines,
            state = this.state,
            rules = $rules,
            link = $links[state];
        // if(!link) throw Error('no state: ' + state + ' defined');
        this.yyval = null;
        var len = link.length;
        for(var i = 0; i < len; i++){
            var rule = $rules[link[i]];
            tmp = this.remained.match(rule.regexp);
            if(tmp){
                action = rule.action;
                tokenType = action.apply(this, tmp);
                if(tokenType === false){
                    continue;
                }
                else break
            }
        }
        if(tmp){
            lines = tmp[0].match(/(?:\r\n|[\n\r\f]).*/g);
            if(lines) this.lineno += lines.length;
            this.remained = this.remained.slice(tmp[0].length);
            if(tokenType){
                token = createToken(tokenType, this.yyval, this.lineno);
                if(tokenType === 'WS'){
                    if(this._preIsWS){
                        token = undefined
                    }
                    this._preIsWS = true;
                }else{
                    this._preIsWS = false;
                }
            }
            return token;
        }else{
            this.error('Unexpect token start')
        }
    },
    // TODO:
    pushState:function(condition){
        this.states.push(condition);
        this.state = condition;
    },
    // TODO:
    popState:function(){
        this.states.pop();
        this.state = this.states[this.states.length-1];
    },
    /**
     * [error description]
     * @return {[type]} [description]
     */
    error: function(message){
        var line = this.lineno;
        var err = new error.SyntaxError(message, line, this.options)
        err.column = this._getColumn();
        throw err;
    },
    _getColumn: function(){
        var newline = /^[\n\f\r]/;
        var n = this.length - this.remained.length, 
            column = 0, line;
        for(; n--;){
            if(newline.test(this.input.charAt(n)) && n >= 0) break;
            column ++;
        }
        return column;
    }
    // _traceError: function(message){
    //     var matchLength = this.length - this.remained.length;
    //     var offset = matchLength - 10;
    //     if(offset < 0) offset = 0;
    //     var pointer = matchLength - offset;
    //     var posMessage = this.input.slice(offset, offset + 20)
    //     // TODO: 加上trace info
    //     return 'Error on line ' + (this.lineno + 1) + " " +
    //         (message || '. Unrecognized input.') + "\n" + (offset === 0? '':'...') +
    //         posMessage + "...\n" + new Array(pointer + (offset === 0? 0 : 3) ).join(' ') + new Array(10).join("^");
    // }
}

