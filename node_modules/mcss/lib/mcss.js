var Parser = require('./parser');
var Interpreter = require('./interpreter');
var Translator = require('./translator');
var tk = require('./tokenizer');
var promise = require('./helper/promise');
var functions = require('./functions');
var path = require('./helper/path');
var _ = require('./helper/util');
var io = require('./helper/io');
var options = require('./helper/options');
var error = require('./error');
var hooks = require('./hooks');
var helper = require('./helper');
var state = require('./state');


/**
 * 包装成stylus一样的接口口
 */


function Mcss(options){
    if(typeof options.prefix === 'string'){
        options.prefix = options.prefix.split(/\s+/);
    }
    this.options = _.extend(options, {
        imports: {},
        importCSS: false,
        pathes: [],
        walkers: [],
        format: 1,
        sourcemap:false
    });
    var walkers = this.get('walkers');
    if(!Array.isArray(walkers)) walkers = [walkers]
    this.set('walkers' , walkers.map(function(hook){
        if(typeof hook === 'string'){
            hook = hooks[hook];
        }
        return hook;
    }));
}

var m = options.mixTo(Mcss);

/**
 * set options
 * @return {[type]} [description]
 */


m.include = function(path){
    var pathes = this.get('pathes');
    if(Array.isArray(path)){
        this.set('pathes', pathes.concat(path)) 
    }else{
        pathes.push(path);
    }
    
    return this;
}

m.walk = function(type){
    if(typeof type === 'string'){
        walker = {};
        walker[type] = arguments[1];
    }else{
        walker = type;
    }
    this.get('walkers').push(walker)
    return this;
}


/**
 * define 变量或函数, 一般在初始化环境时调用
 */
m.define = _.msetter(function(key, value){
    if(typeof value === 'function'){
        functions[key] === value;
    }
    return this;
});

/**
 * 词法分析
 * @param  {[type]} text [description]
 * @return {[type]}      [description]
 */
m.tokenize = function(text){
    return tk.tokenize(text, this.options);
}





/**
 * 解析Parser
 * @param  {String} text 如果已经在mcss实例中传入了filename并且存在可以不传入text 
 * @return {[type]}
 */
m.parse = function(text){
    var options = this.options,
        parser = new Parser(this.options),
        fp, pr = promise();

    if(text === undefined){
        if(this.get('filename')){
            fp = io.parse(this.options.filename, this.options);
        }else{
            throw Error('text or filename is required') 
        }
    }else{
        fp = parser.parse(text)
    }
    fp.always(pr)
    return pr;
}

/**
 * 解析并输出AST，ast中只包含标准CSS的节点
 * @param  {String|Null} text 如果已经在mcss实例中传入了filename并且存在可以不传入text
 * @return {Stylesheet}
 */
m.interpret = function(text){
    var options  = this.options;
    var interpreter = new Interpreter(options);
    var pr = promise();
    var walkers = options.walkers;
    if(walkers.length){
        walkers.forEach(function(hook){
            hook && interpreter.on(hook);
        })
    }
    this.parse(text).done(function(ast){
        try{
            ast = interpreter.interpret(ast)
            pr.resolve(ast)
        }catch(e){
            pr.reject(e);
        }
    }).fail(pr)
    return pr;
}

//@TODO 整合interpreter与translate的逻辑
m.translate = function(text){
    var options = this.options;
    var translator = new Translator(options);
    var interpreter = new Interpreter(options);
    var pr = promise();
        // 注册walker事件
    var walkers = options.walkers;
    if(walkers.length){
        walkers.forEach(function(hook){
            hook && interpreter.on(hook);
        })
    }
    this.parse(text).done(function(ast){
        var date = Date.now();
        try{
            ast = interpreter.interpret(ast)
            pr.resolve(translator.translate(ast));
        }catch(e){
            pr.reject(e);
        }
    }).fail(pr);
    return pr;
}

var mcss = module.exports = function(options){
    return new Mcss(options || {})
}

// constructor
mcss.Parser = Parser;
mcss.Interpreter = Interpreter;
mcss.Translator = Translator;
mcss.Tokenizer = tk.Tokenizer;
mcss.node =  require('./node');


// usefull util
mcss.io = io;
mcss.promise = promise;
mcss._ = _;
mcss.error = error;
mcss.path = path;
mcss.helper = helper;
mcss.state = state;

// @TODO  connenct middle wire
mcss.connect = function(options){

    return function(){

    }
}

