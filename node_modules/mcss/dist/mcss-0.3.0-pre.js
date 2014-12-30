var mcss;
(function (modules) {
    var cache = {}, require = function (id) {
            var module = cache[id];
            if (!module) {
                module = cache[id] = {};
                var exports = module.exports = {};
                modules[id].call(exports, require, module, exports, window);
            }
            return module.exports;
        };
    mcss = require('0');
}({
    '0': function (require, module, exports, global) {
        var mcss = module.exports = require('1');
        mcss.env = 'BROWSER';
        var options = global.mcssOptions || {};
        var path = mcss.path;
        var io = mcss.io;
        var $ = function (selector) {
            return mcss._.slice(document.querySelectorAll(selector));
        };
        var text = function (node) {
            return node.innerText || node.contentText;
        };
        $('link[rel="stylesheet/mcss"], style[type="text/mcss"]').forEach(function (node) {
            var nodename = node.nodeName.toLowerCase();
            var style = document.createElement('style');
            document.head.appendChild(style);
            if (nodename === 'link') {
                var filename = path.join(path.dirname(location.pathname), node.getAttribute('href'));
                io.get(filename).done(function (text) {
                    mcss({ filename: filename }).translate(text).done(function (mcssContent) {
                        style.textContent = mcssContent;
                    }).fail(function (error) {
                        mcss.error.format(error);
                        console.error(error.message);
                    });
                }).fail(function (error) {
                });
            } else {
                var filename = location.pathname;
                mcss({ filename: filename }).translate(text(node)).done(function (mcssContent) {
                    style.textContent = mcssContent;
                }).fail(function (error) {
                    mcss.error.format(error);
                    console.error(error.message);
                });
            }
            document.head.removeChild(node);
        });
    },
    '1': function (require, module, exports, global) {
        var Parser = require('2');
        var Interpreter = require('24');
        var Translator = require('2a');
        var tk = require('3');
        var promise = require('e');
        var functions = require('29');
        var path = require('6');
        var _ = require('4');
        var io = require('i');
        var options = require('f');
        var error = require('a');
        var hooks = require('2d');
        var helper = require('2h');
        var state = require('h');
        function Mcss(options) {
            if (typeof options.prefix === 'string') {
                options.prefix = options.prefix.split(/\s+/);
            }
            this.options = _.extend(options, {
                imports: {},
                importCSS: false,
                pathes: [],
                walkers: [],
                format: 1,
                sourcemap: false
            });
            var walkers = this.get('walkers');
            if (!Array.isArray(walkers))
                walkers = [walkers];
            this.set('walkers', walkers.map(function (hook) {
                if (typeof hook === 'string') {
                    hook = hooks[hook];
                }
                return hook;
            }));
        }
        var m = options.mixTo(Mcss);
        m.include = function (path) {
            var pathes = this.get('pathes');
            if (Array.isArray(path)) {
                this.set('pathes', pathes.concat(path));
            } else {
                pathes.push(path);
            }
            return this;
        };
        m.walk = function (type) {
            if (typeof type === 'string') {
                walker = {};
                walker[type] = arguments[1];
            } else {
                walker = type;
            }
            this.get('walkers').push(walker);
            return this;
        };
        m.define = function (key, value) {
            if (typeof value === 'function') {
                functions[key] === value;
            }
            return this;
        }.__msetter();
        m.tokenize = function (text) {
            return tk.tokenize(text, this.options);
        };
        m.parse = function (text) {
            var options = this.options, parser = new Parser(this.options), fp, pr = promise();
            if (text === undefined) {
                if (this.get('filename')) {
                    fp = io.parse(this.options.filename, this.options);
                } else {
                    throw Error('text or filename is required');
                }
            } else {
                fp = parser.parse(text);
            }
            fp.always(pr);
            return pr;
        };
        m.interpret = function (text) {
            var options = this.options;
            var interpreter = new Interpreter(options);
            var pr = promise();
            var walkers = options.walkers;
            if (walkers.length) {
                walkers.forEach(function (hook) {
                    hook && interpreter.on(hook);
                });
            }
            this.parse(text).done(function (ast) {
                try {
                    ast = interpreter.interpret(ast);
                    pr.resolve(ast);
                } catch (e) {
                    pr.reject(e);
                }
            }).fail(pr);
            return pr;
        };
        m.translate = function (text) {
            var options = this.options;
            var translator = new Translator(options);
            var interpreter = new Interpreter(options);
            var pr = promise();
            var walkers = options.walkers;
            if (walkers.length) {
                walkers.forEach(function (hook) {
                    hook && interpreter.on(hook);
                });
            }
            this.parse(text).done(function (ast) {
                var date = Date.now();
                try {
                    ast = interpreter.interpret(ast);
                    pr.resolve(translator.translate(ast));
                } catch (e) {
                    pr.reject(e);
                }
            }).fail(pr);
            return pr;
        };
        var mcss = module.exports = function (options) {
                return new Mcss(options || {});
            };
        mcss.Parser = Parser;
        mcss.Interpreter = Interpreter;
        mcss.Translator = Translator;
        mcss.Tokenizer = tk.Tokenizer;
        mcss.node = require('8');
        mcss.io = io;
        mcss.promise = promise;
        mcss._ = _;
        mcss.error = error;
        mcss.path = path;
        mcss.helper = helper;
        mcss.state = state;
        mcss.connect = function (options) {
            return function () {
            };
        };
    },
    '2': function (require, module, exports, global) {
        module.exports = Parser;
        var tk = require('3');
        var tree = require('8');
        var directive = require('c');
        var _ = require('4');
        var binop = require('d');
        var promise = require('e');
        var options = require('f');
        var path = require('6');
        var fs = null;
        var sysUrl = null;
        var symtab = require('g');
        var state = require('h');
        var error = require('a');
        var io = require('i');
        var remoteFileCache = state.remoteFileCache;
        var perror = new Error();
        var slice = [].slice;
        var errors = {
                INTERPOLATE_FAIL: 1,
                DECLARION_FAIL: 2,
                FILE_NOT_FOUND: 3
            };
        var combos = [
                'WS',
                '>',
                '~',
                '+'
            ];
        var skipStart = 'WS NEWLINE COMMENT ;';
        var operators = '+ - * /';
        var isSkipStart = _.makePredicate(skipStart);
        var isCombo = _.makePredicate(combos);
        var isSelectorSep = _.makePredicate(combos.concat([
                'PSEUDO_CLASS',
                'PSEUDO_ELEMENT',
                'ATTRIBUTE',
                'CLASS',
                'HASH',
                '&',
                'TEXT',
                '*',
                '#',
                '#{',
                ':',
                '.',
                '%',
                '-',
                'compoundident',
                'DIMENSION'
            ]));
        var isOperator = _.makePredicate(operators);
        var isColor = _.makePredicate('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgrey darkgreen darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray grey green greenyellow honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgrey lightgreen lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen');
        var isMcssAtKeyword = _.makePredicate('mixin extend var');
        var isMcssFutureAtKeyword = _.makePredicate('if else css for');
        var isCssAtKeyword = _.makePredicate('import page keyframe media font-face charset');
        var isShorthandProp = _.makePredicate('background font margin border border-top border-right border-bottom border-left border-width border-color border-style transition padding list-style border-radius.');
        var isWSOrNewLine = _.makePredicate('WS NEWLINE');
        var isCommaOrParen = _.makePredicate(', )');
        var isDirectOperate = _.makePredicate('DIMENSION STRING BOOLEAN TEXT NULL');
        var isRelationOp = _.makePredicate('== >= <= < > !=');
        var isNeg = function (ll) {
            return ll.type === 'DIMENSION' && ll.value < 0;
        };
        var isProbablyModulePath = function (path) {
            return /^[-\w]/.test(path) && !/:/.test(path);
        };
        var states = {
                'FILTER_DECLARATION': _.uid(),
                'TRY_DECLARATION': _.uid(),
                'TRY_INTERPOLATION': _.uid(),
                'FUNCTION_CALL': _.uid()
            };
        function Parser(options) {
            this.options = options || {};
        }
        Parser.prototype = {
            parse: function (tks) {
                try {
                    var p = new promise();
                    if (typeof tks === 'string') {
                        var filename = this.get('filename');
                        if (filename && !this.get('imports')[filename]) {
                            this.get('imports')[filename] = tks;
                        }
                        tks = tk.tokenize(tks, this.options);
                    }
                    this.lookahead = tks;
                    this.p = 0;
                    this.length = this.lookahead.length;
                    this._states = {};
                    this.scope = this.options.scope || new symtab.Scope();
                    this.marked = null;
                    this.promises = [];
                    var ast = this.stylesheet();
                } catch (e) {
                    return p.reject(e);
                }
                var self = this;
                if (this.promises.length) {
                    promise.when.apply(this, this.promises).done(function () {
                        return p.resolve(ast);
                    }).fail(function (err1) {
                        p.reject(err1);
                    });
                } else {
                    return p.resolve(ast);
                }
                return p;
            },
            state: function (state) {
                return this._states[state] === true;
            },
            enter: function (state) {
                this._states[state] = true;
            },
            leave: function (state) {
                this._states[state] = false;
            },
            next: function (k) {
                k = k || 1;
                this.p += k;
            },
            lookUpBefore: function (lookup, before) {
                var i = 1, la;
                while (i++) {
                    if ((la = this.la(i)) === lookup)
                        return true;
                    if (la === before || la === 'EOF' || la === '}') {
                        return false;
                    }
                }
                return false;
            },
            match: function (tokenType) {
                var ll;
                if (!(ll = this.eat.apply(this, arguments))) {
                    var ll = this.ll();
                    this.error('expect:"' + tokenType + '" -> got: "' + ll.type + '"', ll.lineno, tokenType);
                } else {
                    return ll;
                }
            },
            matchSemiColonIfNoBlock: function () {
                this.eat('WS');
                if (this.la() !== '}')
                    this.match(';');
            },
            ll: function (k) {
                k = k || 1;
                if (k < 0)
                    k = k + 1;
                var pos = this.p + k - 1;
                if (pos > this.length - 1) {
                    return this.lookahead[this.length - 1];
                }
                return this.lookahead[pos];
            },
            la: function (k) {
                return this.ll(k).type;
            },
            is: function (pos, tokenType) {
                return this.la(pos) === tokenType;
            },
            mark: function () {
                this.marked = this.p;
                return this;
            },
            restore: function () {
                if (this.marked != undefined)
                    this.p = this.marked;
                this.marked = null;
                return this;
            },
            eat: function (tokenType) {
                var ll = this.ll();
                for (var i = 0, len = arguments.length; i < len; i++) {
                    if (ll.type === arguments[i]) {
                        this.next();
                        return ll;
                    }
                }
                return false;
            },
            skip: function (type) {
                var skiped, la, test;
                while (true) {
                    la = this.la();
                    test = typeof type === 'string' ? type === la : type(la);
                    if (test) {
                        this.next();
                        skiped = true;
                    } else
                        break;
                }
                return skiped;
            },
            skipStart: function () {
                return this.skip(isSkipStart);
            },
            skipWSorNewlne: function () {
                return this.skip(isWSOrNewLine);
            },
            error: function (msg, ll, expect) {
                if (typeof msg === 'number') {
                    perror.code = msg;
                    perror.message = 'Uncauched Error';
                    throw perror;
                }
                var lineno = ll.lineno || ll;
                var err = new error.SyntaxError(msg, lineno, this.options);
                if (expect)
                    err.expect = expect;
                throw err;
            },
            stylesheet: function () {
                return this.block(true);
            },
            stmt: function () {
                var ll = this.ll(), la = ll.type, node = false;
                if (la === 'AT_KEYWORD') {
                    node = this.atrule();
                }
                if (la === 'VAR') {
                    switch (this.la(2)) {
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
                        node = this.assign();
                        if (node.value.type !== 'func') {
                            this.matchSemiColonIfNoBlock();
                        }
                        break;
                    default:
                        this.error('UNEXPECT token after VARIABLE', this.ll(2));
                    }
                }
                if (la === 'FUNCTION') {
                    node = this.fnCall();
                    this.matchSemiColonIfNoBlock();
                }
                if (isSelectorSep(la)) {
                    node = this.ruleset(true);
                }
                if (node !== false) {
                    return node;
                }
                this.error('INVALID statementstart ' + ll.type, ll);
            },
            atrule: function () {
                var fullname = this.ll().value.toLowerCase();
                var name = this._removePrefix(fullname);
                if (typeof this[name] === 'function') {
                    var node = this[name]();
                } else {
                    node = this.directive();
                }
                node.fullname = fullname;
                return node;
            },
            directive: function () {
                var ll = this.ll();
                var name = ll.value.toLowerCase();
                var dhook = directive.getDirective(name);
                if (dhook) {
                    console.log('has hook');
                } else {
                    this.match('AT_KEYWORD');
                    this.eat('WS');
                    var value = this.valuesList();
                    this.eat('WS');
                    if (this.eat(';')) {
                        return tree.directive(name, value);
                    } else {
                        var block = this.block();
                        return tree.directive(name, value, block);
                    }
                    this.error('invalid customer directive define', ll);
                }
            },
            extend: function () {
                var ll = this.match('AT_KEYWORD');
                this.eat('WS');
                var node = tree.extend(this.selectorList());
                node.lineno = ll.lineno;
                this.matchSemiColonIfNoBlock();
                return node;
            },
            return: function () {
                this.match('AT_KEYWORD');
                this.eat('WS');
                var value = this.assignExpr();
                var node = new tree.ReturnStmt(value);
                this.skip('WS');
                if (value.type !== 'func') {
                    this.matchSemiColonIfNoBlock();
                }
                return node;
            },
            import: function () {
                var node, url, queryList, ll, la, self = this;
                this.match('AT_KEYWORD');
                this.eat('WS');
                ll = this.ll();
                la = this.la();
                if (la === 'STRING' || la === 'URL') {
                    url = ll;
                    this.next();
                } else {
                    this.error('expect URL or STRING' + ' got ' + ll.type, ll.lineno);
                }
                this.eat('WS');
                if (!this.eat(';')) {
                    queryList = this.media_query_list();
                    this.matchSemiColonIfNoBlock();
                }
                var node = new tree.Import(url, queryList), extname = path.extname(url.value), filename, stat, p;
                if (extname === '.css') {
                    if (this.get('importCSS')) {
                    }
                }
                if (extname !== '.css' || this.get('importCSS')) {
                    if (!extname)
                        url.value += '.mcss';
                    var p = this._import(url, node).done(function (ast) {
                            if (ast) {
                                node.stylesheet = ast;
                            }
                        });
                    this.promises.push(p);
                }
                return node;
            },
            abstract: function () {
                var la, url, ruleset;
                this.match('AT_KEYWORD');
                this.eat('WS');
                if ((la = this.la()) !== '{') {
                    if (url = this.eat('STRING', 'URL')) {
                        var node = new tree.Import(url);
                        var p = this._import(url, node).done(function (ast) {
                                if (ast) {
                                    node.stylesheet = ast.abstract();
                                }
                            });
                        this.promises.push(p);
                        this.matchSemiColonIfNoBlock();
                        return node;
                    } else {
                        ruleset = this.ruleset();
                        ruleset.abstract = true;
                        return ruleset;
                    }
                } else {
                    var list = this.block().abstract().list;
                    return list;
                }
            },
            url: function () {
                return this.match('STRING', 'URL');
            },
            if: function () {
                this.match('AT_KEYWORD');
                var test = this.expression(), block = this.block(), alt, ll;
                this.eat('WS');
                ll = this.ll();
                if (ll.type == 'AT_KEYWORD') {
                    if (ll.value === 'else') {
                        this.next();
                        this.eat('WS');
                        alt = this.block();
                    }
                    if (ll.value === 'elseif') {
                        alt = this.if();
                    }
                }
                return new tree.IfStmt(test, block, alt);
            },
            for: function () {
                var element, index, list, of, block, by;
                this.match('AT_KEYWORD');
                this.eat('WS');
                element = this.ll().value;
                this.match('VAR');
                if (this.eat(',')) {
                    index = this.ll().value;
                    this.match('VAR');
                }
                this.eat('WS');
                if (this.ll().value === 'by') {
                    this.next();
                    this.eat('WS');
                    by = this.expression();
                    this.eat('WS');
                }
                of = this.match('TEXT');
                if (of.value !== 'of' && of.value !== 'in') {
                    this.error('for statement need of or in KEYWORD but got:' + of.value, of.lineno);
                }
                list = this.valuesList();
                this.eat('WS');
                block = this.block();
                return new tree.ForStmt(element, index, list, block, of.value == 'in', by);
            },
            media: function () {
                this.match('AT_KEYWORD');
                this.eat('WS');
                var list = this.media_query_list();
                this.skip('WS');
                var block = this.block();
                return new tree.Media(list, block);
            },
            media_query_list: function () {
                var list = [];
                do {
                    list.push(this.media_query());
                } while (this.eat(','));
                return list;
            },
            media_query: function () {
                var expressions = [], ll, type = '';
                if (this.la() === '(') {
                    expressions.push(this.media_expression());
                } else {
                    ll = this.ll();
                    if (ll.value === 'only' || ll.value === 'not') {
                        type = ll.value;
                        this.next(1);
                        this.eat('WS');
                        ll = this.ll();
                    }
                    this.match('TEXT');
                    type += (type ? ' ' : '') + ll.value;
                }
                this.eat('WS');
                while ((ll = this.ll()).type === 'TEXT' && ll.value === 'and') {
                    this.next();
                    this.eat('WS');
                    expressions.push(this.media_expression());
                    this.eat('WS');
                }
                return new tree.MediaQuery(type, expressions);
            },
            media_expression: function () {
                var feature, value;
                this.match('(');
                this.eat('WS');
                feature = this.expression();
                if (this.eat(':')) {
                    value = this.valuesList();
                }
                this.eat('WS');
                this.match(')');
                return new tree.MediaExpression(feature, value);
            },
            keyframes: function () {
                var lineno = this.ll().lineno;
                this.match('AT_KEYWORD');
                this.eat('WS');
                var name = this.expression();
                if (!name)
                    this.error('@keyframes\'s name should specify', lineno);
                if (name.type === 'FUNCTION') {
                    this.eat('WS');
                    this.match('(');
                    this.eat('WS');
                }
                this.eat('WS');
                var block = this.block();
                var node = new tree.Keyframes(name, block);
                return node;
            },
            keyframe: function () {
                var steps = [];
                do {
                    steps.push(this.expression());
                } while (this.eat(','));
                var block = this.block();
                return new tree.Keyframe(steps, block);
            },
            page: function () {
                var keyword = this.match('AT_KEYWORD');
                this.eat('WS');
                var selector = this.complexSelector().string;
                if (/^:[-a-zA-Z]+$/.test(selector) === false)
                    this.error('@page only accpet PSEUDO_CLASS', keyword.lineno);
                this.eat('WS');
                var block = this.block();
                return tree.directive('page', tk.createToken('TEXT', selector, keyword.lineno), block);
            },
            debug: function () {
                this.match('AT_KEYWORD');
                this.eat('WS');
                var value = this.valuesList();
                var node = new tree.Debug(value);
                this.matchSemiColonIfNoBlock();
                return node;
            },
            vain: function () {
                var selector, block;
                this.match('AT_KEYWORD');
                this.eat('WS');
                if (this.la() !== '{') {
                    selector = this.selectorList();
                } else {
                    block = this.block();
                }
            },
            ruleset: function () {
                var node = new tree.RuleSet(), rule;
                node.selector = this.selectorList();
                this.eat('WS');
                node.block = this.block();
                return node;
            },
            block: function (noBlock) {
                var end = noBlock ? 'EOF' : '}';
                this.eat('WS');
                var node = new tree.Block();
                if (!noBlock)
                    this.match('{');
                this.skip('WS');
                while (!this.eat(end)) {
                    if (noBlock) {
                        var declareOrStmt = this.stmt();
                    } else {
                        declareOrStmt = this.mark().declaration() || this.restore().stmt();
                    }
                    node.list.push(declareOrStmt);
                    this.skipStart();
                }
                return node;
            },
            selectorList: function () {
                var node = new tree.SelectorList();
                do {
                    node.list.push(this.complexSelector());
                } while (this.eat(','));
                node.lineno = node.list[0].lineno;
                return node;
            },
            complexSelector: function () {
                var node = new tree.ComplexSelector();
                var selectorString = '', value;
                var i = 0, ll, interpolation, start;
                while (true) {
                    ll = this.ll();
                    if (ll.type === '#{' && this.ll(2) !== '}') {
                        interpolation = this.interpolation();
                        if (interpolation) {
                            selectorString += '#{' + i++ + '}';
                            node.interpolations.push(interpolation);
                        } else {
                            break;
                        }
                    } else if (isSelectorSep(ll.type)) {
                        if (ll.type === 'DIMENSION') {
                            if (ll.unit !== '%')
                                this.error('UNEXPECT: ' + ll.type, ll.lineno);
                        }
                        value = ll.type === 'DIMENSION' ? ll.value + '%' : ll.value || (ll.type === 'WS' ? ' ' : ll.type);
                        selectorString += value;
                        this.next();
                    } else {
                        break;
                    }
                }
                node.string = selectorString;
                node.lineno = ll.lineno;
                return node;
            },
            declaration: function (noEnd) {
                var node = new tree.Declaration();
                var ll1 = this.ll(1), ll2 = this.ll(2);
                if (ll1.type === '*' && ll2.type == 'TEXT') {
                    this.next(1);
                    ll2.value = '*' + ll2.value;
                }
                node.property = this.compoundIdent();
                if (!node.property) {
                    return;
                }
                this.eat('WS');
                if (!this.eat(':'))
                    return;
                if (node.property.value && /filter$/.test(node.property.value.toLowerCase())) {
                    this.enter(states.FILTER_DECLARATION);
                }
                this.enter(states.TRY_DECLARATION);
                try {
                    node.value = this.valuesList();
                    this.leave(states.TRY_DECLARATION);
                } catch (error) {
                    this.leave(states.TRY_DECLARATION);
                    if (error.code === errors.DECLARION_FAIL) {
                        return;
                    } else {
                        throw error;
                    }
                }
                if (this.eat('IMPORTANT')) {
                    node.important = true;
                }
                if (!noEnd) {
                    this.matchSemiColonIfNoBlock();
                }
                this.leave(states.FILTER_DECLARATION);
                return node;
            },
            valuesList: function () {
                var list = [], values;
                do {
                    values = this.values();
                    if (values)
                        list.push(values);
                    else
                        break;
                } while (this.eat(','));
                if (list.length === 1) {
                    return list[0];
                }
                return new tree.ValuesList(list);
            },
            values: function () {
                var list = [], value;
                while (true) {
                    value = this.expression();
                    if (!value)
                        break;
                    list.push(value);
                }
                if (list.length === 1)
                    return list[0];
                if (list.length === 0)
                    return null;
                return new tree.Values(list);
            },
            assign: function () {
                var ll = this.ll(), la, name = ll.value, value;
                this.match('VAR');
                var op = this.match('=', '?=').type;
                value = this.assignExpr(true);
                return new tree.Assign(name, value, op === '?=' ? false : true);
            },
            assignExpr: function (hasComma) {
                var la = this.la(), node, fn = hasComma ? 'valuesList' : 'values';
                if (la === '{')
                    return this.func();
                if (la === '(') {
                    this.mark();
                    try {
                        var res = this.func();
                        return res;
                    } catch (e) {
                        if (e.expect && e.expect == '{' || e.expect == 'VAR' || e.expect == ')') {
                            this.restore();
                            return this[fn]();
                        } else {
                            throw e;
                        }
                    }
                } else {
                    return this[hasComma ? 'valuesList' : 'values']();
                }
            },
            func: function () {
                var params, block, lineno = this.ll().lineno;
                if (this.eat('(')) {
                    this.eat('WS');
                    var params = this.params();
                    this.match(')');
                }
                block = this.block();
                return new tree.Func(params, block);
            },
            params: function () {
                var rest = 0, params = [];
                if (this.la() !== ')') {
                    do {
                        var param = this.param();
                        if (param.rest)
                            rest++;
                        params.push(param);
                    } while (this.eat(','));
                    if (rest >= 2)
                        this.error('can not have more than 2 rest param', lineno);
                    this.eat('WS');
                }
                return params;
            },
            param: function () {
                var ll = this.ll(), name = ll.value, dft, rest = false;
                this.match('VAR');
                if (this.eat('...')) {
                    rest = true;
                }
                if (this.eat('=')) {
                    if (rest)
                        this.error('rest type param can"t have default params', ll);
                    dft = this.values();
                }
                return new tree.Param(name, dft, rest);
            },
            expression: function () {
                this.eat('WS');
                return this.logicOrExpr();
            },
            logicOrExpr: function () {
                var left = this.logicAndExpr(), ll, la, right;
                while ((la = this.la()) === '||') {
                    this.next();
                    right = this.logicAndExpr();
                    var bValue = tree.toBoolean(left);
                    if (bValue != null) {
                        if (bValue === false) {
                            left = right;
                        }
                    } else {
                        left = new tree.Operator(la, left, right);
                    }
                    this.eat('WS');
                }
                return left;
            },
            logicAndExpr: function () {
                var node = this.relationExpr(), ll, la, right;
                while ((la = this.la()) === '&&') {
                    this.next();
                    right = this.relationExpr();
                    var bValue = tree.toBoolean(node);
                    if (bValue != null) {
                        if (bValue === true) {
                            node = right;
                        }
                    } else {
                        node = new tree.Operator(la, node, right);
                    }
                    this.eat('WS');
                }
                return node;
            },
            relationExpr: function () {
                var left = this.binop1(), la, right;
                while (isRelationOp(la = this.la())) {
                    this.next();
                    this.eat('WS');
                    right = this.binop1();
                    if (tree.isPrimary(left.type) && tree.isPrimary(right.type)) {
                        left = binop.relation.call(this, left, right, la);
                    } else {
                        left = new tree.Operator(la, left, right);
                    }
                    this.eat('WS');
                }
                return left;
            },
            binop1: function () {
                var left = this.binop2(), right, la, ll;
                this.eat('WS');
                while ((la = this.la()) === '+' || la === '-') {
                    this.next();
                    this.eat('WS');
                    right = this.binop2();
                    if (right.type === 'DIMENSION' && left.type === 'DIMENSION') {
                        left = binop[la].call(this, left, right);
                    } else {
                        left = new tree.Operator(la, left, right);
                    }
                    this.eat('WS');
                }
                return left;
            },
            binop2: function () {
                var left = this.unary(), right, la, ws;
                if (this.eat('WS'))
                    ws = true;
                la = this.la();
                if (la === '...') {
                    this.next();
                    this.eat('WS');
                    right = this.unary();
                    return tree.range(left, right, left.lineno);
                }
                while (la === '*' || la === '/' || la === '%') {
                    if (la == '/' && !ws && this.la(2) !== 'WS') {
                        return left;
                    }
                    this.next();
                    this.eat('WS');
                    right = this.unary();
                    if (right.type === 'DIMENSION' && left.type === 'DIMENSION') {
                        left = binop[la].call(this, left, right);
                    } else {
                        left = new tree.Operator(la, left, right);
                    }
                    this.eat('WS');
                    la = this.la();
                }
                return left;
            },
            unary: function () {
                var ll = this.ll(), value, la;
                if ((la = ll.type) === '-' || la === '+' || la === '!') {
                    this.next();
                    this.eat('WS');
                    value = this.unary();
                    var node = new tree.Unary(value, la);
                    node.lineno = ll.lineno;
                    return node;
                } else {
                    return this.primary();
                }
            },
            primary: function () {
                var ll = this.ll(), node, value;
                switch (ll.type) {
                case '(':
                    return this.parenExpr();
                case '=':
                    if (this.state(states.FILTER_DECLARATION) && this.state(states.FUNCTION_CALL)) {
                        this.next();
                        return ll;
                    }
                    break;
                case '/':
                    this.next();
                    return ll;
                case '-':
                    var ll2 = this.ll(2);
                    if (ll2.type === 'TEXT' || ll2.type === '#{') {
                        return this.CompoundIdent();
                    }
                case '#{':
                case 'TEXT':
                    return this.compoundIdent();
                case 'FUNCTION':
                    return this.fnCall();
                case 'HASH':
                    this.next();
                    value = ll.value;
                    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) {
                        node = new tree.Color(value);
                        node.lineno = ll.lineno;
                    } else {
                        node = new tree.Unknown(ll.value);
                    }
                    return node;
                case 'STRING':
                case 'DIMENSION':
                case 'BOOLEAN':
                case 'VAR':
                case 'NULL':
                case 'URL':
                    this.next();
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
                    if (this.state(states.TRY_DECLARATION)) {
                        this.error(errors.DECLARION_FAIL);
                        break;
                    }
                default:
                    return null;
                }
            },
            parenExpr: function () {
                this.match('(');
                this.eat('WS');
                var lineno = this.ll().lineno;
                var node = this.valuesList();
                node.lineno = lineno;
                this.eat('WS');
                this.match(')');
                return node;
            },
            compoundIdent: function () {
                var list = [], ll, sep, node, slineno = this.ll().lineno;
                while (true) {
                    ll = this.ll();
                    if (ll.type === '#{') {
                        sep = this.interpolation();
                        list.push(sep);
                    } else if (ll.type === 'TEXT' || ll.type === '-') {
                        this.next();
                        list.push(ll.value || ll.type);
                    } else
                        break;
                }
                if (!sep) {
                    if (!list.length)
                        return null;
                    return {
                        type: 'TEXT',
                        value: list[0],
                        lineno: slineno
                    };
                } else {
                    node = new tree.CompoundIdent(list);
                    node.lineno = slineno;
                    return node;
                }
            },
            interpolation: function () {
                var node;
                this.match('#{');
                node = this.valuesList();
                this.match('}');
                return node;
            },
            fnCall: function () {
                var ll = this.ll(), name = ll.value, pargs;
                this.match('FUNCTION', 'VAR');
                if (ll.args) {
                    return tree.call(name, ll.args, null, ll.lineno);
                }
                this.eat('WS');
                this.match('(');
                this.enter(states.FUNCTION_CALL);
                this.eat('WS');
                var la = this.la();
                if (la !== ')') {
                    pargs = this.args();
                } else {
                    pargs = { args: [] };
                }
                this.leave(states.FUNCTION_CALL);
                this.match(')');
                var node = tree.call(name, pargs.args, pargs.named, ll.lineno);
                return node;
            },
            args: function (end) {
                var ll, expr, args = [], named = null, i = 0;
                do {
                    var ll = this.ll();
                    if (ll.type === 'VAR' && this.la(2) === '=') {
                        this.next(2);
                        if (!named)
                            named = {};
                        named[ll.value] = i;
                    }
                    args.push(this.assignExpr());
                    this.skip('WS');
                    i++;
                } while (this.eat(','));
                return {
                    args: args,
                    named: named
                };
            },
            transparentCall: function () {
                var ll = this.ll();
                var name = ll.value;
                this.match('VAR');
                this.match(':');
                this.eat('WS');
                var pargs = this.args();
                return tree.call(name, pargs.args, pargs.named, ll.lineno);
            },
            _lookahead: function () {
                return this.lookahead.map(function (item) {
                    return item.type;
                }).join(',');
            },
            _import: function (url, node) {
                var pathes = this.get('pathes'), extname = path.extname(url.value);
                if (!path.isFake && pathes.length && isProbablyModulePath(url.value)) {
                    var inModule = pathes.some(function (item) {
                            filename = path.join(item, url.value);
                            try {
                                stat = fs.statSync(filename);
                                if (stat.isFile())
                                    return true;
                            } catch (e) {
                            }
                        });
                }
                if (!inModule) {
                    if (/^\/|:\//.test(url.value)) {
                        var filename = url.value;
                        if (/^(https|http):\/\//.test(filename)) {
                            var isRemote = true;
                        }
                    } else {
                        var base = path.dirname(this.options.filename), filename;
                        if (/^(https|http):\/\//.test(base) && sysUrl) {
                            filename = sysUrl.resolve(this.options.filename, url.value);
                            isRemote = true;
                        } else {
                            filename = path.join(base, url.value);
                        }
                    }
                }
                filename += extname ? '' : '.mcss';
                var options = _.extend({ filename: filename }, this.options);
                var self = this;
                var _requires = this.get('_requires');
                if (_requires && ~_requires.indexOf(filename)) {
                    this.error('it is seems file:"' + filename + '" and file: "' + this.get('filename') + '" has Circular dependencies', url.lineno);
                }
                options._requires = _requires ? _requires.concat([this.get('filename')]) : [this.get('filename')];
                var pr = promise();
                var imports = this.get('imports'), text = imports[filename];
                if (typeof text === 'string' || isRemote && (text = remoteFileCache.get(filename))) {
                    new Parser(options).parse(text).always(pr);
                } else {
                    io.get(filename).done(function (text) {
                        if (isRemote) {
                            remoteFileCache.set(filename, text);
                        } else {
                            imports[filename] = text;
                        }
                        new Parser(options).parse(text).always(pr).fail(pr);
                    }).fail(function () {
                        var err = new error.SyntaxError(filename + ' FILE NOT FOUND', url.lineno, self.options);
                        pr.reject(err);
                    });
                }
                return pr.done(function (ast) {
                    node.filename = filename;
                });
            },
            _removePrefix: function (str) {
                return str.replace(/^-\w+-/, '');
            }
        };
        options.mixTo(Parser);
    },
    '3': function (require, module, exports, global) {
        var util = require('4');
        var tree = require('8');
        var error = require('a');
        var slice = [].slice;
        var $ = function () {
                var table = {};
                return function (name, pattern) {
                    if (!pattern) {
                        if (/^[a-zA-Z]+$/.test(name)) {
                            return table[name];
                        }
                        pattern = name;
                        name = null;
                    }
                    if (typeof pattern !== 'string') {
                        pattern = String(pattern).slice(1, -1);
                    }
                    pattern = pattern.replace(/\{([a-zA-Z]+)}/g, function (all, name) {
                        var p = table[name];
                        if (!p)
                            throw Error('no register pattern "' + name + '" before');
                        var pstart = p.charAt(0), pend = p.charAt(p.length - 1);
                        if (!(pstart === '[' && pend === ']') && !(pstart === '(' && pend === ')')) {
                            p = '(?:' + p + ')';
                        }
                        return p;
                    });
                    if (name)
                        table[name] = pattern;
                    return new RegExp(pattern);
                };
            }();
        var toAssert = function (str) {
            var arr = typeof str == 'string' ? str.split(/\s+/) : str, regexp = new RegExp('^(?:' + arr.join('|') + ')$');
            return function (word) {
                return regexp.test(word);
            };
        };
        var toAssert2 = util.makePredicate;
        function createToken(type, value, lineno) {
            var token = typeof type === 'object' ? type : {
                    type: type,
                    value: value
                };
            token.lineno = lineno;
            return token;
        }
        exports.tokenize = function (input, options) {
            return new Tokenizer(options).tokenize(input);
        };
        exports.Tokenizer = Tokenizer;
        exports.$ = $;
        exports.createToken = createToken;
        var isUnit = toAssert2('% em ex ch rem vw vh vmin vmax cm mm in pt pc px deg grad rad turn s ms Hz kHz dpi dpcm dppx');
        var isPseudoClassWithParen = toAssert2('current local-link nth-child nth-last-child nth-of-type nth-last-of-type nth-match nth-last-match column nth-column nth-last-column lang matches not', true);
        var MAX_ALLOWED_CODEPOINT = parseInt('10FFFF', 16);
        var REPLACEMENT_CHARACTER = parseInt('FFFD', 16);
        var $rules = [];
        var $links = {};
        var addRules = function (rules) {
            $rules = $rules.concat(rules);
            var rule, reg, state, link, retain;
            for (var i = 0; i < $rules.length; i++) {
                rule = $rules[i];
                reg = typeof rule.regexp !== 'string' ? String(rule.regexp).slice(1, -1) : rule.regexp;
                if (!~reg.indexOf('^(?')) {
                    rule.regexp = new RegExp('^(?:' + reg + ')');
                }
                state = rule.state || 'init';
                link = $links[state] || ($links[state] = []);
                link.push(i);
            }
            return this;
        };
        $('nl', /\r\n|[\r\f\n]/);
        $('w', /[ \t\r\n\f]/);
        $('d', /[0-9]/);
        $('nmchar', /[_-\w\u00A1-\uFFFF]/);
        $('nmstart', /[_a-zA-Z\u00A1-\uFFFF]/);
        $('ident', /-?{nmstart}{nmchar}*/);
        addRules([
            {
                regexp: /\/\*([^\x00]+?)\*\/|\/\/([^\n\r]*)/,
                action: function (yytext, mcomment, scomment) {
                    var isSingle = mcomment === undefined;
                    if (this.options.comment) {
                        this.options.comment({
                            type: isSingle ? 'singleline' : 'multiline',
                            content: isSingle ? scomment : mcomment
                        });
                    }
                }
            },
            {
                regexp: $(/(url|url\-prefix|domain|regexp){w}*\((['"])?{w}*([^\r\n\f]*?)\2{w}*\)/),
                action: function (yytext, name, quote, url) {
                    this.yyval = url;
                    if (name === 'url')
                        return 'URL';
                    return {
                        type: 'FUNCTION',
                        value: name,
                        args: [{
                                type: 'STRING',
                                value: url
                            }]
                    };
                }
            },
            {
                regexp: $(/(?:[\$-]?[_A-Za-z][-_\w]*)(?=\()/),
                action: function (yytext) {
                    this.yyval = yytext;
                    return 'FUNCTION';
                }
            },
            {
                regexp: /\$(-?[_A-Za-z][-_\w]*)/,
                action: function (yytext, value) {
                    this.yyval = yytext;
                    return 'VAR';
                }
            },
            {
                regexp: $(/{ident}/),
                action: function (yytext) {
                    if (yytext === 'false' || yytext === 'true') {
                        this.yyval = yytext === 'false' ? false : true;
                        return 'BOOLEAN';
                    }
                    this.yyval = yytext;
                    if (yytext === 'null')
                        return 'NULL';
                    return 'TEXT';
                }
            },
            {
                regexp: $(/(-?(?:{d}*\.{d}+|{d}+))(\w*|%)?/),
                action: function (yytext, value, unit) {
                    if (unit && !isUnit(unit)) {
                        this.error('Unexcept unit: "' + unit + '"');
                    }
                    return {
                        type: 'DIMENSION',
                        value: parseFloat(value),
                        unit: unit
                    };
                }
            },
            {
                regexp: $(/\.({nmchar}+)/),
                action: function (yytext) {
                    this.yyval = yytext;
                    return 'CLASS';
                }
            },
            {
                regexp: /@(-?[_A-Za-z][-_\w]*)/,
                action: function (yytext, value) {
                    this.yyval = value;
                    return 'AT_KEYWORD';
                }
            },
            {
                regexp: $(/!{w}*important/),
                action: function (yytext) {
                    return 'IMPORTANT';
                }
            },
            {
                regexp: $(':([-_a-zA-Z]+)' + '(?:\\(' + '([^\\(\\)]*' + '|(?:' + '\\([^\\)]+\\)' + ')+)' + '\\))'),
                action: function (yytext, value) {
                    if (~yytext.indexOf('(') && !isPseudoClassWithParen(value)) {
                        return false;
                    }
                    this.yyval = yytext;
                    return 'PSEUDO_CLASS';
                }
            },
            {
                regexp: $('::({nmchar}+)'),
                action: function (yytext) {
                    this.yyval = yytext;
                    return 'PSEUDO_ELEMENT';
                }
            },
            {
                regexp: $('\\[\\s*(?:{nmchar}+)\\s*(?:([*^$|~!]?=)\\s*[\'"]?(?:[^\'"\\[]+)[\'"]?)?\\s*\\]'),
                action: function (yytext) {
                    this.yyval = yytext;
                    return 'ATTRIBUTE';
                }
            },
            {
                regexp: $(/#{nmchar}+/),
                action: function (yytext, value) {
                    this.yyval = yytext;
                    return 'HASH';
                }
            },
            {
                regexp: /(['"])([^\r\n\f]*?)\1/,
                action: function (yytext, quote, value) {
                    this.yyval = value || '';
                    return 'STRING';
                }
            },
            {
                regexp: $(/{w}*(&&|\|\||[\*\$\^~\|>=<!?]?=|\.\.\.|[\{;,><]){w}*/),
                action: function (yytext, punctuator) {
                    return punctuator;
                }
            },
            {
                regexp: $('WS', /{w}+/),
                action: function () {
                    return 'WS';
                }
            },
            {
                regexp: /($|#\{|:|::|[~!#()\[\]&\.]|[\}%\-+*\/])/,
                action: function (yytext, punctuator) {
                    if (!punctuator)
                        return 'EOF';
                    return punctuator;
                }
            },
            {
                regexp: $(/\\([0-9a-fA-F]{1,6})/),
                action: function (yytext, value) {
                    var hex = parseInt(value, 16);
                    if (hex > MAX_ALLOWED_CODEPOINT) {
                        hex = '\ufffd';
                    }
                    hex = '\\' + hex.toString(16);
                    this.yyval = hex;
                    return 'TEXT';
                }
            }
        ]);
        function Tokenizer(options) {
            this.options = options || {};
            this.options.ignoreComment = true;
        }
        Tokenizer.prototype = {
            constructor: Tokenizer,
            tokenize: function (input) {
                this.input = input;
                this.remained = this.input;
                this.length = this.input.length;
                this.lineno = 1;
                this.states = ['init'];
                this.state = 'init';
                return this.pump();
            },
            lex: function () {
                var token = this.next();
                if (typeof token !== 'undefined') {
                    return token;
                } else {
                    return this.lex();
                }
            },
            pump: function () {
                var tokens = [], t;
                var i = 0;
                while (t = this.lex()) {
                    i++;
                    tokens.push(t);
                    if (t.type == 'EOF')
                        break;
                }
                return tokens;
            },
            next: function () {
                var tmp, action, rule, token, tokenType, lines, state = this.state, rules = $rules, link = $links[state];
                this.yyval = null;
                var len = link.length;
                for (var i = 0; i < len; i++) {
                    var rule = $rules[link[i]];
                    tmp = this.remained.match(rule.regexp);
                    if (tmp) {
                        action = rule.action;
                        tokenType = action.apply(this, tmp);
                        if (tokenType === false) {
                            continue;
                        } else
                            break;
                    }
                }
                if (tmp) {
                    lines = tmp[0].match(/(?:\r\n|[\n\r\f]).*/g);
                    if (lines)
                        this.lineno += lines.length;
                    this.remained = this.remained.slice(tmp[0].length);
                    if (tokenType) {
                        token = createToken(tokenType, this.yyval, this.lineno);
                        if (tokenType === 'WS') {
                            if (this._preIsWS) {
                                token = undefined;
                            }
                            this._preIsWS = true;
                        } else {
                            this._preIsWS = false;
                        }
                    }
                    return token;
                } else {
                    this.error('Unexpect token start');
                }
            },
            pushState: function (condition) {
                this.states.push(condition);
                this.state = condition;
            },
            popState: function () {
                this.states.pop();
                this.state = this.states[this.states.length - 1];
            },
            error: function (message) {
                var line = this.lineno;
                var err = new error.SyntaxError(message, line, this.options);
                err.column = this._getColumn();
                throw err;
            },
            _getColumn: function () {
                var newline = /^[\n\f\r]/;
                var n = this.length - this.remained.length, column = 0, line;
                for (; n--;) {
                    if (newline.test(this.input.charAt(n)) && n >= 0)
                        break;
                    column++;
                }
                return column;
            }
        };
    },
    '4': function (require, module, exports, global) {
        var _ = {};
        var slice = [].slice;
        var fs = null;
        var mkdirp = require('5');
        var path = require('6');
        var tpl = require('7');
        var acceptError = tpl('the {i} argument passed to this function only accept {accept}, but got "{type}"');
        var fp = Function.prototype, np = Number.prototype;
        function returnTrue() {
            return true;
        }
        fp.__accept = function (list) {
            var fn = this;
            if (!list || !list.length)
                return;
            var tlist = list.map(function (item) {
                    if (!item)
                        return returnTrue;
                    if (typeof item === 'function')
                        return item;
                    return _.makePredicate(item);
                });
            return function () {
                var args = _.slice(arguments);
                for (var i = args.length; i--;) {
                    if (!args[i])
                        continue;
                    var type = args[i].type;
                    var test = tlist[i];
                    if (test && !test(type)) {
                        var message = 'invalid param or operand : ' + type;
                        if (this.error) {
                            this.error(message, args[0].lineno);
                        } else {
                            throw Error(message);
                        }
                    }
                }
                return fn.apply(this, arguments);
            };
        };
        fp.__msetter = function () {
            var fn = this;
            return function (key, value) {
                if (typeof key === 'object') {
                    var args = _.slice(arguments, 1);
                    for (var i in key) {
                        fn.apply(this, [
                            i,
                            key[i]
                        ].concat(args));
                    }
                    return this;
                } else {
                    return fn.apply(this, arguments);
                }
            };
        };
        np.__limit = function (min, max) {
            return Math.min(max, Math.max(min, this));
        };
        _.makePredicate = function (words, prefix) {
            if (typeof words === 'string') {
                words = words.split(' ');
            }
            var f = '', cats = [];
            out:
                for (var i = 0; i < words.length; ++i) {
                    for (var j = 0; j < cats.length; ++j)
                        if (cats[j][0].length == words[i].length) {
                            cats[j].push(words[i]);
                            continue out;
                        }
                    cats.push([words[i]]);
                }
            function compareTo(arr) {
                if (arr.length == 1)
                    return f += 'return str === \'' + arr[0] + '\';';
                f += 'switch(str){';
                for (var i = 0; i < arr.length; ++i)
                    f += 'case \'' + arr[i] + '\':';
                f += 'return true}return false;';
            }
            if (cats.length > 3) {
                cats.sort(function (a, b) {
                    return b.length - a.length;
                });
                f += 'var prefix = ' + (prefix ? 'true' : 'false') + ';if(prefix) str = str.replace(/^-(?:\\w+)-/,\'\');switch(str.length){';
                for (var i = 0; i < cats.length; ++i) {
                    var cat = cats[i];
                    f += 'case ' + cat[0].length + ':';
                    compareTo(cat);
                }
                f += '}';
            } else {
                compareTo(words);
            }
            return new Function('str', f);
        };
        _.isNotAcceptByBlock = _.makePredicate('rgba dimension string boolean text null url values valueslist');
        _.makePredicate2 = function (words) {
            if (typeof words !== 'string') {
                words = words.join(' ');
            }
            return function (word) {
                return ~words.indexOf(word);
            };
        };
        _.perf = function (fn, times, args) {
            var date = +new Date();
            for (var i = 0; i < times; i++) {
                fn.apply(this, args || []);
            }
            return +new Date() - date;
        };
        _.extend = function (o1, o2, override) {
            for (var j in o2) {
                if (j.charAt(0) === '_')
                    continue;
                if (o1[j] == null || override)
                    o1[j] = o2[j];
            }
            return o1;
        };
        _.copy = function (obj, keys) {
            var res = {};
            keys.forEach(function (key) {
                res[key] = obj[key];
            });
            return res;
        };
        _.debugger = 1;
        _.log = function () {
            if (_.debugger < 3)
                return;
            console.log.apply(console, arguments);
        };
        _.warn = function () {
            if (_.debugger < 2)
                return;
            console.warn.apply(console, arguments);
        };
        _.error = function () {
            if (_.debugger < 1)
                return;
            console.error.apply(console, arguments);
        };
        _.uuid = function (t) {
            var _uid = 1;
            t = t || '';
            return function () {
                return t + _uid++;
            };
        }, _.writeFile = function (fullpath, data, callback) {
            function write(cb) {
                fs.writeFile(fullpath, data, cb);
            }
            write(function (error) {
                if (!error)
                    return callback(null, fullpath, data);
                mkdirp(path.dirname(fullpath), 493, function (error) {
                    if (error)
                        return callback(error);
                    write(function (error) {
                        callback(error, fullpath, data);
                    });
                });
            });
        };
        _.flatten = function (array) {
            var res = [];
            _.slice(array).forEach(function (item, index) {
                if (!item)
                    return;
                if (Array.isArray(item)) {
                    res = res.concat(_.flatten(item));
                } else {
                    res.push(item);
                }
            });
            return res;
        };
        _.throttle = function (func, wait, immediate) {
            var context, args, result;
            var timeout = null;
            var previous = 0;
            var later = function () {
                previous = new Date();
                timeout = null;
                result = func.apply(context, args);
            };
            return function () {
                var now = new Date();
                if (!previous && immediate === false)
                    previous = now;
                var remaining = wait - (now - previous);
                context = this;
                args = arguments;
                if (remaining <= 0) {
                    clearTimeout(timeout);
                    timeout = null;
                    previous = now;
                    result = func.apply(context, args);
                } else if (!timeout) {
                    timeout = setTimeout(later, remaining);
                }
                return result;
            };
        };
        _.restrict = function (func, interval) {
            var previous;
            return function () {
                var now = +new Date();
                if (!previous || now - previous > interval) {
                    func.apply(this, arguments);
                }
                previous = now;
            };
        };
        _.uid = _.uuid();
        _.merge = function (list, ast) {
            if (!ast)
                return;
            var type = ast.type;
            if (type === 'block' || type === 'stylesheet') {
                return _.merge(list, ast.list);
            }
            if (Array.isArray(ast)) {
                for (var i = 0, len = ast.length; i < len; i++) {
                    _.merge(list, ast[i]);
                }
            } else if (ast.type && !_.isNotAcceptByBlock(ast.type.toLowerCase())) {
                list.push(ast);
            }
        };
        _.typeOf = function (obj) {
            return obj == null ? String(obj) : Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
        };
        _.slice = function (arr, start, last) {
            return slice.call(arr, start, last);
        };
        _.watch = function (file, callback) {
            var isWin = process.platform === 'win32';
            if (isWin) {
                fs.watch(file, function (event) {
                    if (event === 'change')
                        callback(file);
                });
            } else {
                fs.watchFile(file, { interval: 200 }, function (curr, prev) {
                    if (curr.mtime > prev.mtime)
                        callback(file);
                });
            }
        };
        _.round = function (num, percision) {
            if (!percision)
                percision = Math.pow(10, 6);
            return Math.round(num * percision) / percision;
        };
        _.cache = function (max) {
            var keys = [], cache = {};
            return {
                set: function (key, value) {
                    if (keys.length > this.length) {
                        delete cache[keys.shift()];
                    }
                    cache[key] = value;
                    keys.push(key);
                    return value;
                },
                get: function (key) {
                    if (key === undefined)
                        return cache;
                    return cache[key];
                },
                length: max,
                len: function () {
                    return keys.length;
                }
            };
        };
        module.exports = _;
    },
    '5': function (require, module, exports, global) {
        var path = null;
        var fs = null;
        module.exports = mkdirP.mkdirp = mkdirP.mkdirP = mkdirP;
        function mkdirP(p, mode, f, made) {
            if (typeof mode === 'function' || mode === undefined) {
                f = mode;
                mode = 511 & ~process.umask();
            }
            if (!made)
                made = null;
            var cb = f || function () {
                };
            if (typeof mode === 'string')
                mode = parseInt(mode, 8);
            p = path.resolve(p);
            fs.mkdir(p, mode, function (er) {
                if (!er) {
                    made = made || p;
                    return cb(null, made);
                }
                switch (er.code) {
                case 'ENOENT':
                    mkdirP(path.dirname(p), mode, function (er, made) {
                        if (er)
                            cb(er, made);
                        else
                            mkdirP(p, mode, cb, made);
                    });
                    break;
                default:
                    fs.stat(p, function (er2, stat) {
                        if (er2 || !stat.isDirectory())
                            cb(er, made);
                        else
                            cb(null, made);
                    });
                    break;
                }
            });
        }
        mkdirP.sync = function sync(p, mode, made) {
            if (mode === undefined) {
                mode = 511 & ~process.umask();
            }
            if (!made)
                made = null;
            if (typeof mode === 'string')
                mode = parseInt(mode, 8);
            p = path.resolve(p);
            try {
                fs.mkdirSync(p, mode);
                made = made || p;
            } catch (err0) {
                switch (err0.code) {
                case 'ENOENT':
                    made = sync(path.dirname(p), mode, made);
                    sync(p, mode, made);
                    break;
                default:
                    var stat;
                    try {
                        stat = fs.statSync(p);
                    } catch (err1) {
                        throw err0;
                    }
                    if (!stat.isDirectory())
                        throw err0;
                    break;
                }
            }
            return made;
        };
    },
    '6': function (require, module, exports, global) {
        var syspath = null, slice = [].slice;
        if (syspath)
            module.exports = syspath;
        else {
            exports.fake = true;
            exports.join = join;
            exports.normalize = normalize;
            exports.dirname = dirname;
            exports.extname = extname;
            exports.isAbsolute = isAbsolute;
            var slice = [].slice;
            var DIRNAME_RE = /[^?#]*\//;
            var DOT_RE = /\/\.\//g;
            var MULTIPLE_SLASH_RE = /(:\/)?\/\/+/g;
            var DOUBLE_DOT_RE = /\/[^/]+\/\.\.\//;
            var URI_END_RE = /\?|\.(?:css|mcss)$|\/$/;
            function dirname(path) {
                return path.match(DIRNAME_RE)[0];
            }
            function normalize(path) {
                path = path.replace(DOT_RE, '/');
                path = path.replace(MULTIPLE_SLASH_RE, '$1/');
                while (path.match(DOUBLE_DOT_RE)) {
                    path = path.replace(DOUBLE_DOT_RE, '/');
                }
                return path;
            }
            function join(url, url2) {
                var args = slice.call(arguments);
                var res = args.reduce(function (u1, u2) {
                        return u1 + '/' + u2;
                    });
                return normalize(res);
            }
            function extname(url) {
                var res = url.match(/(\.\w+)[^\/]*$/);
                if (res && res[1]) {
                    return res[1];
                }
                return '';
            }
            function isAbsolute(url) {
                return /^\/|:\//.test(url);
            }
        }
    },
    '7': function (require, module, exports, global) {
        function tpl(template) {
            var i = 0;
            function get(p) {
                return p == '.' ? '' : '.' + p;
            }
            function replace(str) {
                var codes = [], pre = str;
                while (str = str.replace(/^\{\s*([\.-\w]*?)\s*}|\{#([\.-\w]*?)}([\s\S]*?)\{\/\2}|([^{]*)/, function (all, tagname, blockname, blockcontent, raw) {
                        if (raw)
                            codes.push([
                                's+="',
                                raw,
                                '";'
                            ].join(''));
                        else if (tagname)
                            codes.push([
                                's+=vars',
                                get(tagname),
                                '||"";'
                            ].join(''));
                        else if (blockname) {
                            var k = ++i;
                            codes.push([
                                'var o',
                                k,
                                '=vars',
                                get(blockname),
                                ';',
                                'o',
                                k,
                                ' = o',
                                k,
                                ' instanceof Array? o',
                                k,
                                ':[o',
                                k,
                                ']',
                                ';for(var i',
                                k,
                                '=0;i',
                                k,
                                '<o',
                                k,
                                '.length;i',
                                k,
                                '++)',
                                '{var tmp',
                                k,
                                '=vars; vars=o',
                                k,
                                '[i',
                                k,
                                ']; ',
                                replace(blockcontent),
                                'vars=tmp',
                                k,
                                '}'
                            ].join(''));
                        }
                        return '';
                    })) {
                    if (str === pre)
                        throw 'unexpect at \n' + str;
                    pre = str;
                }
                return codes.join('');
            }
            return new Function('vars', [
                'var s = "";',
                replace(template.replace(/\n/g, '\\n').replace(/"/g, '\\"')),
                'return s;'
            ].join(''));
        }
        ;
        module.exports = tpl;
    },
    '8': function (require, module, exports, global) {
        var _ = require('4'), splice = [].splice, tk = require('3'), isPrimary = _.makePredicate('rgba dimension string boolean text null url');
        function Stylesheet(list) {
            this.type = 'stylesheet';
            this.list = list || [];
        }
        Stylesheet.prototype.clone = function () {
            var clone = new Stylesheet();
            clone.list = cloneNode(this.list);
            return clone;
        };
        Stylesheet.prototype.exclude = function () {
            var res = [], list = this.list, item;
            for (var len = list.length; len--;) {
                item = list[len];
                if (item.type === 'media') {
                    res.unshift(list.splice(len, 1)[0]);
                }
            }
            return res;
        };
        Stylesheet.prototype.abstract = function () {
            var list = this.list, i = list.length;
            for (; i--;) {
                var ruleset = list[i];
                if (ruleset && ruleset.type == 'ruleset') {
                    ruleset.abstract = true;
                }
            }
            return this;
        };
        function SelectorList(list, lineno) {
            this.type = 'selectorlist';
            this.list = list || [];
            this.lineno = lineno;
        }
        SelectorList.prototype.clone = function () {
            var clone = new SelectorList(cloneNode(this.list));
            return clone;
        };
        SelectorList.prototype.len = function () {
            return this.list.length;
        };
        exports.selectorlist = function (list, lineno) {
            return new SelectorList(list, lineno);
        };
        function ComplexSelector(string, interpolations) {
            this.type = 'complexselector';
            this.string = string;
            this.interpolations = interpolations || [];
        }
        ComplexSelector.prototype.clone = function () {
            var clone = new ComplexSelector(this.string, cloneNode(this.interpolations));
            return clone;
        };
        function RuleSet(selector, block, abstract) {
            this.type = 'ruleset';
            this.selector = selector;
            this.block = block;
            this.ref = [];
            this.abstract = abstract || false;
        }
        RuleSet.prototype.addRef = function (ruleset) {
            var alreadyHas = this.ref.some(function (item) {
                    return ruleset === item;
                });
            if (alreadyHas)
                return;
            this.ref.push(ruleset);
        };
        RuleSet.prototype.extend = function () {
        };
        RuleSet.prototype.getSelectors = function () {
            if (this.selector._compute == true)
                return this.selector.list;
            var selectors = this.selector.list;
            var plist;
            if (this.parent && (plist = this.parent.getSelectors()) && plist.length) {
                selectors = this._concatSelector(selectors, plist);
            }
            if (!this.parent) {
                this.selector.list.forEach(function (selector) {
                    selector.string = selector.string.replace(/&/g, '');
                });
            }
            if (this.ref.length) {
                this.ref.forEach(function (ruleset) {
                    selectors = selectors.concat(ruleset.getSelectors());
                });
                this.ref = [];
            }
            this.selector.list = selectors;
            this.selector._compute = true;
            return selectors;
        };
        var comboSplit = /\s*[~+>\s]\s*/;
        RuleSet.prototype._concatSelector = function (slist, plist) {
            if (!plist.length) {
                return;
            }
            if (!plist.length || !slist.length)
                return null;
            var slen = slist.length, plen = plist.length, sstring, pstring, rstring, s, p, res = [];
            for (p = 0; p < plen; p++) {
                pstring = plist[p].string;
                for (s = 0; s < slen; s++) {
                    sstring = slist[s].string;
                    if (~sstring.indexOf('&')) {
                        rstring = sstring.replace(/&/g, pstring);
                    } else if (~sstring.indexOf('%')) {
                        var index = pstring.search(comboSplit);
                        rstring = sstring.replace(/([^0-9]|^)%/g, function (all, a) {
                            return (a || '') + (~index ? pstring.slice(index) : '');
                        });
                    } else {
                        rstring = pstring + ' ' + sstring;
                    }
                    res.push(new exports.ComplexSelector(rstring));
                }
            }
            return res;
        };
        RuleSet.prototype.clone = function () {
            var clone = new RuleSet(cloneNode(this.selector), cloneNode(this.block), this.abstract);
            return clone;
        };
        function Block(list) {
            this.type = 'block';
            this.list = list || [];
        }
        Block.prototype.clone = function () {
            var clone = new Block(cloneNode(this.list));
            return clone;
        };
        Block.prototype.exclude = function (isMedia) {
            var res = [], list = this.list, item;
            if (isMedia)
                var declarations = [];
            for (var len = list.length; len--;) {
                item = list[len];
                if (isMedia) {
                    if (item.type === 'media')
                        res.unshift(list.splice(len, 1)[0]);
                    if (item.type === 'declaration')
                        declarations.unshift(list.splice(len, 1)[0]);
                } else if (item.type !== 'declaration') {
                    res.unshift(list.splice(len, 1)[0]);
                }
            }
            if (declarations && declarations.length)
                res.unshift(declarations);
            return res;
        };
        Block.prototype.abstract = function () {
            var list = this.list, i = list.length;
            for (; i--;) {
                var ruleset = list[i];
                if (ruleset && ruleset.type == 'ruleset') {
                    ruleset.abstract = true;
                }
            }
            return this;
        };
        function Declaration(property, value, important) {
            this.type = 'declaration';
            this.property = property;
            this.value = value;
            this.important = important || false;
        }
        Declaration.prototype.clone = function (name) {
            var clone = new Declaration(cloneNode(this.property), cloneNode(this.value), this.important);
            return clone;
        };
        function Values(list) {
            this.type = 'values';
            this.list = list || [];
        }
        Values.prototype.clone = function () {
            var clone = new Values(cloneNode(this.list));
            return clone;
        };
        Values.prototype.flatten = function () {
            var list = this.list, i = list.length, value;
            for (; i--;) {
                value = list[i];
                if (value.type == 'values') {
                    splice.apply(this, [
                        i,
                        1
                    ].concat(value.list));
                }
            }
            return this;
        };
        exports.values = function (list, lineno) {
            var node = new Values(list);
            node.lineno = lineno;
            return node;
        };
        function ValuesList(list, lineno) {
            this.type = 'valueslist';
            this.list = list || [];
            this.lineno = lineno;
        }
        ValuesList.prototype.clone = function () {
            var clone = new ValuesList(cloneNode(this.list), this.lineno);
            return clone;
        };
        ValuesList.prototype.flatten = function () {
            var list = this.list, i = list.length, values;
            for (; i--;) {
                values = list[i];
                if (values.type == 'valueslist') {
                    splice.apply(list, [
                        i,
                        1
                    ].concat(values.list));
                }
            }
            return this;
        };
        ValuesList.prototype.first = function () {
            return this.list[0].list[0];
        };
        exports.valueslist = function (list, lineno) {
            return new ValuesList(list, lineno);
        };
        function Unknown(name) {
            this.type = 'unknown';
            this.name = name;
        }
        Unknown.prototype.clone = function () {
            var clone = new Unknown(this.name);
            return clone;
        };
        function Assign(name, value, override) {
            this.type = 'assign';
            this.name = name;
            this.value = value;
            this.override = override === undefined ? true : override;
        }
        Assign.prototype.clone = function (name) {
            var clone = new Assign(this.name, cloneNode(this.value), this.override);
            return clone;
        };
        function Func(params, block, name) {
            this.type = 'func';
            this.params = params || [];
            this.block = block;
            this.name = name;
        }
        Func.prototype.clone = function () {
            var clone = new Func(this.params, this.block);
            return clone;
        };
        function Param(name, dft, rest) {
            this.type = 'param';
            this.name = name;
            this.default = dft;
            this.rest = rest || false;
        }
        function Extend(selector) {
            this.type = 'extend';
            this.selector = selector;
        }
        Extend.prototype.clone = function () {
            var clone = new Extend(this.selector);
            return clone;
        };
        exports.extend = function (selector) {
            return new Extend(selector);
        };
        function Module(name, block) {
            this.type = 'module';
            this.block = block;
        }
        Module.prototype.clone = function () {
            var clone = new Module(this.name, cloneNode(this.block));
            return clone;
        };
        function Pointer(name, key) {
            this.type = 'pointer';
            this.name = name;
            this.key = key;
        }
        Pointer.prototype.clone = function () {
            var clone = new Pointer(this.name, this.key);
            return clone;
        };
        function Import(url, queryList, stylesheet) {
            this.type = 'import';
            this.url = url;
            this.queryList = queryList || [];
            this.stylesheet = stylesheet;
        }
        Import.prototype.clone = function () {
            var clone = new Import(this.url, this.queryList, this.stylesheet);
            return clone;
        };
        function IfStmt(test, block, alt) {
            this.type = 'if';
            this.test = test;
            this.block = block;
            this.alt = alt;
        }
        IfStmt.prototype.clone = function () {
            var clone = new IfStmt(cloneNode(this.test), cloneNode(this.block), cloneNode(this.alt));
            return clone;
        };
        function ForStmt(element, index, list, block, isIn, by) {
            this.type = 'for';
            this.element = element;
            this.index = index;
            this.list = list;
            this.block = block;
            this.isIn = isIn || false;
            this.by = by;
        }
        ForStmt.prototype.clone = function () {
            var clone = new ForStmt(this.element, this.index, cloneNode(this.list), cloneNode(this.block), this.isIn, cloneNode(this.by));
            clone.isIn = this.isIn;
            return clone;
        };
        function ReturnStmt(value) {
            this.type = 'return';
            this.value = value;
        }
        ReturnStmt.prototype.clone = function () {
            var clone = new ReturnStmt(cloneNode(this.value));
            return clone;
        };
        function CompoundIdent(list) {
            this.type = 'compoundident';
            this.list = list || [];
        }
        CompoundIdent.prototype.clone = function () {
            var clone = new CompoundIdent(cloneNode(this.list));
            return clone;
        };
        CompoundIdent.prototype.toString = function () {
            return this.list.join('');
        };
        function Dimension(value, unit) {
            this.type = 'dimension';
            this.value = value;
            this.unit = unit;
        }
        Dimension.prototype.clone = function () {
            var clone = new Dimension(this.value, this.unit);
            return clone;
        };
        Dimension.prototype.toString = function () {
            return '' + this.value + (this.unit || '');
        };
        function Operator(op, left, right) {
            this.type = 'operator';
            this.op = op;
            this.left = left;
            this.right = right;
        }
        Operator.prototype.clone = function () {
            var clone = new Operator(this.op, cloneNode(this.left), cloneNode(this.right));
            return clone;
        };
        Operator.prototype.toBoolean = function () {
        };
        function Range(left, right) {
            this.type = 'range';
            this.left = left;
            this.right = right;
        }
        Range.prototype.clone = function () {
            var clone = new Range(cloneNode(this.left), cloneNode(this.right));
            return clone;
        };
        function Unary(value, op) {
            this.type = 'unary';
            this.value = value;
            this.op = op;
        }
        Unary.prototype.clone = function () {
            var clone = new Unary(cloneNode(this.value), this.op);
            return clone;
        };
        function Call(name, args, named, lineno) {
            this.type = 'call';
            this.name = name;
            this.args = args || [];
            this.named = named;
            this.lineno = lineno;
        }
        Call.prototype.clone = function () {
            var clone = new Call(this.name, cloneNode(this.args), this.named);
            return clone;
        };
        exports.call = function (name, args, named, lineno) {
            var node = new Call(name, args, named, lineno);
            return node;
        };
        function FontFace(block) {
            this.type = 'fontface';
            this.block = block;
        }
        FontFace.prototype.clone = function () {
            var clone = new FontFace(param);
            return clone;
        };
        function Media(queryList, block) {
            this.type = 'media';
            this.queryList = queryList || [];
            this.block = block;
        }
        Media.prototype.clone = function () {
            var clone = new Media(cloneNode(this.queryList), cloneNode(this.block));
            return clone;
        };
        function MediaQuery(type, expressions) {
            this.type = 'mediaquery';
            this.mediaType = type;
            this.expressions = expressions || [];
        }
        MediaQuery.prototype.clone = function () {
            var clone = new MediaQuery(this.mediaType, cloneNode(this.expressions));
            return clone;
        };
        MediaQuery.prototype.equals = function (media) {
            var expressions = this.expressions, len = expressions.length, test, exp;
            if (!media)
                return false;
            if (this.mediaType !== media.mediaType) {
                return false;
            }
            if (len !== media.length) {
                return false;
            }
            for (; len--;) {
                exp = expressions[len - 1];
                test = media.expressions.some(function (exp2) {
                    return exp.equals(exp2);
                });
            }
        };
        function MediaExpression(feature, value) {
            this.type = 'mediaexpression';
            this.feature = feature;
            this.value = value;
        }
        MediaExpression.prototype.clone = function () {
            var clone = new MediaExpression(cloneNode(this.feature), cloneNode(this.value));
            return clone;
        };
        MediaExpression.prototype.equals = function (exp2) {
            return this.feature == exp2.feature && this.value === exp2.feature;
        };
        function Keyframes(name, list) {
            this.type = 'keyframes';
            this.name = name;
            this.block = list;
        }
        Keyframes.prototype.clone = function () {
            var clone = new Keyframes(cloneNode(this.name), cloneNode(this.block));
            clone.fullname = this.fullname;
            return clone;
        };
        function Keyframe(steps, block) {
            this.type = 'keyframe';
            this.steps = steps || steps;
            this.block = block;
        }
        Keyframe.prototype.clone = function () {
            var clone = new Keyframe(cloneNode(this.steps), cloneNode(this.block));
            return clone;
        };
        function Page(selector, block) {
            this.type = 'page';
            this.selector = selector;
            this.block = block;
        }
        Page.prototype.clone = function () {
            var clone = new Page(this.selector, cloneNode(this.block));
            return clone;
        };
        function Debug(value) {
            this.type = 'debug';
            this.value = value;
        }
        Debug.prototype.clone = function () {
            var clone = new Debug(cloneNode(this.value));
            return clone;
        };
        function Directive(name, value, block) {
            this.type = 'directive';
            this.name = name;
            this.value = value;
            this.block = block;
        }
        function Range(start, end) {
            this.type = 'range';
            this.start = start;
            this.end = end;
        }
        Range.prototype.clone = function () {
            var clone = new Range(cloneNode(this.start), cloneNode(this.end));
            clone.lineno = this.lineno;
            return clone;
        };
        exports.range = function (start, end, lineno) {
            var node = new Range(start, end);
            node.lineno = lineno;
            return node;
        };
        Directive.prototype.clone = function () {
            var clone = new Directive(this.name, cloneNode(this.value), cloneNode(this.block));
            return clone;
        };
        exports.directive = function (name, value, block) {
            return new Directive(name, value, block);
        };
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
        exports.Color = require('9');
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
        exports.null = function (lineno) {
            return {
                type: 'NULL',
                value: 'null',
                lineno: lineno
            };
        };
        exports.token = function (type, value, lineno) {
            return {
                type: type,
                value: value,
                lineno: lineno
            };
        };
        exports.inspect = function (node) {
            return node.type ? node.type.toLowerCase() : null;
        };
        var cloneNode = exports.cloneNode = function (node) {
                if (!node)
                    return node;
                if (node.clone) {
                    var clone_node = node.clone();
                    clone_node.lineno = node.lineno;
                    return clone_node;
                }
                if (Array.isArray(node))
                    return node.map(cloneNode);
                if (node.type) {
                    var res = {
                            type: node.type,
                            value: node.value,
                            lineno: node.lineno
                        };
                    if (node.type === 'DIMENSION')
                        res.unit = node.unit;
                    return res;
                }
                if (typeof node !== 'object')
                    return node;
                else {
                    _.error(node);
                    throw Error('con"t clone node');
                }
            };
        var precision = 6;
        exports.toStr = function (ast) {
            if (!ast)
                return '';
            switch (ast.type) {
            case 'TEXT':
            case 'BOOLEAN':
            case 'NULL':
                return String(ast.value);
            case 'DIMENSION':
                var value = '' + _.round(ast.value) + (ast.unit ? ast.unit : '');
                return value;
            case 'STRING':
                return ast.value;
            case 'color':
                return ast.toCSS();
            case 'func':
                return '';
            case 'values':
                return ast.list.map(function (item) {
                    return exports.toStr(item);
                }).join(' ');
            case 'valueslist':
                return ast.list.map(function (item) {
                    return exports.toStr(item);
                }).join(',');
            case 'call':
                return ast.name + '(' + ast.args.map(exports.toStr).join(',') + ')';
            case 'selectorlist':
                return ast.list.map(function (selector) {
                    return selector.string;
                }).join(',');
            default:
                return ast.value;
            }
        };
        exports.toBoolean = function (node) {
            if (!node)
                return false;
            var type = node.type;
            switch (type) {
            case 'DIMENSION':
                return node.value != 0;
            case 'STRING':
            case 'TEXT':
                return node.value.length !== 0;
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
        };
        exports.isPrimary = isPrimary;
        exports.isRelationOp = _.makePredicate('== >= <= < > !=');
        exports.convert = function (primary) {
            var type = _.typeOf(primary);
            var tType;
            switch (type) {
            case 'string':
                tType = 'STRING';
                break;
            case 'boolean':
                tType = 'BOOLEAN';
                break;
            case 'number':
                tType = 'DIMENSION';
                break;
            case 'undefined':
            case 'null':
                tType = 'NULL';
                break;
            case 'object':
                return primary;
            }
            if (tType)
                return tk.createToken(tType, primary);
            return primary;
        };
    },
    '9': function (require, module, exports, global) {
        var _ = require('4');
        function Color(channels, alpha, lineno) {
            this.type = 'color';
            if (typeof channels === 'string') {
                var string = channels.charAt(0) === '#' ? channels.slice(1) : channels;
                if (string.length === 6) {
                    channels = [
                        parseInt(string.substr(0, 2), 16),
                        parseInt(string.substr(2, 2), 16),
                        parseInt(string.substr(4, 2), 16)
                    ];
                } else {
                    var r = string.substr(0, 1);
                    var g = string.substr(1, 1);
                    var b = string.substr(2, 1);
                    channels = [
                        parseInt(r + r, 16),
                        parseInt(g + g, 16),
                        parseInt(b + b, 16)
                    ];
                }
            }
            this[0] = channels[0];
            this[1] = channels[1];
            this[2] = channels[2];
            Color.limit(this);
            this.alpha = alpha || 1;
            this.lineno = lineno;
        }
        var c = Color.prototype;
        c.toHSL = function () {
            return Color.rgb2hsl(this);
        };
        c.toCSS = function (argb) {
            var r = Math.round(this[0]), g = Math.round(this[1]), b = Math.round(this[2]);
            if (!this.alpha || this.alpha === 1 || argb) {
                var rs = r.toString(16), gs = g.toString(16), bs = b.toString(16), as = Math.floor(this.alpha * 255).toString(16);
                if (rs.length === 1)
                    rs = '0' + rs;
                if (gs.length === 1)
                    gs = '0' + gs;
                if (bs.length === 1)
                    bs = '0' + bs;
                if (as.length === 1)
                    as = '0' + as;
                if (!argb && rs[0] == rs[1] && gs[0] == gs[1] && bs[0] == bs[1]) {
                    gs = gs[0];
                    bs = bs[0];
                    rs = rs[0];
                }
                return '#' + (this.alpha == 1 ? '' : as) + rs + gs + bs;
            } else {
                return 'rgba(' + r + ',' + g + ',' + b + ',' + this.alpha + ')';
            }
        };
        c.clone = function () {
            return new Color(this, this.alpha, this.lineno);
        };
        Color.rgb2hsl = function (rv, hv) {
            hv = hv || [];
            var r = rv[0] / 255, g = rv[1] / 255, b = rv[2] / 255, max = Math.max(r, g, b), min = Math.min(r, g, b), h, s, l = (max + min) / 2, d;
            if (max == min) {
                h = 0;
                s = 0;
            } else {
                var d = max - min;
                s = l >= 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
                }
                h /= 6;
            }
            hv[0] = h * 360;
            hv[1] = s * 100;
            hv[2] = l * 100;
            return hv;
        };
        Color.hsl2rgb = function (hv, rv) {
            rv = rv || [];
            var r, g, b, h = hv[0] / 360, s = hv[1] / 100, l = hv[2] / 100;
            function hue2rgb(p, q, t) {
                if (t < 0)
                    t += 1;
                if (t > 1)
                    t -= 1;
                if (t < 1 / 6)
                    return p + (q - p) * 6 * t;
                if (t < 1 / 2)
                    return q;
                if (t < 2 / 3)
                    return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            }
            if (s === 0) {
                r = g = b = l;
            } else {
                var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                var p = 2 * l - q;
                r = hue2rgb(p, q, h + 1 / 3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1 / 3);
            }
            rv[0] = r * 255;
            rv[1] = g * 255;
            rv[2] = b * 255;
            return rv;
        };
        Color.limit = function (values) {
            values[0] = values[0].__limit(0, 255);
            values[1] = values[1].__limit(0, 255);
            values[2] = values[2].__limit(0, 255);
            if (values.alpha)
                values.alpha = values.alpha.__limit(0, 1);
        };
        Color.hsl = function (channels, a) {
            return new Color(Color.hsl2rgb(channels), a);
        };
        Color.maps = {
            aliceblue: [
                240,
                248,
                255
            ],
            antiquewhite: [
                250,
                235,
                215
            ],
            aqua: [
                0,
                255,
                255
            ],
            aquamarine: [
                127,
                255,
                212
            ],
            azure: [
                240,
                255,
                255
            ],
            beige: [
                245,
                245,
                220
            ],
            bisque: [
                255,
                228,
                196
            ],
            black: [
                0,
                0,
                0
            ],
            blanchedalmond: [
                255,
                235,
                205
            ],
            blue: [
                0,
                0,
                255
            ],
            blueviolet: [
                138,
                43,
                226
            ],
            brown: [
                165,
                42,
                42
            ],
            burlywood: [
                222,
                184,
                135
            ],
            cadetblue: [
                95,
                158,
                160
            ],
            chartreuse: [
                127,
                255,
                0
            ],
            chocolate: [
                210,
                105,
                30
            ],
            coral: [
                255,
                127,
                80
            ],
            cornflowerblue: [
                100,
                149,
                237
            ],
            cornsilk: [
                255,
                248,
                220
            ],
            crimson: [
                220,
                20,
                60
            ],
            cyan: [
                0,
                255,
                255
            ],
            darkblue: [
                0,
                0,
                139
            ],
            darkcyan: [
                0,
                139,
                139
            ],
            darkgoldenrod: [
                184,
                134,
                11
            ],
            darkgray: [
                169,
                169,
                169
            ],
            darkgreen: [
                0,
                100,
                0
            ],
            darkgrey: [
                169,
                169,
                169
            ],
            darkkhaki: [
                189,
                183,
                107
            ],
            darkmagenta: [
                139,
                0,
                139
            ],
            darkolivegreen: [
                85,
                107,
                47
            ],
            darkorange: [
                255,
                140,
                0
            ],
            darkorchid: [
                153,
                50,
                204
            ],
            darkred: [
                139,
                0,
                0
            ],
            darksalmon: [
                233,
                150,
                122
            ],
            darkseagreen: [
                143,
                188,
                143
            ],
            darkslateblue: [
                72,
                61,
                139
            ],
            darkslategray: [
                47,
                79,
                79
            ],
            darkslategrey: [
                47,
                79,
                79
            ],
            darkturquoise: [
                0,
                206,
                209
            ],
            darkviolet: [
                148,
                0,
                211
            ],
            deeppink: [
                255,
                20,
                147
            ],
            deepskyblue: [
                0,
                191,
                255
            ],
            dimgray: [
                105,
                105,
                105
            ],
            dimgrey: [
                105,
                105,
                105
            ],
            dodgerblue: [
                30,
                144,
                255
            ],
            firebrick: [
                178,
                34,
                34
            ],
            floralwhite: [
                255,
                250,
                240
            ],
            forestgreen: [
                34,
                139,
                34
            ],
            fuchsia: [
                255,
                0,
                255
            ],
            gainsboro: [
                220,
                220,
                220
            ],
            ghostwhite: [
                248,
                248,
                255
            ],
            gold: [
                255,
                215,
                0
            ],
            goldenrod: [
                218,
                165,
                32
            ],
            gray: [
                128,
                128,
                128
            ],
            green: [
                0,
                128,
                0
            ],
            greenyellow: [
                173,
                255,
                47
            ],
            grey: [
                128,
                128,
                128
            ],
            honeydew: [
                240,
                255,
                240
            ],
            hotpink: [
                255,
                105,
                180
            ],
            indianred: [
                205,
                92,
                92
            ],
            indigo: [
                75,
                0,
                130
            ],
            ivory: [
                255,
                255,
                240
            ],
            khaki: [
                240,
                230,
                140
            ],
            lavender: [
                230,
                230,
                250
            ],
            lavenderblush: [
                255,
                240,
                245
            ],
            lawngreen: [
                124,
                252,
                0
            ],
            lemonchiffon: [
                255,
                250,
                205
            ],
            lightblue: [
                173,
                216,
                230
            ],
            lightcoral: [
                240,
                128,
                128
            ],
            lightcyan: [
                224,
                255,
                255
            ],
            lightgoldenrodyellow: [
                250,
                250,
                210
            ],
            lightgray: [
                211,
                211,
                211
            ],
            lightgreen: [
                144,
                238,
                144
            ],
            lightgrey: [
                211,
                211,
                211
            ],
            lightpink: [
                255,
                182,
                193
            ],
            lightsalmon: [
                255,
                160,
                122
            ],
            lightseagreen: [
                32,
                178,
                170
            ],
            lightskyblue: [
                135,
                206,
                250
            ],
            lightslategray: [
                119,
                136,
                153
            ],
            lightslategrey: [
                119,
                136,
                153
            ],
            lightsteelblue: [
                176,
                196,
                222
            ],
            lightyellow: [
                255,
                255,
                224
            ],
            lime: [
                0,
                255,
                0
            ],
            limegreen: [
                50,
                205,
                50
            ],
            linen: [
                250,
                240,
                230
            ],
            magenta: [
                255,
                0,
                255
            ],
            maroon: [
                128,
                0,
                0
            ],
            mediumaquamarine: [
                102,
                205,
                170
            ],
            mediumblue: [
                0,
                0,
                205
            ],
            mediumorchid: [
                186,
                85,
                211
            ],
            mediumpurple: [
                147,
                112,
                219
            ],
            mediumseagreen: [
                60,
                179,
                113
            ],
            mediumslateblue: [
                123,
                104,
                238
            ],
            mediumspringgreen: [
                0,
                250,
                154
            ],
            mediumturquoise: [
                72,
                209,
                204
            ],
            mediumvioletred: [
                199,
                21,
                133
            ],
            midnightblue: [
                25,
                25,
                112
            ],
            mintcream: [
                245,
                255,
                250
            ],
            mistyrose: [
                255,
                228,
                225
            ],
            moccasin: [
                255,
                228,
                181
            ],
            navajowhite: [
                255,
                222,
                173
            ],
            navy: [
                0,
                0,
                128
            ],
            oldlace: [
                253,
                245,
                230
            ],
            olive: [
                128,
                128,
                0
            ],
            olivedrab: [
                107,
                142,
                35
            ],
            orange: [
                255,
                165,
                0
            ],
            orangered: [
                255,
                69,
                0
            ],
            orchid: [
                218,
                112,
                214
            ],
            palegoldenrod: [
                238,
                232,
                170
            ],
            palegreen: [
                152,
                251,
                152
            ],
            paleturquoise: [
                175,
                238,
                238
            ],
            palevioletred: [
                219,
                112,
                147
            ],
            papayawhip: [
                255,
                239,
                213
            ],
            peachpuff: [
                255,
                218,
                185
            ],
            peru: [
                205,
                133,
                63
            ],
            pink: [
                255,
                192,
                203
            ],
            plum: [
                221,
                160,
                221
            ],
            powderblue: [
                176,
                224,
                230
            ],
            purple: [
                128,
                0,
                128
            ],
            red: [
                255,
                0,
                0
            ],
            rosybrown: [
                188,
                143,
                143
            ],
            royalblue: [
                65,
                105,
                225
            ],
            saddlebrown: [
                139,
                69,
                19
            ],
            salmon: [
                250,
                128,
                114
            ],
            sandybrown: [
                244,
                164,
                96
            ],
            seagreen: [
                46,
                139,
                87
            ],
            seashell: [
                255,
                245,
                238
            ],
            sienna: [
                160,
                82,
                45
            ],
            silver: [
                192,
                192,
                192
            ],
            skyblue: [
                135,
                206,
                235
            ],
            slateblue: [
                106,
                90,
                205
            ],
            slategray: [
                112,
                128,
                144
            ],
            slategrey: [
                112,
                128,
                144
            ],
            snow: [
                255,
                250,
                250
            ],
            springgreen: [
                0,
                255,
                127
            ],
            steelblue: [
                70,
                130,
                180
            ],
            tan: [
                210,
                180,
                140
            ],
            teal: [
                0,
                128,
                128
            ],
            thistle: [
                216,
                191,
                216
            ],
            tomato: [
                255,
                99,
                71
            ],
            turquoise: [
                64,
                224,
                208
            ],
            violet: [
                238,
                130,
                238
            ],
            wheat: [
                245,
                222,
                179
            ],
            white: [
                255,
                255,
                255
            ],
            whitesmoke: [
                245,
                245,
                245
            ],
            yellow: [
                255,
                255,
                0
            ],
            yellowgreen: [
                154,
                205,
                50
            ]
        };
        module.exports = Color;
    },
    'a': function (require, module, exports, global) {
        var tpl = require('7');
        var color = require('b');
        function McssError(message, line, options) {
            this.message = message;
            this.line = line;
            this.filename = options.filename;
            this.source = options.imports[options.filename];
            Error.captureStackTrace(this, McssError);
        }
        McssError.prototype.__proto__ = Error.prototype;
        McssError.prototype.name = 'McssError';
        function SyntaxError(message, line, options) {
            this.message = message;
            this.line = line;
            this.filename = options.filename;
            this.source = options.imports[options.filename];
            Error.captureStackTrace(this, SyntaxError);
        }
        SyntaxError.prototype.__proto__ = Error.prototype;
        SyntaxError.prototype.name = 'SyntaxError';
        exports.McssError = McssError;
        exports.SyntaxError = SyntaxError;
        exports.isMcssError = function (error) {
            return error instanceof SyntaxError || error instanceof McssError;
        };
        exports.tpls = {
            'unexcept': tpl('expcept {expcept} but got {type}'),
            'syntaxerror': tpl('expcept {expcept} but got {type}'),
            'tperror': tpl('expcept {expcept} but got {type}'),
            'outportError': tpl([
                '{message}\n',
                'at {filename} ({line}: {column})',
                '{#lines}',
                '{mark}|{index} {line}',
                '{/lines}'
            ].join(''))
        };
        exports.format = function (error) {
            if (!exports.isMcssError(error)) {
                throw error;
            }
            var source = error.source, lines = source.split(/\r\n|[\r\f\n]/), pos = error.pos, message = error.message, line = error.line || 1, column = error.column || 0, start = Math.max(1, line - 5), end = Math.min(lines.length, line + 4), res = [
                    color(error.name + ':' + message, 'red', null, 'bold'),
                    '\tat (' + color(error.filename, 'yellow') + ' : ' + line + ')'
                ];
            for (var i = start; i <= end; i++) {
                var cur = lines[i - 1], info;
                if (i === line) {
                    info = color('>>', 'red', null, 'bold') + getLineNum(i) + '| ' + cur.slice(0, column) + color(cur.slice(column), 'white', 'red');
                } else {
                    info = '  ' + getLineNum(i) + '| ' + cur;
                }
                res.push(info);
            }
            error.message = res.join('\n');
            return error;
        };
        function getLineNum(line) {
            return ('           ' + line).slice(-5) + '.';
        }
        var newline = /^[\n\f\r]/;
        function getLoc(pos, input) {
            var n = pos, column = -1, line;
            for (; n--;) {
                if (newline.test(input.charAt(n)) && n >= 0)
                    break;
                column++;
            }
            line = (input.slice(0, pos).match(/\r\n|[\r\f\n]/g) || '').length;
            return {
                line: line,
                column: column
            };
        }
    },
    'b': function (require, module, exports, global) {
        var colorToAnsi, colorify;
        colorToAnsi = {
            style: {
                normal: 0,
                bold: 1,
                underline: 4,
                blink: 5,
                strike: 9
            },
            fore: {
                black: 30,
                red: 31,
                green: 32,
                yellow: 33,
                blue: 34,
                magenta: 35,
                cyan: 36,
                white: 37,
                brightBlack: 90,
                brightRed: 91,
                brightGreen: 92,
                brightYellow: 99,
                brightBlue: 94,
                brightMagenta: 95,
                brightCyan: 96,
                brightWhite: 97
            },
            back: {
                black: 40,
                red: 41,
                green: 42,
                yellow: 43,
                blue: 44,
                magenta: 45,
                cyan: 46,
                white: 47,
                brightBlack: 100,
                brightRed: 101,
                brightGreen: 102,
                brightYellow: 103,
                brightBlue: 104,
                brightMagenta: 105,
                brightCyan: 106,
                brightWhite: 107
            }
        };
        module.exports = colorify = function (text, fore, back, style) {
            if (global.document && global.document.nodeType === 9)
                return text;
            var attrCode, backCode, foreCode, octpfx, reset, result, suffix, _ref;
            if (style == null) {
                style = 'normal';
            }
            if (typeof fore !== 'string') {
                _ref = fore, fore = _ref.fore, back = _ref.back, style = _ref.style;
            }
            result = [];
            if (foreCode = colorToAnsi.fore[fore] || parseInt(fore)) {
                result.push(foreCode);
            }
            if (backCode = colorToAnsi.back[back] || parseInt(back)) {
                result.push(backCode);
            }
            if (attrCode = colorToAnsi.style[style] || parseInt(style)) {
                result.push(attrCode);
            }
            suffix = result.join(';');
            octpfx = '\x1b';
            reset = '' + octpfx + '[0m';
            return '' + octpfx + '[' + suffix + 'm' + text + reset;
        };
    },
    'c': function (require, module, exports, global) {
        var _ = module.exports = Directive;
        function Directive() {
        }
        _.addDirective = function (name, def) {
        };
        _.getDirective = function (name) {
        };
    },
    'd': function (require, module, exports, global) {
        var _ = require('4');
        var tree = require('8');
        var formats = {
                'd': function (value) {
                    return parseInt(value.value, 10).toString(10);
                },
                'f': function (value) {
                    return parseFloat(value.value, 10).toString(10);
                },
                'x': function (value) {
                    return parseInt(value.value, 10).toString(16);
                },
                'X': function (value) {
                    return parseInt(value.value, 10).toString(16).toUpperCase();
                },
                's': function (value) {
                    return tree.toStr(value);
                }
            };
        var $ = module.exports = {
                '+': function (left, right) {
                    var value = left.value + right.value;
                    var unit = left.unit || right.unit;
                    if (left.type === 'DIMENSION' && right.type === 'DIMENSION') {
                        if (left.unit && right.unit && left.unit !== right.unit)
                            _.warn('unmatched unit, forced 2rd unit equal with the 1st one');
                        return {
                            type: left.type,
                            value: value,
                            unit: unit,
                            lineno: left.lineno
                        };
                    } else {
                        return {
                            type: left.type === 'DIMENSION' ? right.type : left.type,
                            value: tree.toStr(left) + tree.toStr(right),
                            lineno: left.lineno
                        };
                    }
                }.__accept([
                    'TEXT DIMENSION STRING',
                    'TEXT DIMENSION STRING'
                ]),
                '-': function (left, right) {
                    var value = left.value - right.value;
                    var unit = left.unit || right.unit;
                    if (left.unit && right.unit && left.unit !== right.unit)
                        _.warn('unmatched unit, forced 2rd unit equal with the 1st one');
                    return {
                        type: left.type,
                        value: value,
                        unit: unit,
                        lineno: left.lineno
                    };
                }.__accept([
                    'DIMENSION',
                    'DIMENSION'
                ]),
                '*': function (left, right) {
                    var value = left.value * right.value;
                    var unit = left.unit || right.unit;
                    if (left.unit && right.unit && left.unit !== right.unit)
                        _.warn('unmatched unit, forced 2rd unit equal with the 1st one');
                    return {
                        type: left.type,
                        value: value,
                        unit: unit,
                        lineno: left.lineno
                    };
                }.__accept([
                    'DIMENSION',
                    'DIMENSION'
                ]),
                '/': function (left, right) {
                    if (right.value === 0)
                        throw 'Divid by zero' + right.lineno;
                    var value = left.value / right.value;
                    var unit = left.unit || right.unit;
                    if (left.unit && right.unit && left.unit !== right.unit)
                        _.warn('unmatched unit, forced 2rd unit equal with the 1st one');
                    return {
                        type: left.type,
                        value: value,
                        unit: unit
                    };
                }.__accept([
                    'DIMENSION',
                    'DIMENSION'
                ]),
                '%': function (left, right) {
                    if (left.type === 'STRING') {
                        var values = right.list || [right], index = 0;
                        var value = left.value.replace(/\%(x|f|s|d|X)/g, function (all, format) {
                                var replace = values[index];
                                if (!replace)
                                    return '';
                                index++;
                                return formats[format](replace);
                            });
                        return {
                            type: 'STRING',
                            value: value,
                            lineno: left.lineno
                        };
                    } else {
                        if (right.value === 0)
                            throw 'Divid by zero' + right.lineno;
                        var value = left.value % right.value;
                        var unit = left.unit || right.unit;
                        if (left.unit && right.unit && left.unit !== right.unit)
                            _.warn('unmatched unit, forced 2rd unit equal with the 1st one');
                        return {
                            type: left.type,
                            value: value,
                            unit: unit,
                            lineno: left.lineno
                        };
                    }
                }.__accept(['DIMENSION STRING']),
                'relation': function (left, right, op) {
                    var bool = {
                            type: 'BOOLEAN',
                            lineno: left.lineno
                        };
                    var lv = left.value, rv = right.value, lt = left.type, rt = right.type, bv;
                    if (lt !== rt) {
                        if (~'STRING TEXT'.indexOf(lt) && ~'STRING TEXT'.indexOf(rt)) {
                            if (lv !== rv)
                                bv = op === '!=';
                            else
                                bv = op === '==';
                        } else {
                            bv = op === '!=';
                        }
                    } else {
                        if (lt === 'DIMENSION') {
                            if (lv > rv)
                                bv = op === '>' || op === '>=' || op === '!=';
                            if (lv < rv)
                                bv = op === '<' || op === '<=' || op === '!=';
                            if (lv === rv)
                                bv = op === '==' || op === '>=' || op === '<=';
                        } else {
                            if (tree.toStr(left) !== tree.toStr(right))
                                bv = op === '!=';
                            else
                                bv = op === '==';
                        }
                    }
                    bool.value = bv;
                    return bool;
                },
                '&&': function (left, right) {
                    var bool = tree.toBoolean(left);
                    if (!bool)
                        return left;
                    return this.walk ? this.walk(right) : right;
                },
                '||': function (left, right) {
                    var bool = tree.toBoolean(left);
                    if (bool)
                        return left;
                    return this.walk ? this.walk(right) : right;
                }
            };
    },
    'e': function (require, module, exports, global) {
        var slice = Array.prototype.slice, isFunction = function (fn) {
                return typeof fn == 'function';
            }, typeOf = function (obj) {
                return obj == null ? String(obj) : Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
            }, extend = function (o1, o2) {
                for (var i in o2) {
                    if (o2.hasOwnProperty(i))
                        o1[i] = o2[i];
                }
            }, merge = function (o1, o2) {
                for (var i in o2) {
                    if (!o2.hasOwnProperty(i))
                        continue;
                    if (typeOf(o1[i]) === 'array' || typeOf(o2[i]) === 'array') {
                        o1[i] = o1[i].concat(o2[i]);
                    } else {
                        o1[i] = o2[i];
                    }
                }
                return o1;
            }, states = {
                PENDING: 1,
                RESOLVED: 2,
                REJECTED: 3
            }, Promise = function () {
                this.state = states.PENDING;
                this.locked = false;
                this.args = [];
                this.doneCallbacks = [];
                this.failCallbacks = [];
                this.progressCallbacks = [];
            };
        extend(Promise.prototype, {
            lock: function () {
                this.locked = true;
                return this;
            },
            unlock: function () {
                this.locked = false;
                var method = {
                        2: 'resolve',
                        3: 'reject'
                    }[this.state];
                if (method)
                    this[method].apply(this, this.args);
                return this;
            },
            notify: function () {
                if (this.state !== states.PENDING)
                    return this;
                var fn, i = 0;
                if (this.locked)
                    return this;
                while ((fn = this.progressCallbacks[i++]) != null) {
                    fn.apply(this, arguments);
                }
                if (this.parent)
                    this.parent.sub--;
                return this;
            },
            reject: function () {
                if (this.state !== states.PENDING)
                    return this;
                var fn, args = this.args = slice.call(arguments);
                if (this.locked)
                    return this;
                while ((fn = this.failCallbacks.shift()) != null) {
                    fn.apply(this, arguments);
                }
                this.state = states.REJECTED;
                return this;
            },
            resolve: function () {
                if (this.state !== states.PENDING)
                    return this;
                var fn, args = this.args = slice.call(arguments);
                if (this.locked)
                    return this;
                while ((fn = this.doneCallbacks.shift()) != null) {
                    fn.apply(this, arguments);
                }
                this.state = states.RESOLVED;
                return this;
            },
            done: function (callback) {
                if (callback instanceof Promise) {
                    return this.done(function () {
                        var args = slice.call(arguments);
                        callback.resolve.apply(callback, args);
                    });
                }
                if (!isFunction(callback))
                    return this;
                if (!this._match(states.RESOLVED, callback)) {
                    this.doneCallbacks.push(callback.bind(this));
                }
                return this;
            },
            fail: function (callback) {
                if (callback instanceof Promise) {
                    return this.fail(function () {
                        var args = slice.call(arguments);
                        callback.reject.apply(callback, args);
                    });
                }
                if (!isFunction(callback))
                    return this;
                if (!this._match(states.REJECTED, callback)) {
                    this.failCallbacks.push(callback.bind(this));
                }
                return this;
            },
            progress: function (callback) {
                if (!isFunction(callback))
                    return this;
                this.progressCallbacks.push(callback);
                return this;
            },
            always: function (callback) {
                if (!callback)
                    return this;
                return this.done(callback).fail(callback);
            },
            then: function (doneCallback, failCallback) {
                if (!doneCallback) {
                    return this;
                }
                var promise = new Promise().lock();
                this.done(this._wraper(doneCallback, promise)).fail(promise);
                return promise;
            },
            pipe: function () {
                return this;
            },
            promise: function () {
                return this;
            },
            _wraper: function (fn, promise) {
                var self = this;
                return function () {
                    var result = fn.apply(self, arguments);
                    if (result instanceof Promise) {
                        extend(promise, result);
                        promise.unlock();
                    }
                };
            },
            _match: function (state, callback) {
                if (this.state == state) {
                    callback.apply(this, this.args);
                    return true;
                }
                return false;
            }
        });
        var promise = module.exports = function () {
                return new Promise();
            };
        extend(promise, {
            when: function () {
                var promises = slice.call(arguments), whenPromise = new Promise();
                whenPromise.waiting = promises.length;
                for (var i = 0, len = promises.length; i < len; i++) {
                    (function (i) {
                        promises[i].done(function () {
                            whenPromise.args[i] = typeOf(promises[i].args[0]) == 'array' ? promises[i].args[0] : promises[i].args;
                            if (!--whenPromise.waiting) {
                                whenPromise.resolve.apply(whenPromise, whenPromise.args);
                            }
                        });
                        promises[i].fail(function () {
                            whenPromise.reject.apply(whenPromise, promises[i].args);
                        });
                    }(i));
                }
                return whenPromise;
            },
            not: function (p) {
                var result = new Promise();
                p.done(result.reject.bind(result)).fail(result.resolve.bind(result));
                return result;
            },
            or: function () {
                var promises = slice.call(arguments), not = promise.not, negatedPromises = promises.map(not);
                return promise.not(promise.when.apply(this, negatedPromises));
            },
            isPromise: function (promise) {
                return promise && promise instanceof Promise;
            }
        });
    },
    'f': function (require, module, exports, global) {
        var _ = require('4');
        var API = {
                set: function (name, value) {
                    options = this.options || (this.options = {});
                    options[name] = value;
                    return this;
                }.__msetter(),
                get: function (name) {
                    options = this.options || (this.options = {});
                    return options[name];
                },
                has: function (name, value) {
                    if (!value)
                        return !!this.get(name);
                    return this.get(name) === value;
                },
                del: function (name) {
                    options = this.options || (this.options = {});
                    delete options[name];
                },
                add: function (name, item) {
                    options = this.options || (this.options = {});
                    if (!options[name])
                        options[name] = [];
                    var container = options[name];
                    if (container instanceof Array) {
                        container.push(item);
                    }
                    return this;
                }
            };
        exports.mixTo = function (obj) {
            obj = typeof obj == 'function' ? obj.prototype : obj;
            return _.extend(obj, API);
        };
    },
    'g': function (require, module, exports, global) {
        var Symtable = exports.SymbolTable = function () {
            };
        var Scope = exports.Scope = function (parentScope) {
                this.parentScope = parentScope;
                this.symtable = {};
                this.isStruct = false;
            };
        Scope.prototype = {
            getSpace: function () {
                return this.symtable;
            },
            resolve: function (name, first) {
                var scope = this;
                while (scope) {
                    var symbol = scope.symtable[name];
                    if (symbol)
                        return symbol;
                    else {
                        if (first)
                            return;
                        scope = scope.parentScope;
                    }
                }
            },
            define: function (name, value) {
                this.symtable[name] = value;
                return this;
            },
            getOuterScope: function () {
                return this.parentScope;
            },
            has: function (value) {
                var symtable = this.symtable;
                for (var i in symtable)
                    if (symtable.hasOwnProperty(i)) {
                        if (symtable[i] == value) {
                            return true;
                        }
                    }
                return false;
            },
            toStruct: function () {
                var scope = new Scope();
                scope.isStruct = true;
                scope.symtable = this.symtable;
                return scope;
            }
        };
    },
    'h': function (require, module, exports, global) {
        var _ = require('4');
        module.exports = { remoteFileCache: _.cache(20) };
    },
    'i': function (require, module, exports, global) {
        var fs = null;
        var path = null;
        var promise = require('e');
        var Parser = require('2');
        exports.get = function (path) {
            var pr;
            if (/^http/.test(path) && fs) {
                var request = require('j').request;
                pr = promise();
                request(path, function (err, response, body) {
                    if (err)
                        return pr.reject(err);
                    if (!err && response.statusCode >= 200 && response.statusCode < 400) {
                        pr.resolve(body);
                    } else {
                        pr.reject('http request error with code: ' + response.statusCode);
                    }
                });
                return pr;
            } else {
                if (fs) {
                    return file(path, 'utf8');
                } else {
                    return http(path);
                }
            }
        };
        exports.parse = function (path, options) {
            var p = promise();
            options.filename = path;
            exports.get(path).done(function (text) {
                new Parser(options).parse(text).always(p);
            }).fail(p);
            return p;
        };
        var http = function (url) {
            var p = promise();
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.onreadystatechange = function () {
                if (xhr.readyState !== 4)
                    return;
                var status = xhr.status;
                if (status >= 200 && status < 300) {
                    p.resolve(xhr.responseText);
                } else {
                    p.reject(xhr);
                }
            };
            xhr.send();
            return p;
        };
        var file = function (path) {
            var p = promise();
            fs.readFile(path, 'utf8', function (error, content) {
                if (error)
                    return p.reject(error);
                p.resolve(content);
            });
            return p;
        };
    },
    'j': function (require, module, exports, global) {
        var mcss = module.exports = require('1');
        mcss.sourcemap = require('k');
        mcss.request = require('u');
    },
    'k': function (require, module, exports, global) {
        exports.SourceMapGenerator = require('l').SourceMapGenerator;
        exports.SourceMapConsumer = require('r').SourceMapConsumer;
        exports.SourceNode = require('t').SourceNode;
    },
    'l': function (require, module, exports, global) {
        if (typeof define !== 'function') {
            var define = require('m')(module);
        }
        define(function (require, exports, module) {
            var base64VLQ = require('n');
            var util = require('p');
            var ArraySet = require('q').ArraySet;
            function SourceMapGenerator(aArgs) {
                this._file = util.getArg(aArgs, 'file');
                this._sourceRoot = util.getArg(aArgs, 'sourceRoot', null);
                this._sources = new ArraySet();
                this._names = new ArraySet();
                this._mappings = [];
                this._sourcesContents = null;
            }
            SourceMapGenerator.prototype._version = 3;
            SourceMapGenerator.fromSourceMap = function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
                var sourceRoot = aSourceMapConsumer.sourceRoot;
                var generator = new SourceMapGenerator({
                        file: aSourceMapConsumer.file,
                        sourceRoot: sourceRoot
                    });
                aSourceMapConsumer.eachMapping(function (mapping) {
                    var newMapping = {
                            generated: {
                                line: mapping.generatedLine,
                                column: mapping.generatedColumn
                            }
                        };
                    if (mapping.source) {
                        newMapping.source = mapping.source;
                        if (sourceRoot) {
                            newMapping.source = util.relative(sourceRoot, newMapping.source);
                        }
                        newMapping.original = {
                            line: mapping.originalLine,
                            column: mapping.originalColumn
                        };
                        if (mapping.name) {
                            newMapping.name = mapping.name;
                        }
                    }
                    generator.addMapping(newMapping);
                });
                aSourceMapConsumer.sources.forEach(function (sourceFile) {
                    var content = aSourceMapConsumer.sourceContentFor(sourceFile);
                    if (content) {
                        generator.setSourceContent(sourceFile, content);
                    }
                });
                return generator;
            };
            SourceMapGenerator.prototype.addMapping = function SourceMapGenerator_addMapping(aArgs) {
                var generated = util.getArg(aArgs, 'generated');
                var original = util.getArg(aArgs, 'original', null);
                var source = util.getArg(aArgs, 'source', null);
                var name = util.getArg(aArgs, 'name', null);
                this._validateMapping(generated, original, source, name);
                if (source && !this._sources.has(source)) {
                    this._sources.add(source);
                }
                if (name && !this._names.has(name)) {
                    this._names.add(name);
                }
                this._mappings.push({
                    generated: generated,
                    original: original,
                    source: source,
                    name: name
                });
            };
            SourceMapGenerator.prototype.setSourceContent = function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
                var source = aSourceFile;
                if (this._sourceRoot) {
                    source = util.relative(this._sourceRoot, source);
                }
                if (aSourceContent !== null) {
                    if (!this._sourcesContents) {
                        this._sourcesContents = {};
                    }
                    this._sourcesContents[util.toSetString(source)] = aSourceContent;
                } else {
                    delete this._sourcesContents[util.toSetString(source)];
                    if (Object.keys(this._sourcesContents).length === 0) {
                        this._sourcesContents = null;
                    }
                }
            };
            SourceMapGenerator.prototype.applySourceMap = function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile) {
                if (!aSourceFile) {
                    aSourceFile = aSourceMapConsumer.file;
                }
                var sourceRoot = this._sourceRoot;
                if (sourceRoot) {
                    aSourceFile = util.relative(sourceRoot, aSourceFile);
                }
                var newSources = new ArraySet();
                var newNames = new ArraySet();
                this._mappings.forEach(function (mapping) {
                    if (mapping.source === aSourceFile && mapping.original) {
                        var original = aSourceMapConsumer.originalPositionFor({
                                line: mapping.original.line,
                                column: mapping.original.column
                            });
                        if (original.source !== null) {
                            if (sourceRoot) {
                                mapping.source = util.relative(sourceRoot, original.source);
                            } else {
                                mapping.source = original.source;
                            }
                            mapping.original.line = original.line;
                            mapping.original.column = original.column;
                            if (original.name !== null && mapping.name !== null) {
                                mapping.name = original.name;
                            }
                        }
                    }
                    var source = mapping.source;
                    if (source && !newSources.has(source)) {
                        newSources.add(source);
                    }
                    var name = mapping.name;
                    if (name && !newNames.has(name)) {
                        newNames.add(name);
                    }
                }, this);
                this._sources = newSources;
                this._names = newNames;
                aSourceMapConsumer.sources.forEach(function (sourceFile) {
                    var content = aSourceMapConsumer.sourceContentFor(sourceFile);
                    if (content) {
                        if (sourceRoot) {
                            sourceFile = util.relative(sourceRoot, sourceFile);
                        }
                        this.setSourceContent(sourceFile, content);
                    }
                }, this);
            };
            SourceMapGenerator.prototype._validateMapping = function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource, aName) {
                if (aGenerated && 'line' in aGenerated && 'column' in aGenerated && aGenerated.line > 0 && aGenerated.column >= 0 && !aOriginal && !aSource && !aName) {
                    return;
                } else if (aGenerated && 'line' in aGenerated && 'column' in aGenerated && aOriginal && 'line' in aOriginal && 'column' in aOriginal && aGenerated.line > 0 && aGenerated.column >= 0 && aOriginal.line > 0 && aOriginal.column >= 0 && aSource) {
                    return;
                } else {
                    throw new Error('Invalid mapping.');
                }
            };
            function cmpLocation(loc1, loc2) {
                var cmp = (loc1 && loc1.line) - (loc2 && loc2.line);
                return cmp ? cmp : (loc1 && loc1.column) - (loc2 && loc2.column);
            }
            function strcmp(str1, str2) {
                str1 = str1 || '';
                str2 = str2 || '';
                return (str1 > str2) - (str1 < str2);
            }
            function cmpMapping(mappingA, mappingB) {
                return cmpLocation(mappingA.generated, mappingB.generated) || cmpLocation(mappingA.original, mappingB.original) || strcmp(mappingA.source, mappingB.source) || strcmp(mappingA.name, mappingB.name);
            }
            SourceMapGenerator.prototype._serializeMappings = function SourceMapGenerator_serializeMappings() {
                var previousGeneratedColumn = 0;
                var previousGeneratedLine = 1;
                var previousOriginalColumn = 0;
                var previousOriginalLine = 0;
                var previousName = 0;
                var previousSource = 0;
                var result = '';
                var mapping;
                this._mappings.sort(cmpMapping);
                for (var i = 0, len = this._mappings.length; i < len; i++) {
                    mapping = this._mappings[i];
                    if (mapping.generated.line !== previousGeneratedLine) {
                        previousGeneratedColumn = 0;
                        while (mapping.generated.line !== previousGeneratedLine) {
                            result += ';';
                            previousGeneratedLine++;
                        }
                    } else {
                        if (i > 0) {
                            if (!cmpMapping(mapping, this._mappings[i - 1])) {
                                continue;
                            }
                            result += ',';
                        }
                    }
                    result += base64VLQ.encode(mapping.generated.column - previousGeneratedColumn);
                    previousGeneratedColumn = mapping.generated.column;
                    if (mapping.source && mapping.original) {
                        result += base64VLQ.encode(this._sources.indexOf(mapping.source) - previousSource);
                        previousSource = this._sources.indexOf(mapping.source);
                        result += base64VLQ.encode(mapping.original.line - 1 - previousOriginalLine);
                        previousOriginalLine = mapping.original.line - 1;
                        result += base64VLQ.encode(mapping.original.column - previousOriginalColumn);
                        previousOriginalColumn = mapping.original.column;
                        if (mapping.name) {
                            result += base64VLQ.encode(this._names.indexOf(mapping.name) - previousName);
                            previousName = this._names.indexOf(mapping.name);
                        }
                    }
                }
                return result;
            };
            SourceMapGenerator.prototype.toJSON = function SourceMapGenerator_toJSON() {
                var map = {
                        version: this._version,
                        file: this._file,
                        sources: this._sources.toArray(),
                        names: this._names.toArray(),
                        mappings: this._serializeMappings()
                    };
                if (this._sourceRoot) {
                    map.sourceRoot = this._sourceRoot;
                }
                if (this._sourcesContents) {
                    map.sourcesContent = map.sources.map(function (source) {
                        if (map.sourceRoot) {
                            source = util.relative(map.sourceRoot, source);
                        }
                        return Object.prototype.hasOwnProperty.call(this._sourcesContents, util.toSetString(source)) ? this._sourcesContents[util.toSetString(source)] : null;
                    }, this);
                }
                return map;
            };
            SourceMapGenerator.prototype.toString = function SourceMapGenerator_toString() {
                return JSON.stringify(this);
            };
            exports.SourceMapGenerator = SourceMapGenerator;
        });
    },
    'm': function (require, module, exports, global) {
        'use strict';
        var path = null;
        function amdefine(module, require) {
            var defineCache = {}, loaderCache = {}, alreadyCalled = false, makeRequire, stringRequire;
            function trimDots(ary) {
                var i, part;
                for (i = 0; ary[i]; i += 1) {
                    part = ary[i];
                    if (part === '.') {
                        ary.splice(i, 1);
                        i -= 1;
                    } else if (part === '..') {
                        if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
                            break;
                        } else if (i > 0) {
                            ary.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
            }
            function normalize(name, baseName) {
                var baseParts;
                if (name && name.charAt(0) === '.') {
                    if (baseName) {
                        baseParts = baseName.split('/');
                        baseParts = baseParts.slice(0, baseParts.length - 1);
                        baseParts = baseParts.concat(name.split('/'));
                        trimDots(baseParts);
                        name = baseParts.join('/');
                    }
                }
                return name;
            }
            function makeNormalize(relName) {
                return function (name) {
                    return normalize(name, relName);
                };
            }
            function makeLoad(id) {
                function load(value) {
                    loaderCache[id] = value;
                }
                load.fromText = function (id, text) {
                    throw new Error('amdefine does not implement load.fromText');
                };
                return load;
            }
            makeRequire = function (systemRequire, exports, module, relId) {
                function amdRequire(deps, callback) {
                    if (typeof deps === 'string') {
                        return stringRequire(systemRequire, exports, module, deps, relId);
                    } else {
                        deps = deps.map(function (depName) {
                            return stringRequire(systemRequire, exports, module, depName, relId);
                        });
                        process.nextTick(function () {
                            callback.apply(null, deps);
                        });
                    }
                }
                amdRequire.toUrl = function (filePath) {
                    if (filePath.indexOf('.') === 0) {
                        return normalize(filePath, path.dirname(module.filename));
                    } else {
                        return filePath;
                    }
                };
                return amdRequire;
            };
            require = require || function req() {
                return module.require.apply(module, arguments);
            };
            function runFactory(id, deps, factory) {
                var r, e, m, result;
                if (id) {
                    e = loaderCache[id] = {};
                    m = {
                        id: id,
                        uri: __filename,
                        exports: e
                    };
                    r = makeRequire(require, e, m, id);
                } else {
                    if (alreadyCalled) {
                        throw new Error('amdefine with no module ID cannot be called more than once per file.');
                    }
                    alreadyCalled = true;
                    e = module.exports;
                    m = module;
                    r = makeRequire(require, e, m, module.id);
                }
                if (deps) {
                    deps = deps.map(function (depName) {
                        return r(depName);
                    });
                }
                if (typeof factory === 'function') {
                    result = factory.apply(module.exports, deps);
                } else {
                    result = factory;
                }
                if (result !== undefined) {
                    m.exports = result;
                    if (id) {
                        loaderCache[id] = m.exports;
                    }
                }
            }
            stringRequire = function (systemRequire, exports, module, id, relId) {
                var index = id.indexOf('!'), originalId = id, prefix, plugin;
                if (index === -1) {
                    id = normalize(id, relId);
                    if (id === 'require') {
                        return makeRequire(systemRequire, exports, module, relId);
                    } else if (id === 'exports') {
                        return exports;
                    } else if (id === 'module') {
                        return module;
                    } else if (loaderCache.hasOwnProperty(id)) {
                        return loaderCache[id];
                    } else if (defineCache[id]) {
                        runFactory.apply(null, defineCache[id]);
                        return loaderCache[id];
                    } else {
                        if (systemRequire) {
                            return systemRequire(originalId);
                        } else {
                            throw new Error('No module with ID: ' + id);
                        }
                    }
                } else {
                    prefix = id.substring(0, index);
                    id = id.substring(index + 1, id.length);
                    plugin = stringRequire(systemRequire, exports, module, prefix, relId);
                    if (plugin.normalize) {
                        id = plugin.normalize(id, makeNormalize(relId));
                    } else {
                        id = normalize(id, relId);
                    }
                    if (loaderCache[id]) {
                        return loaderCache[id];
                    } else {
                        plugin.load(id, makeRequire(systemRequire, exports, module, relId), makeLoad(id), {});
                        return loaderCache[id];
                    }
                }
            };
            function define(id, deps, factory) {
                if (Array.isArray(id)) {
                    factory = deps;
                    deps = id;
                    id = undefined;
                } else if (typeof id !== 'string') {
                    factory = id;
                    id = deps = undefined;
                }
                if (deps && !Array.isArray(deps)) {
                    factory = deps;
                    deps = undefined;
                }
                if (!deps) {
                    deps = [
                        'require',
                        'exports',
                        'module'
                    ];
                }
                if (id) {
                    defineCache[id] = [
                        id,
                        deps,
                        factory
                    ];
                } else {
                    runFactory(id, deps, factory);
                }
            }
            define.require = function (id) {
                if (loaderCache[id]) {
                    return loaderCache[id];
                }
                if (defineCache[id]) {
                    runFactory.apply(null, defineCache[id]);
                    return loaderCache[id];
                }
            };
            define.amd = {};
            return define;
        }
        module.exports = amdefine;
    },
    'n': function (require, module, exports, global) {
        if (typeof define !== 'function') {
            var define = require('m')(module);
        }
        define(function (require, exports, module) {
            var base64 = require('o');
            var VLQ_BASE_SHIFT = 5;
            var VLQ_BASE = 1 << VLQ_BASE_SHIFT;
            var VLQ_BASE_MASK = VLQ_BASE - 1;
            var VLQ_CONTINUATION_BIT = VLQ_BASE;
            function toVLQSigned(aValue) {
                return aValue < 0 ? (-aValue << 1) + 1 : (aValue << 1) + 0;
            }
            function fromVLQSigned(aValue) {
                var isNegative = (aValue & 1) === 1;
                var shifted = aValue >> 1;
                return isNegative ? -shifted : shifted;
            }
            exports.encode = function base64VLQ_encode(aValue) {
                var encoded = '';
                var digit;
                var vlq = toVLQSigned(aValue);
                do {
                    digit = vlq & VLQ_BASE_MASK;
                    vlq >>>= VLQ_BASE_SHIFT;
                    if (vlq > 0) {
                        digit |= VLQ_CONTINUATION_BIT;
                    }
                    encoded += base64.encode(digit);
                } while (vlq > 0);
                return encoded;
            };
            exports.decode = function base64VLQ_decode(aStr) {
                var i = 0;
                var strLen = aStr.length;
                var result = 0;
                var shift = 0;
                var continuation, digit;
                do {
                    if (i >= strLen) {
                        throw new Error('Expected more digits in base 64 VLQ value.');
                    }
                    digit = base64.decode(aStr.charAt(i++));
                    continuation = !!(digit & VLQ_CONTINUATION_BIT);
                    digit &= VLQ_BASE_MASK;
                    result = result + (digit << shift);
                    shift += VLQ_BASE_SHIFT;
                } while (continuation);
                return {
                    value: fromVLQSigned(result),
                    rest: aStr.slice(i)
                };
            };
        });
    },
    'o': function (require, module, exports, global) {
        if (typeof define !== 'function') {
            var define = require('m')(module);
        }
        define(function (require, exports, module) {
            var charToIntMap = {};
            var intToCharMap = {};
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('').forEach(function (ch, index) {
                charToIntMap[ch] = index;
                intToCharMap[index] = ch;
            });
            exports.encode = function base64_encode(aNumber) {
                if (aNumber in intToCharMap) {
                    return intToCharMap[aNumber];
                }
                throw new TypeError('Must be between 0 and 63: ' + aNumber);
            };
            exports.decode = function base64_decode(aChar) {
                if (aChar in charToIntMap) {
                    return charToIntMap[aChar];
                }
                throw new TypeError('Not a valid base 64 digit: ' + aChar);
            };
        });
    },
    'p': function (require, module, exports, global) {
        if (typeof define !== 'function') {
            var define = require('m')(module);
        }
        define(function (require, exports, module) {
            function getArg(aArgs, aName, aDefaultValue) {
                if (aName in aArgs) {
                    return aArgs[aName];
                } else if (arguments.length === 3) {
                    return aDefaultValue;
                } else {
                    throw new Error('"' + aName + '" is a required argument.');
                }
            }
            exports.getArg = getArg;
            var urlRegexp = /([\w+\-.]+):\/\/((\w+:\w+)@)?([\w.]+)?(:(\d+))?(\S+)?/;
            function urlParse(aUrl) {
                var match = aUrl.match(urlRegexp);
                if (!match) {
                    return null;
                }
                return {
                    scheme: match[1],
                    auth: match[3],
                    host: match[4],
                    port: match[6],
                    path: match[7]
                };
            }
            function join(aRoot, aPath) {
                var url;
                if (aPath.match(urlRegexp)) {
                    return aPath;
                }
                if (aPath.charAt(0) === '/' && (url = urlParse(aRoot))) {
                    return aRoot.replace(url.path, '') + aPath;
                }
                return aRoot.replace(/\/$/, '') + '/' + aPath;
            }
            exports.join = join;
            function toSetString(aStr) {
                return '$' + aStr;
            }
            exports.toSetString = toSetString;
            function fromSetString(aStr) {
                return aStr.substr(1);
            }
            exports.fromSetString = fromSetString;
            function relative(aRoot, aPath) {
                aRoot = aRoot.replace(/\/$/, '');
                return aPath.indexOf(aRoot + '/') === 0 ? aPath.substr(aRoot.length + 1) : aPath;
            }
            exports.relative = relative;
        });
    },
    'q': function (require, module, exports, global) {
        if (typeof define !== 'function') {
            var define = require('m')(module);
        }
        define(function (require, exports, module) {
            var util = require('p');
            function ArraySet() {
                this._array = [];
                this._set = {};
            }
            ArraySet.fromArray = function ArraySet_fromArray(aArray) {
                var set = new ArraySet();
                for (var i = 0, len = aArray.length; i < len; i++) {
                    set.add(aArray[i]);
                }
                return set;
            };
            ArraySet.prototype.add = function ArraySet_add(aStr) {
                if (this.has(aStr)) {
                    return;
                }
                var idx = this._array.length;
                this._array.push(aStr);
                this._set[util.toSetString(aStr)] = idx;
            };
            ArraySet.prototype.has = function ArraySet_has(aStr) {
                return Object.prototype.hasOwnProperty.call(this._set, util.toSetString(aStr));
            };
            ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
                if (this.has(aStr)) {
                    return this._set[util.toSetString(aStr)];
                }
                throw new Error('"' + aStr + '" is not in the set.');
            };
            ArraySet.prototype.at = function ArraySet_at(aIdx) {
                if (aIdx >= 0 && aIdx < this._array.length) {
                    return this._array[aIdx];
                }
                throw new Error('No element indexed by ' + aIdx);
            };
            ArraySet.prototype.toArray = function ArraySet_toArray() {
                return this._array.slice();
            };
            exports.ArraySet = ArraySet;
        });
    },
    'r': function (require, module, exports, global) {
        if (typeof define !== 'function') {
            var define = require('m')(module);
        }
        define(function (require, exports, module) {
            var util = require('p');
            var binarySearch = require('s');
            var ArraySet = require('q').ArraySet;
            var base64VLQ = require('n');
            function SourceMapConsumer(aSourceMap) {
                var sourceMap = aSourceMap;
                if (typeof aSourceMap === 'string') {
                    sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
                }
                var version = util.getArg(sourceMap, 'version');
                var sources = util.getArg(sourceMap, 'sources');
                var names = util.getArg(sourceMap, 'names');
                var sourceRoot = util.getArg(sourceMap, 'sourceRoot', null);
                var sourcesContent = util.getArg(sourceMap, 'sourcesContent', null);
                var mappings = util.getArg(sourceMap, 'mappings');
                var file = util.getArg(sourceMap, 'file');
                if (version !== this._version) {
                    throw new Error('Unsupported version: ' + version);
                }
                this._names = ArraySet.fromArray(names);
                this._sources = ArraySet.fromArray(sources);
                this.sourceRoot = sourceRoot;
                this.sourcesContent = sourcesContent;
                this.file = file;
                this._generatedMappings = [];
                this._originalMappings = [];
                this._parseMappings(mappings, sourceRoot);
            }
            SourceMapConsumer.prototype._version = 3;
            Object.defineProperty(SourceMapConsumer.prototype, 'sources', {
                get: function () {
                    return this._sources.toArray().map(function (s) {
                        return this.sourceRoot ? util.join(this.sourceRoot, s) : s;
                    }, this);
                }
            });
            SourceMapConsumer.prototype._parseMappings = function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
                var generatedLine = 1;
                var previousGeneratedColumn = 0;
                var previousOriginalLine = 0;
                var previousOriginalColumn = 0;
                var previousSource = 0;
                var previousName = 0;
                var mappingSeparator = /^[,;]/;
                var str = aStr;
                var mapping;
                var temp;
                while (str.length > 0) {
                    if (str.charAt(0) === ';') {
                        generatedLine++;
                        str = str.slice(1);
                        previousGeneratedColumn = 0;
                    } else if (str.charAt(0) === ',') {
                        str = str.slice(1);
                    } else {
                        mapping = {};
                        mapping.generatedLine = generatedLine;
                        temp = base64VLQ.decode(str);
                        mapping.generatedColumn = previousGeneratedColumn + temp.value;
                        previousGeneratedColumn = mapping.generatedColumn;
                        str = temp.rest;
                        if (str.length > 0 && !mappingSeparator.test(str.charAt(0))) {
                            temp = base64VLQ.decode(str);
                            mapping.source = this._sources.at(previousSource + temp.value);
                            previousSource += temp.value;
                            str = temp.rest;
                            if (str.length === 0 || mappingSeparator.test(str.charAt(0))) {
                                throw new Error('Found a source, but no line and column');
                            }
                            temp = base64VLQ.decode(str);
                            mapping.originalLine = previousOriginalLine + temp.value;
                            previousOriginalLine = mapping.originalLine;
                            mapping.originalLine += 1;
                            str = temp.rest;
                            if (str.length === 0 || mappingSeparator.test(str.charAt(0))) {
                                throw new Error('Found a source and line, but no column');
                            }
                            temp = base64VLQ.decode(str);
                            mapping.originalColumn = previousOriginalColumn + temp.value;
                            previousOriginalColumn = mapping.originalColumn;
                            str = temp.rest;
                            if (str.length > 0 && !mappingSeparator.test(str.charAt(0))) {
                                temp = base64VLQ.decode(str);
                                mapping.name = this._names.at(previousName + temp.value);
                                previousName += temp.value;
                                str = temp.rest;
                            }
                        }
                        this._generatedMappings.push(mapping);
                        if (typeof mapping.originalLine === 'number') {
                            this._originalMappings.push(mapping);
                        }
                    }
                }
                this._originalMappings.sort(this._compareOriginalPositions);
            };
            SourceMapConsumer.prototype._compareOriginalPositions = function SourceMapConsumer_compareOriginalPositions(mappingA, mappingB) {
                if (mappingA.source > mappingB.source) {
                    return 1;
                } else if (mappingA.source < mappingB.source) {
                    return -1;
                } else {
                    var cmp = mappingA.originalLine - mappingB.originalLine;
                    return cmp === 0 ? mappingA.originalColumn - mappingB.originalColumn : cmp;
                }
            };
            SourceMapConsumer.prototype._compareGeneratedPositions = function SourceMapConsumer_compareGeneratedPositions(mappingA, mappingB) {
                var cmp = mappingA.generatedLine - mappingB.generatedLine;
                return cmp === 0 ? mappingA.generatedColumn - mappingB.generatedColumn : cmp;
            };
            SourceMapConsumer.prototype._findMapping = function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName, aColumnName, aComparator) {
                if (aNeedle[aLineName] <= 0) {
                    throw new TypeError('Line must be greater than or equal to 1, got ' + aNeedle[aLineName]);
                }
                if (aNeedle[aColumnName] < 0) {
                    throw new TypeError('Column must be greater than or equal to 0, got ' + aNeedle[aColumnName]);
                }
                return binarySearch.search(aNeedle, aMappings, aComparator);
            };
            SourceMapConsumer.prototype.originalPositionFor = function SourceMapConsumer_originalPositionFor(aArgs) {
                var needle = {
                        generatedLine: util.getArg(aArgs, 'line'),
                        generatedColumn: util.getArg(aArgs, 'column')
                    };
                var mapping = this._findMapping(needle, this._generatedMappings, 'generatedLine', 'generatedColumn', this._compareGeneratedPositions);
                if (mapping) {
                    var source = util.getArg(mapping, 'source', null);
                    if (source && this.sourceRoot) {
                        source = util.join(this.sourceRoot, source);
                    }
                    return {
                        source: source,
                        line: util.getArg(mapping, 'originalLine', null),
                        column: util.getArg(mapping, 'originalColumn', null),
                        name: util.getArg(mapping, 'name', null)
                    };
                }
                return {
                    source: null,
                    line: null,
                    column: null,
                    name: null
                };
            };
            SourceMapConsumer.prototype.sourceContentFor = function SourceMapConsumer_sourceContentFor(aSource) {
                if (!this.sourcesContent) {
                    return null;
                }
                if (this.sourceRoot) {
                    var relativeUrl = util.relative(this.sourceRoot, aSource);
                    if (this._sources.has(relativeUrl)) {
                        return this.sourcesContent[this._sources.indexOf(relativeUrl)];
                    }
                }
                if (this._sources.has(aSource)) {
                    return this.sourcesContent[this._sources.indexOf(aSource)];
                }
                throw new Error('"' + aSource + '" is not in the SourceMap.');
            };
            SourceMapConsumer.prototype.generatedPositionFor = function SourceMapConsumer_generatedPositionFor(aArgs) {
                var needle = {
                        source: util.getArg(aArgs, 'source'),
                        originalLine: util.getArg(aArgs, 'line'),
                        originalColumn: util.getArg(aArgs, 'column')
                    };
                if (this.sourceRoot) {
                    needle.source = util.relative(this.sourceRoot, needle.source);
                }
                var mapping = this._findMapping(needle, this._originalMappings, 'originalLine', 'originalColumn', this._compareOriginalPositions);
                if (mapping) {
                    return {
                        line: util.getArg(mapping, 'generatedLine', null),
                        column: util.getArg(mapping, 'generatedColumn', null)
                    };
                }
                return {
                    line: null,
                    column: null
                };
            };
            SourceMapConsumer.GENERATED_ORDER = 1;
            SourceMapConsumer.ORIGINAL_ORDER = 2;
            SourceMapConsumer.prototype.eachMapping = function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
                var context = aContext || null;
                var order = aOrder || SourceMapConsumer.GENERATED_ORDER;
                var mappings;
                switch (order) {
                case SourceMapConsumer.GENERATED_ORDER:
                    mappings = this._generatedMappings;
                    break;
                case SourceMapConsumer.ORIGINAL_ORDER:
                    mappings = this._originalMappings;
                    break;
                default:
                    throw new Error('Unknown order of iteration.');
                }
                var sourceRoot = this.sourceRoot;
                mappings.map(function (mapping) {
                    var source = mapping.source;
                    if (source && sourceRoot) {
                        source = util.join(sourceRoot, source);
                    }
                    return {
                        source: source,
                        generatedLine: mapping.generatedLine,
                        generatedColumn: mapping.generatedColumn,
                        originalLine: mapping.originalLine,
                        originalColumn: mapping.originalColumn,
                        name: mapping.name
                    };
                }).forEach(aCallback, context);
            };
            exports.SourceMapConsumer = SourceMapConsumer;
        });
    },
    's': function (require, module, exports, global) {
        if (typeof define !== 'function') {
            var define = require('m')(module);
        }
        define(function (require, exports, module) {
            function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare) {
                var mid = Math.floor((aHigh - aLow) / 2) + aLow;
                var cmp = aCompare(aNeedle, aHaystack[mid]);
                if (cmp === 0) {
                    return aHaystack[mid];
                } else if (cmp > 0) {
                    if (aHigh - mid > 1) {
                        return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare);
                    }
                    return aHaystack[mid];
                } else {
                    if (mid - aLow > 1) {
                        return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare);
                    }
                    return aLow < 0 ? null : aHaystack[aLow];
                }
            }
            exports.search = function search(aNeedle, aHaystack, aCompare) {
                return aHaystack.length > 0 ? recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack, aCompare) : null;
            };
        });
    },
    't': function (require, module, exports, global) {
        if (typeof define !== 'function') {
            var define = require('m')(module);
        }
        define(function (require, exports, module) {
            var SourceMapGenerator = require('l').SourceMapGenerator;
            var util = require('p');
            function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
                this.children = [];
                this.sourceContents = {};
                this.line = aLine === undefined ? null : aLine;
                this.column = aColumn === undefined ? null : aColumn;
                this.source = aSource === undefined ? null : aSource;
                this.name = aName === undefined ? null : aName;
                if (aChunks != null)
                    this.add(aChunks);
            }
            SourceNode.fromStringWithSourceMap = function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer) {
                var node = new SourceNode();
                var remainingLines = aGeneratedCode.split('\n');
                var lastGeneratedLine = 1, lastGeneratedColumn = 0;
                var lastMapping = null;
                aSourceMapConsumer.eachMapping(function (mapping) {
                    if (lastMapping === null) {
                        while (lastGeneratedLine < mapping.generatedLine) {
                            node.add(remainingLines.shift() + '\n');
                            lastGeneratedLine++;
                        }
                        if (lastGeneratedColumn < mapping.generatedColumn) {
                            var nextLine = remainingLines[0];
                            node.add(nextLine.substr(0, mapping.generatedColumn));
                            remainingLines[0] = nextLine.substr(mapping.generatedColumn);
                            lastGeneratedColumn = mapping.generatedColumn;
                        }
                    } else {
                        if (lastGeneratedLine < mapping.generatedLine) {
                            var code = '';
                            do {
                                code += remainingLines.shift() + '\n';
                                lastGeneratedLine++;
                                lastGeneratedColumn = 0;
                            } while (lastGeneratedLine < mapping.generatedLine);
                            if (lastGeneratedColumn < mapping.generatedColumn) {
                                var nextLine = remainingLines[0];
                                code += nextLine.substr(0, mapping.generatedColumn);
                                remainingLines[0] = nextLine.substr(mapping.generatedColumn);
                                lastGeneratedColumn = mapping.generatedColumn;
                            }
                            addMappingWithCode(lastMapping, code);
                        } else {
                            var nextLine = remainingLines[0];
                            var code = nextLine.substr(0, mapping.generatedColumn - lastGeneratedColumn);
                            remainingLines[0] = nextLine.substr(mapping.generatedColumn - lastGeneratedColumn);
                            lastGeneratedColumn = mapping.generatedColumn;
                            addMappingWithCode(lastMapping, code);
                        }
                    }
                    lastMapping = mapping;
                }, this);
                addMappingWithCode(lastMapping, remainingLines.join('\n'));
                aSourceMapConsumer.sources.forEach(function (sourceFile) {
                    var content = aSourceMapConsumer.sourceContentFor(sourceFile);
                    if (content) {
                        node.setSourceContent(sourceFile, content);
                    }
                });
                return node;
                function addMappingWithCode(mapping, code) {
                    if (mapping.source === undefined) {
                        node.add(code);
                    } else {
                        node.add(new SourceNode(mapping.originalLine, mapping.originalColumn, mapping.source, code, mapping.name));
                    }
                }
            };
            SourceNode.prototype.add = function SourceNode_add(aChunk) {
                if (Array.isArray(aChunk)) {
                    aChunk.forEach(function (chunk) {
                        this.add(chunk);
                    }, this);
                } else if (aChunk instanceof SourceNode || typeof aChunk === 'string') {
                    if (aChunk) {
                        this.children.push(aChunk);
                    }
                } else {
                    throw new TypeError('Expected a SourceNode, string, or an array of SourceNodes and strings. Got ' + aChunk);
                }
                return this;
            };
            SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
                if (Array.isArray(aChunk)) {
                    for (var i = aChunk.length - 1; i >= 0; i--) {
                        this.prepend(aChunk[i]);
                    }
                } else if (aChunk instanceof SourceNode || typeof aChunk === 'string') {
                    this.children.unshift(aChunk);
                } else {
                    throw new TypeError('Expected a SourceNode, string, or an array of SourceNodes and strings. Got ' + aChunk);
                }
                return this;
            };
            SourceNode.prototype.walk = function SourceNode_walk(aFn) {
                this.children.forEach(function (chunk) {
                    if (chunk instanceof SourceNode) {
                        chunk.walk(aFn);
                    } else {
                        if (chunk !== '') {
                            aFn(chunk, {
                                source: this.source,
                                line: this.line,
                                column: this.column,
                                name: this.name
                            });
                        }
                    }
                }, this);
            };
            SourceNode.prototype.join = function SourceNode_join(aSep) {
                var newChildren;
                var i;
                var len = this.children.length;
                if (len > 0) {
                    newChildren = [];
                    for (i = 0; i < len - 1; i++) {
                        newChildren.push(this.children[i]);
                        newChildren.push(aSep);
                    }
                    newChildren.push(this.children[i]);
                    this.children = newChildren;
                }
                return this;
            };
            SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
                var lastChild = this.children[this.children.length - 1];
                if (lastChild instanceof SourceNode) {
                    lastChild.replaceRight(aPattern, aReplacement);
                } else if (typeof lastChild === 'string') {
                    this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
                } else {
                    this.children.push(''.replace(aPattern, aReplacement));
                }
                return this;
            };
            SourceNode.prototype.setSourceContent = function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
                this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
            };
            SourceNode.prototype.walkSourceContents = function SourceNode_walkSourceContents(aFn) {
                this.children.forEach(function (chunk) {
                    if (chunk instanceof SourceNode) {
                        chunk.walkSourceContents(aFn);
                    }
                }, this);
                Object.keys(this.sourceContents).forEach(function (sourceFileKey) {
                    aFn(util.fromSetString(sourceFileKey), this.sourceContents[sourceFileKey]);
                }, this);
            };
            SourceNode.prototype.toString = function SourceNode_toString() {
                var str = '';
                this.walk(function (chunk) {
                    str += chunk;
                });
                return str;
            };
            SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
                var generated = {
                        code: '',
                        line: 1,
                        column: 0
                    };
                var map = new SourceMapGenerator(aArgs);
                var sourceMappingActive = false;
                this.walk(function (chunk, original) {
                    generated.code += chunk;
                    if (original.source !== null && original.line !== null && original.column !== null) {
                        map.addMapping({
                            source: original.source,
                            original: {
                                line: original.line,
                                column: original.column
                            },
                            generated: {
                                line: generated.line,
                                column: generated.column
                            },
                            name: original.name
                        });
                        sourceMappingActive = true;
                    } else if (sourceMappingActive) {
                        map.addMapping({
                            generated: {
                                line: generated.line,
                                column: generated.column
                            }
                        });
                        sourceMappingActive = false;
                    }
                    chunk.split('').forEach(function (ch) {
                        if (ch === '\n') {
                            generated.line++;
                            generated.column = 0;
                        } else {
                            generated.column++;
                        }
                    });
                });
                this.walkSourceContents(function (sourceFile, sourceContent) {
                    map.setSourceContent(sourceFile, sourceContent);
                });
                return {
                    code: generated.code,
                    map: map
                };
            };
            exports.SourceNode = SourceNode;
        });
    },
    'u': function (require, module, exports, global) {
        var http = null, https = false, tls = false, url = null, util = null, stream = null, qs = require('v'), querystring = null, crypto = null, oauth = require('w'), hawk = require('x'), aws = require('1d'), httpSignature = require('1e'), uuid = require('1t'), mime = require('1u'), tunnel = require('1v'), safeStringify = require('1w'), ForeverAgent = require('1x'), FormData = require('1y'), Cookie = require('22'), CookieJar = Cookie.Jar, cookieJar = new CookieJar();
        ;
        try {
            https = null;
        } catch (e) {
        }
        try {
            tls = null;
        } catch (e) {
        }
        var debug;
        if (/\brequest\b/.test(process.env.NODE_DEBUG)) {
            debug = function () {
                console.error('REQUEST %s', util.format.apply(util, arguments));
            };
        } else {
            debug = function () {
            };
        }
        function toBase64(str) {
            return new Buffer(str || '', 'ascii').toString('base64');
        }
        function md5(str) {
            return crypto.createHash('md5').update(str).digest('hex');
        }
        if (https && !https.Agent) {
            https.Agent = function (options) {
                http.Agent.call(this, options);
            };
            util.inherits(https.Agent, http.Agent);
            https.Agent.prototype._getConnection = function (host, port, cb) {
                var s = tls.connect(port, host, this.options, function () {
                        if (cb)
                            cb();
                    });
                return s;
            };
        }
        function isReadStream(rs) {
            if (rs.readable && rs.path && rs.mode) {
                return true;
            }
        }
        function copy(obj) {
            var o = {};
            Object.keys(obj).forEach(function (i) {
                o[i] = obj[i];
            });
            return o;
        }
        var isUrl = /^https?:/;
        var globalPool = {};
        function Request(options) {
            stream.Stream.call(this);
            this.readable = true;
            this.writable = true;
            if (typeof options === 'string') {
                options = { uri: options };
            }
            var reserved = Object.keys(Request.prototype);
            for (var i in options) {
                if (reserved.indexOf(i) === -1) {
                    this[i] = options[i];
                } else {
                    if (typeof options[i] === 'function') {
                        delete options[i];
                    }
                }
            }
            if (options.method) {
                this.explicitMethod = true;
            }
            this.init(options);
        }
        util.inherits(Request, stream.Stream);
        Request.prototype.init = function (options) {
            var self = this;
            if (!options)
                options = {};
            if (!self.method)
                self.method = options.method || 'GET';
            self.localAddress = options.localAddress;
            debug(options);
            if (!self.pool && self.pool !== false)
                self.pool = globalPool;
            self.dests = self.dests || [];
            self.__isRequestRequest = true;
            if (!self._callback && self.callback) {
                self._callback = self.callback;
                self.callback = function () {
                    if (self._callbackCalled)
                        return;
                    self._callbackCalled = true;
                    self._callback.apply(self, arguments);
                };
                self.on('error', self.callback.bind());
                self.on('complete', self.callback.bind(self, null));
            }
            if (self.url) {
                self.uri = self.url;
                delete self.url;
            }
            if (!self.uri) {
                return self.emit('error', new Error('options.uri is a required argument'));
            } else {
                if (typeof self.uri == 'string')
                    self.uri = url.parse(self.uri);
            }
            if (self.strictSSL === false) {
                self.rejectUnauthorized = false;
            }
            if (self.proxy) {
                if (typeof self.proxy == 'string')
                    self.proxy = url.parse(self.proxy);
                if (http.globalAgent && self.uri.protocol === 'https:') {
                    var tunnelFn = self.proxy.protocol === 'http:' ? tunnel.httpsOverHttp : tunnel.httpsOverHttps;
                    var tunnelOptions = {
                            proxy: {
                                host: self.proxy.hostname,
                                port: +self.proxy.port,
                                proxyAuth: self.proxy.auth,
                                headers: { Host: self.uri.hostname + ':' + (self.uri.port || self.uri.protocol === 'https:' ? 443 : 80) }
                            },
                            rejectUnauthorized: self.rejectUnauthorized,
                            ca: this.ca
                        };
                    self.agent = tunnelFn(tunnelOptions);
                    self.tunnel = true;
                }
            }
            if (!self.uri.host || !self.uri.pathname) {
                var faultyUri = url.format(self.uri);
                var message = 'Invalid URI "' + faultyUri + '"';
                if (Object.keys(options).length === 0) {
                    message += '. This can be caused by a crappy redirection.';
                }
                self.emit('error', new Error(message));
                return;
            }
            self._redirectsFollowed = self._redirectsFollowed || 0;
            self.maxRedirects = self.maxRedirects !== undefined ? self.maxRedirects : 10;
            self.followRedirect = self.followRedirect !== undefined ? self.followRedirect : true;
            self.followAllRedirects = self.followAllRedirects !== undefined ? self.followAllRedirects : false;
            if (self.followRedirect || self.followAllRedirects)
                self.redirects = self.redirects || [];
            self.headers = self.headers ? copy(self.headers) : {};
            self.setHost = false;
            if (!(self.headers.host || self.headers.Host)) {
                self.headers.host = self.uri.hostname;
                if (self.uri.port) {
                    if (!(self.uri.port === 80 && self.uri.protocol === 'http:') && !(self.uri.port === 443 && self.uri.protocol === 'https:'))
                        self.headers.host += ':' + self.uri.port;
                }
                self.setHost = true;
            }
            self.jar(self._jar || options.jar);
            if (!self.uri.pathname) {
                self.uri.pathname = '/';
            }
            if (!self.uri.port) {
                if (self.uri.protocol == 'http:') {
                    self.uri.port = 80;
                } else if (self.uri.protocol == 'https:') {
                    self.uri.port = 443;
                }
            }
            if (self.proxy && !self.tunnel) {
                self.port = self.proxy.port;
                self.host = self.proxy.hostname;
            } else {
                self.port = self.uri.port;
                self.host = self.uri.hostname;
            }
            self.clientErrorHandler = function (error) {
                if (self._aborted)
                    return;
                if (self.req && self.req._reusedSocket && error.code === 'ECONNRESET' && self.agent.addRequestNoreuse) {
                    self.agent = { addRequest: self.agent.addRequestNoreuse.bind(self.agent) };
                    self.start();
                    self.req.end();
                    return;
                }
                if (self.timeout && self.timeoutTimer) {
                    clearTimeout(self.timeoutTimer);
                    self.timeoutTimer = null;
                }
                self.emit('error', error);
            };
            self._parserErrorHandler = function (error) {
                if (this.res) {
                    if (this.res.request) {
                        this.res.request.emit('error', error);
                    } else {
                        this.res.emit('error', error);
                    }
                } else {
                    this._httpMessage.emit('error', error);
                }
            };
            if (options.form) {
                self.form(options.form);
            }
            if (options.qs)
                self.qs(options.qs);
            if (self.uri.path) {
                self.path = self.uri.path;
            } else {
                self.path = self.uri.pathname + (self.uri.search || '');
            }
            if (self.path.length === 0)
                self.path = '/';
            if (options.oauth) {
                self.oauth(options.oauth);
            }
            if (options.aws) {
                self.aws(options.aws);
            }
            if (options.hawk) {
                self.hawk(options.hawk);
            }
            if (options.httpSignature) {
                self.httpSignature(options.httpSignature);
            }
            if (options.auth) {
                self.auth(options.auth.user || options.auth.username, options.auth.pass || options.auth.password, options.auth.sendImmediately);
            }
            if (self.uri.auth && !self.headers.authorization) {
                var authPieces = self.uri.auth.split(':').map(function (item) {
                        return querystring.unescape(item);
                    });
                self.auth(authPieces[0], authPieces[1], true);
            }
            if (self.proxy && self.proxy.auth && !self.headers['proxy-authorization'] && !self.tunnel) {
                self.headers['proxy-authorization'] = 'Basic ' + toBase64(self.proxy.auth.split(':').map(function (item) {
                    return querystring.unescape(item);
                }).join(':'));
            }
            if (self.proxy && !self.tunnel)
                self.path = self.uri.protocol + '//' + self.uri.host + self.path;
            if (options.json) {
                self.json(options.json);
            } else if (options.multipart) {
                self.boundary = uuid();
                self.multipart(options.multipart);
            }
            if (self.body) {
                var length = 0;
                if (!Buffer.isBuffer(self.body)) {
                    if (Array.isArray(self.body)) {
                        for (var i = 0; i < self.body.length; i++) {
                            length += self.body[i].length;
                        }
                    } else {
                        self.body = new Buffer(self.body);
                        length = self.body.length;
                    }
                } else {
                    length = self.body.length;
                }
                if (length) {
                    if (!self.headers['content-length'] && !self.headers['Content-Length'])
                        self.headers['content-length'] = length;
                } else {
                    throw new Error('Argument error, options.body.');
                }
            }
            var protocol = self.proxy && !self.tunnel ? self.proxy.protocol : self.uri.protocol, defaultModules = {
                    'http:': http,
                    'https:': https
                }, httpModules = self.httpModules || {};
            ;
            self.httpModule = httpModules[protocol] || defaultModules[protocol];
            if (!self.httpModule)
                return this.emit('error', new Error('Invalid protocol'));
            if (options.ca)
                self.ca = options.ca;
            if (!self.agent) {
                if (options.agentOptions)
                    self.agentOptions = options.agentOptions;
                if (options.agentClass) {
                    self.agentClass = options.agentClass;
                } else if (options.forever) {
                    self.agentClass = protocol === 'http:' ? ForeverAgent : ForeverAgent.SSL;
                } else {
                    self.agentClass = self.httpModule.Agent;
                }
            }
            if (self.pool === false) {
                self.agent = false;
            } else {
                self.agent = self.agent || self.getAgent();
                if (self.maxSockets) {
                    self.agent.maxSockets = self.maxSockets;
                }
                if (self.pool.maxSockets) {
                    self.agent.maxSockets = self.pool.maxSockets;
                }
            }
            self.once('pipe', function (src) {
                if (self.ntick && self._started)
                    throw new Error('You cannot pipe to this stream after the outbound request has started.');
                self.src = src;
                if (isReadStream(src)) {
                    if (!self.headers['content-type'] && !self.headers['Content-Type'])
                        self.headers['content-type'] = mime.lookup(src.path);
                } else {
                    if (src.headers) {
                        for (var i in src.headers) {
                            if (!self.headers[i]) {
                                self.headers[i] = src.headers[i];
                            }
                        }
                    }
                    if (self._json && !self.headers['content-type'] && !self.headers['Content-Type'])
                        self.headers['content-type'] = 'application/json';
                    if (src.method && !self.explicitMethod) {
                        self.method = src.method;
                    }
                }
                self.on('pipe', function () {
                    console.error('You have already piped to this stream. Pipeing twice is likely to break the request.');
                });
            });
            process.nextTick(function () {
                if (self._aborted)
                    return;
                if (self._form) {
                    self.setHeaders(self._form.getHeaders());
                    self._form.pipe(self);
                }
                if (self.body) {
                    if (Array.isArray(self.body)) {
                        self.body.forEach(function (part) {
                            self.write(part);
                        });
                    } else {
                        self.write(self.body);
                    }
                    self.end();
                } else if (self.requestBodyStream) {
                    console.warn('options.requestBodyStream is deprecated, please pass the request object to stream.pipe.');
                    self.requestBodyStream.pipe(self);
                } else if (!self.src) {
                    if (self.method !== 'GET' && typeof self.method !== 'undefined') {
                        self.headers['content-length'] = 0;
                    }
                    self.end();
                }
                self.ntick = true;
            });
        };
        Request.prototype._updateProtocol = function () {
            var self = this;
            var protocol = self.uri.protocol;
            if (protocol === 'https:') {
                if (self.proxy) {
                    self.tunnel = true;
                    var tunnelFn = self.proxy.protocol === 'http:' ? tunnel.httpsOverHttp : tunnel.httpsOverHttps;
                    var tunnelOptions = {
                            proxy: {
                                host: self.proxy.hostname,
                                port: +self.proxy.port,
                                proxyAuth: self.proxy.auth
                            },
                            rejectUnauthorized: self.rejectUnauthorized,
                            ca: self.ca
                        };
                    self.agent = tunnelFn(tunnelOptions);
                    return;
                }
                self.httpModule = https;
                switch (self.agentClass) {
                case ForeverAgent:
                    self.agentClass = ForeverAgent.SSL;
                    break;
                case http.Agent:
                    self.agentClass = https.Agent;
                    break;
                default:
                    return;
                }
                if (self.agent)
                    self.agent = self.getAgent();
            } else {
                if (self.tunnel)
                    self.tunnel = false;
                self.httpModule = http;
                switch (self.agentClass) {
                case ForeverAgent.SSL:
                    self.agentClass = ForeverAgent;
                    break;
                case https.Agent:
                    self.agentClass = http.Agent;
                    break;
                default:
                    return;
                }
                if (self.agent) {
                    self.agent = null;
                    self.agent = self.getAgent();
                }
            }
        };
        Request.prototype.getAgent = function () {
            var Agent = this.agentClass;
            var options = {};
            if (this.agentOptions) {
                for (var i in this.agentOptions) {
                    options[i] = this.agentOptions[i];
                }
            }
            if (this.ca)
                options.ca = this.ca;
            if (typeof this.rejectUnauthorized !== 'undefined')
                options.rejectUnauthorized = this.rejectUnauthorized;
            if (this.cert && this.key) {
                options.key = this.key;
                options.cert = this.cert;
            }
            var poolKey = '';
            if (Agent !== this.httpModule.Agent) {
                poolKey += Agent.name;
            }
            if (!this.httpModule.globalAgent) {
                options.host = this.host;
                options.port = this.port;
                if (poolKey)
                    poolKey += ':';
                poolKey += this.host + ':' + this.port;
            }
            var proxy = this.proxy;
            if (typeof proxy === 'string')
                proxy = url.parse(proxy);
            var isHttps = proxy && proxy.protocol === 'https:' || this.uri.protocol === 'https:';
            if (isHttps) {
                if (options.ca) {
                    if (poolKey)
                        poolKey += ':';
                    poolKey += options.ca;
                }
                if (typeof options.rejectUnauthorized !== 'undefined') {
                    if (poolKey)
                        poolKey += ':';
                    poolKey += options.rejectUnauthorized;
                }
                if (options.cert)
                    poolKey += options.cert.toString('ascii') + options.key.toString('ascii');
            }
            if (!poolKey && Agent === this.httpModule.Agent && this.httpModule.globalAgent) {
                return this.httpModule.globalAgent;
            }
            poolKey = this.uri.protocol + poolKey;
            if (this.pool[poolKey])
                return this.pool[poolKey];
            return this.pool[poolKey] = new Agent(options);
        };
        Request.prototype.start = function () {
            var self = this;
            if (self._aborted)
                return;
            self._started = true;
            self.method = self.method || 'GET';
            self.href = self.uri.href;
            if (self.src && self.src.stat && self.src.stat.size && !self.headers['content-length'] && !self.headers['Content-Length']) {
                self.headers['content-length'] = self.src.stat.size;
            }
            if (self._aws) {
                self.aws(self._aws, true);
            }
            var reqOptions = copy(self);
            delete reqOptions.auth;
            debug('make request', self.uri.href);
            self.req = self.httpModule.request(reqOptions, self.onResponse.bind(self));
            if (self.timeout && !self.timeoutTimer) {
                self.timeoutTimer = setTimeout(function () {
                    self.req.abort();
                    var e = new Error('ETIMEDOUT');
                    e.code = 'ETIMEDOUT';
                    self.emit('error', e);
                }, self.timeout);
                if (self.req.setTimeout) {
                    self.req.setTimeout(self.timeout, function () {
                        if (self.req) {
                            self.req.abort();
                            var e = new Error('ESOCKETTIMEDOUT');
                            e.code = 'ESOCKETTIMEDOUT';
                            self.emit('error', e);
                        }
                    });
                }
            }
            self.req.on('error', self.clientErrorHandler);
            self.req.on('drain', function () {
                self.emit('drain');
            });
            self.on('end', function () {
                if (self.req.connection)
                    self.req.connection.removeListener('error', self._parserErrorHandler);
            });
            self.emit('request', self.req);
        };
        Request.prototype.onResponse = function (response) {
            var self = this;
            debug('onResponse', self.uri.href, response.statusCode, response.headers);
            response.on('end', function () {
                debug('response end', self.uri.href, response.statusCode, response.headers);
            });
            if (response.connection.listeners('error').indexOf(self._parserErrorHandler) === -1) {
                response.connection.once('error', self._parserErrorHandler);
            }
            if (self._aborted) {
                debug('aborted', self.uri.href);
                response.resume();
                return;
            }
            if (self._paused)
                response.pause();
            else
                response.resume();
            self.response = response;
            response.request = self;
            response.toJSON = toJSON;
            if (self.httpModule === https && self.strictSSL && !response.client.authorized) {
                debug('strict ssl error', self.uri.href);
                var sslErr = response.client.authorizationError;
                self.emit('error', new Error('SSL Error: ' + sslErr));
                return;
            }
            if (self.setHost)
                delete self.headers.host;
            if (self.timeout && self.timeoutTimer) {
                clearTimeout(self.timeoutTimer);
                self.timeoutTimer = null;
            }
            var addCookie = function (cookie) {
                if (self._jar)
                    self._jar.add(new Cookie(cookie));
                else
                    cookieJar.add(new Cookie(cookie));
            };
            if (response.headers['set-cookie'] && !self._disableCookies) {
                if (Array.isArray(response.headers['set-cookie']))
                    response.headers['set-cookie'].forEach(addCookie);
                else
                    addCookie(response.headers['set-cookie']);
            }
            var redirectTo = null;
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                debug('redirect', response.headers.location);
                if (self.followAllRedirects) {
                    redirectTo = response.headers.location;
                } else if (self.followRedirect) {
                    switch (self.method) {
                    case 'PATCH':
                    case 'PUT':
                    case 'POST':
                    case 'DELETE':
                        break;
                    default:
                        redirectTo = response.headers.location;
                        break;
                    }
                }
            } else if (response.statusCode == 401 && self._hasAuth && !self._sentAuth) {
                var authHeader = response.headers['www-authenticate'];
                var authVerb = authHeader && authHeader.split(' ')[0];
                debug('reauth', authVerb);
                switch (authVerb) {
                case 'Basic':
                    self.auth(self._user, self._pass, true);
                    redirectTo = self.uri;
                    break;
                case 'Digest':
                    var matches = authHeader.match(/([a-z0-9_-]+)="([^"]+)"/gi);
                    var challenge = {};
                    for (var i = 0; i < matches.length; i++) {
                        var eqPos = matches[i].indexOf('=');
                        var key = matches[i].substring(0, eqPos);
                        var quotedValue = matches[i].substring(eqPos + 1);
                        challenge[key] = quotedValue.substring(1, quotedValue.length - 1);
                    }
                    var ha1 = md5(self._user + ':' + challenge.realm + ':' + self._pass);
                    var ha2 = md5(self.method + ':' + self.uri.path);
                    var digestResponse = md5(ha1 + ':' + challenge.nonce + ':1::auth:' + ha2);
                    var authValues = {
                            username: self._user,
                            realm: challenge.realm,
                            nonce: challenge.nonce,
                            uri: self.uri.path,
                            qop: challenge.qop,
                            response: digestResponse,
                            nc: 1,
                            cnonce: ''
                        };
                    authHeader = [];
                    for (var k in authValues) {
                        authHeader.push(k + '="' + authValues[k] + '"');
                    }
                    authHeader = 'Digest ' + authHeader.join(', ');
                    self.setHeader('authorization', authHeader);
                    self._sentAuth = true;
                    redirectTo = self.uri;
                    break;
                }
            }
            if (redirectTo) {
                debug('redirect to', redirectTo);
                if (self._paused)
                    response.resume();
                if (self._redirectsFollowed >= self.maxRedirects) {
                    self.emit('error', new Error('Exceeded maxRedirects. Probably stuck in a redirect loop ' + self.uri.href));
                    return;
                }
                self._redirectsFollowed += 1;
                if (!isUrl.test(redirectTo)) {
                    redirectTo = url.resolve(self.uri.href, redirectTo);
                }
                var uriPrev = self.uri;
                self.uri = url.parse(redirectTo);
                if (self.uri.protocol !== uriPrev.protocol) {
                    self._updateProtocol();
                }
                self.redirects.push({
                    statusCode: response.statusCode,
                    redirectUri: redirectTo
                });
                if (self.followAllRedirects && response.statusCode != 401)
                    self.method = 'GET';
                delete self.src;
                delete self.req;
                delete self.agent;
                delete self._started;
                if (response.statusCode != 401) {
                    delete self.body;
                    delete self._form;
                    if (self.headers) {
                        delete self.headers.host;
                        delete self.headers['content-type'];
                        delete self.headers['content-length'];
                    }
                }
                self.init();
                return;
            } else {
                self._redirectsFollowed = self._redirectsFollowed || 0;
                response.on('close', function () {
                    if (!self._ended)
                        self.response.emit('end');
                });
                if (self.encoding) {
                    if (self.dests.length !== 0) {
                        console.error('Ingoring encoding parameter as this stream is being piped to another stream which makes the encoding option invalid.');
                    } else {
                        response.setEncoding(self.encoding);
                    }
                }
                self.emit('response', response);
                self.dests.forEach(function (dest) {
                    self.pipeDest(dest);
                });
                response.on('data', function (chunk) {
                    self._destdata = true;
                    self.emit('data', chunk);
                });
                response.on('end', function (chunk) {
                    self._ended = true;
                    self.emit('end', chunk);
                });
                response.on('close', function () {
                    self.emit('close');
                });
                if (self.callback) {
                    var buffer = [];
                    var bodyLen = 0;
                    self.on('data', function (chunk) {
                        buffer.push(chunk);
                        bodyLen += chunk.length;
                    });
                    self.on('end', function () {
                        debug('end event', self.uri.href);
                        if (self._aborted) {
                            debug('aborted', self.uri.href);
                            return;
                        }
                        if (buffer.length && Buffer.isBuffer(buffer[0])) {
                            debug('has body', self.uri.href, bodyLen);
                            var body = new Buffer(bodyLen);
                            var i = 0;
                            buffer.forEach(function (chunk) {
                                chunk.copy(body, i, 0, chunk.length);
                                i += chunk.length;
                            });
                            if (self.encoding === null) {
                                response.body = body;
                            } else {
                                response.body = body.toString(self.encoding);
                            }
                        } else if (buffer.length) {
                            if (self.encoding === 'utf8' && buffer[0].length > 0 && buffer[0][0] === '\ufeff') {
                                buffer[0] = buffer[0].substring(1);
                            }
                            response.body = buffer.join('');
                        }
                        if (self._json) {
                            try {
                                response.body = JSON.parse(response.body);
                            } catch (e) {
                            }
                        }
                        debug('emitting complete', self.uri.href);
                        if (response.body == undefined && !self._json) {
                            response.body = '';
                        }
                        self.emit('complete', response, response.body);
                    });
                }
            }
            debug('finish init function', self.uri.href);
        };
        Request.prototype.abort = function () {
            this._aborted = true;
            if (this.req) {
                this.req.abort();
            } else if (this.response) {
                this.response.abort();
            }
            this.emit('abort');
        };
        Request.prototype.pipeDest = function (dest) {
            var response = this.response;
            if (dest.headers) {
                dest.headers['content-type'] = response.headers['content-type'];
                if (response.headers['content-length']) {
                    dest.headers['content-length'] = response.headers['content-length'];
                }
            }
            if (dest.setHeader) {
                for (var i in response.headers) {
                    dest.setHeader(i, response.headers[i]);
                }
                dest.statusCode = response.statusCode;
            }
            if (this.pipefilter)
                this.pipefilter(response, dest);
        };
        Request.prototype.setHeader = function (name, value, clobber) {
            if (clobber === undefined)
                clobber = true;
            if (clobber || !this.headers.hasOwnProperty(name))
                this.headers[name] = value;
            else
                this.headers[name] += ',' + value;
            return this;
        };
        Request.prototype.setHeaders = function (headers) {
            for (var i in headers) {
                this.setHeader(i, headers[i]);
            }
            return this;
        };
        Request.prototype.qs = function (q, clobber) {
            var base;
            if (!clobber && this.uri.query)
                base = qs.parse(this.uri.query);
            else
                base = {};
            for (var i in q) {
                base[i] = q[i];
            }
            if (qs.stringify(base) === '') {
                return this;
            }
            this.uri = url.parse(this.uri.href.split('?')[0] + '?' + qs.stringify(base));
            this.url = this.uri;
            this.path = this.uri.path;
            return this;
        };
        Request.prototype.form = function (form) {
            if (form) {
                this.headers['content-type'] = 'application/x-www-form-urlencoded; charset=utf-8';
                this.body = qs.stringify(form).toString('utf8');
                return this;
            }
            this._form = new FormData();
            return this._form;
        };
        Request.prototype.multipart = function (multipart) {
            var self = this;
            self.body = [];
            if (!self.headers['content-type']) {
                self.headers['content-type'] = 'multipart/related; boundary=' + self.boundary;
            } else {
                self.headers['content-type'] = self.headers['content-type'].split(';')[0] + '; boundary=' + self.boundary;
            }
            if (!multipart.forEach)
                throw new Error('Argument error, options.multipart.');
            if (self.preambleCRLF) {
                self.body.push(new Buffer('\r\n'));
            }
            multipart.forEach(function (part) {
                var body = part.body;
                if (body == null)
                    throw Error('Body attribute missing in multipart.');
                delete part.body;
                var preamble = '--' + self.boundary + '\r\n';
                Object.keys(part).forEach(function (key) {
                    preamble += key + ': ' + part[key] + '\r\n';
                });
                preamble += '\r\n';
                self.body.push(new Buffer(preamble));
                self.body.push(new Buffer(body));
                self.body.push(new Buffer('\r\n'));
            });
            self.body.push(new Buffer('--' + self.boundary + '--'));
            return self;
        };
        Request.prototype.json = function (val) {
            var self = this;
            var setAcceptHeader = function () {
                if (!self.headers['accept'] && !self.headers['Accept']) {
                    self.setHeader('accept', 'application/json');
                }
            };
            setAcceptHeader();
            this._json = true;
            if (typeof val === 'boolean') {
                if (typeof this.body === 'object') {
                    setAcceptHeader();
                    this.body = safeStringify(this.body);
                    self.setHeader('content-type', 'application/json');
                }
            } else {
                setAcceptHeader();
                this.body = safeStringify(val);
                self.setHeader('content-type', 'application/json');
            }
            return this;
        };
        function getHeader(name, headers) {
            var result, re, match;
            Object.keys(headers).forEach(function (key) {
                re = new RegExp(name, 'i');
                match = key.match(re);
                if (match)
                    result = headers[key];
            });
            return result;
        }
        Request.prototype.auth = function (user, pass, sendImmediately) {
            if (typeof user !== 'string' || pass !== undefined && typeof pass !== 'string') {
                throw new Error('auth() received invalid user or password');
            }
            this._user = user;
            this._pass = pass;
            this._hasAuth = true;
            if (sendImmediately || typeof sendImmediately == 'undefined') {
                this.setHeader('authorization', 'Basic ' + toBase64(user + ':' + pass));
                this._sentAuth = true;
            }
            return this;
        };
        Request.prototype.aws = function (opts, now) {
            if (!now) {
                this._aws = opts;
                return this;
            }
            var date = new Date();
            this.setHeader('date', date.toUTCString());
            var auth = {
                    key: opts.key,
                    secret: opts.secret,
                    verb: this.method.toUpperCase(),
                    date: date,
                    contentType: getHeader('content-type', this.headers) || '',
                    md5: getHeader('content-md5', this.headers) || '',
                    amazonHeaders: aws.canonicalizeHeaders(this.headers)
                };
            if (opts.bucket && this.path) {
                auth.resource = '/' + opts.bucket + this.path;
            } else if (opts.bucket && !this.path) {
                auth.resource = '/' + opts.bucket;
            } else if (!opts.bucket && this.path) {
                auth.resource = this.path;
            } else if (!opts.bucket && !this.path) {
                auth.resource = '/';
            }
            auth.resource = aws.canonicalizeResource(auth.resource);
            this.setHeader('authorization', aws.authorization(auth));
            return this;
        };
        Request.prototype.httpSignature = function (opts) {
            var req = this;
            httpSignature.signRequest({
                getHeader: function (header) {
                    return getHeader(header, req.headers);
                },
                setHeader: function (header, value) {
                    req.setHeader(header, value);
                },
                method: this.method,
                path: this.path
            }, opts);
            debug('httpSignature authorization', getHeader('authorization', this.headers));
            return this;
        };
        Request.prototype.hawk = function (opts) {
            this.headers.Authorization = hawk.client.header(this.uri, this.method, opts).field;
        };
        Request.prototype.oauth = function (_oauth) {
            var form;
            if (this.headers['content-type'] && this.headers['content-type'].slice(0, 'application/x-www-form-urlencoded'.length) === 'application/x-www-form-urlencoded') {
                form = qs.parse(this.body);
            }
            if (this.uri.query) {
                form = qs.parse(this.uri.query);
            }
            if (!form)
                form = {};
            var oa = {};
            for (var i in form)
                oa[i] = form[i];
            for (var i in _oauth)
                oa['oauth_' + i] = _oauth[i];
            if (!oa.oauth_version)
                oa.oauth_version = '1.0';
            if (!oa.oauth_timestamp)
                oa.oauth_timestamp = Math.floor(Date.now() / 1000).toString();
            if (!oa.oauth_nonce)
                oa.oauth_nonce = uuid().replace(/-/g, '');
            oa.oauth_signature_method = 'HMAC-SHA1';
            var consumer_secret = oa.oauth_consumer_secret;
            delete oa.oauth_consumer_secret;
            var token_secret = oa.oauth_token_secret;
            delete oa.oauth_token_secret;
            var timestamp = oa.oauth_timestamp;
            var baseurl = this.uri.protocol + '//' + this.uri.host + this.uri.pathname;
            var signature = oauth.hmacsign(this.method, baseurl, oa, consumer_secret, token_secret);
            for (var i in form) {
                if (i.slice(0, 'oauth_') in _oauth) {
                } else {
                    delete oa['oauth_' + i];
                    if (i !== 'x_auth_mode')
                        delete oa[i];
                }
            }
            oa.oauth_timestamp = timestamp;
            this.headers.Authorization = 'OAuth ' + Object.keys(oa).sort().map(function (i) {
                return i + '="' + oauth.rfc3986(oa[i]) + '"';
            }).join(',');
            this.headers.Authorization += ',oauth_signature="' + oauth.rfc3986(signature) + '"';
            return this;
        };
        Request.prototype.jar = function (jar) {
            var cookies;
            if (this._redirectsFollowed === 0) {
                this.originalCookieHeader = this.headers.cookie;
            }
            if (jar === false) {
                cookies = false;
                this._disableCookies = true;
            } else if (jar) {
                cookies = jar.get({ url: this.uri.href });
            } else {
                cookies = cookieJar.get({ url: this.uri.href });
            }
            if (cookies && cookies.length) {
                var cookieString = cookies.map(function (c) {
                        return c.name + '=' + c.value;
                    }).join('; ');
                if (this.originalCookieHeader) {
                    this.headers.cookie = this.originalCookieHeader + '; ' + cookieString;
                } else {
                    this.headers.cookie = cookieString;
                }
            }
            this._jar = jar;
            return this;
        };
        Request.prototype.pipe = function (dest, opts) {
            if (this.response) {
                if (this._destdata) {
                    throw new Error('You cannot pipe after data has been emitted from the response.');
                } else if (this._ended) {
                    throw new Error('You cannot pipe after the response has been ended.');
                } else {
                    stream.Stream.prototype.pipe.call(this, dest, opts);
                    this.pipeDest(dest);
                    return dest;
                }
            } else {
                this.dests.push(dest);
                stream.Stream.prototype.pipe.call(this, dest, opts);
                return dest;
            }
        };
        Request.prototype.write = function () {
            if (!this._started)
                this.start();
            return this.req.write.apply(this.req, arguments);
        };
        Request.prototype.end = function (chunk) {
            if (chunk)
                this.write(chunk);
            if (!this._started)
                this.start();
            this.req.end();
        };
        Request.prototype.pause = function () {
            if (!this.response)
                this._paused = true;
            else
                this.response.pause.apply(this.response, arguments);
        };
        Request.prototype.resume = function () {
            if (!this.response)
                this._paused = false;
            else
                this.response.resume.apply(this.response, arguments);
        };
        Request.prototype.destroy = function () {
            if (!this._ended)
                this.end();
            else if (this.response)
                this.response.destroy();
        };
        function initParams(uri, options, callback) {
            if (typeof options === 'function' && !callback)
                callback = options;
            if (options && typeof options === 'object') {
                options.uri = uri;
            } else if (typeof uri === 'string') {
                options = { uri: uri };
            } else {
                options = uri;
                uri = options.uri;
            }
            return {
                uri: uri,
                options: options,
                callback: callback
            };
        }
        function request(uri, options, callback) {
            if (typeof uri === 'undefined')
                throw new Error('undefined is not a valid uri or options object.');
            if (typeof options === 'function' && !callback)
                callback = options;
            if (options && typeof options === 'object') {
                options.uri = uri;
            } else if (typeof uri === 'string') {
                options = { uri: uri };
            } else {
                options = uri;
            }
            options = copy(options);
            if (callback)
                options.callback = callback;
            var r = new Request(options);
            return r;
        }
        module.exports = request;
        request.debug = process.env.NODE_DEBUG && /request/.test(process.env.NODE_DEBUG);
        request.initParams = initParams;
        request.defaults = function (options, requester) {
            var def = function (method) {
                var d = function (uri, opts, callback) {
                    var params = initParams(uri, opts, callback);
                    for (var i in options) {
                        if (params.options[i] === undefined)
                            params.options[i] = options[i];
                    }
                    if (typeof requester === 'function') {
                        if (method === request) {
                            method = requester;
                        } else {
                            params.options._requester = requester;
                        }
                    }
                    return method(params.options, params.callback);
                };
                return d;
            };
            var de = def(request);
            de.get = def(request.get);
            de.patch = def(request.patch);
            de.post = def(request.post);
            de.put = def(request.put);
            de.head = def(request.head);
            de.del = def(request.del);
            de.cookie = def(request.cookie);
            de.jar = request.jar;
            return de;
        };
        request.forever = function (agentOptions, optionsArg) {
            var options = {};
            if (optionsArg) {
                for (option in optionsArg) {
                    options[option] = optionsArg[option];
                }
            }
            if (agentOptions)
                options.agentOptions = agentOptions;
            options.forever = true;
            return request.defaults(options);
        };
        request.get = request;
        request.post = function (uri, options, callback) {
            var params = initParams(uri, options, callback);
            params.options.method = 'POST';
            return request(params.uri || null, params.options, params.callback);
        };
        request.put = function (uri, options, callback) {
            var params = initParams(uri, options, callback);
            params.options.method = 'PUT';
            return request(params.uri || null, params.options, params.callback);
        };
        request.patch = function (uri, options, callback) {
            var params = initParams(uri, options, callback);
            params.options.method = 'PATCH';
            return request(params.uri || null, params.options, params.callback);
        };
        request.head = function (uri, options, callback) {
            var params = initParams(uri, options, callback);
            params.options.method = 'HEAD';
            if (params.options.body || params.options.requestBodyStream || params.options.json && typeof params.options.json !== 'boolean' || params.options.multipart) {
                throw new Error('HTTP HEAD requests MUST NOT include a request body.');
            }
            return request(params.uri || null, params.options, params.callback);
        };
        request.del = function (uri, options, callback) {
            var params = initParams(uri, options, callback);
            params.options.method = 'DELETE';
            if (typeof params.options._requester === 'function') {
                request = params.options._requester;
            }
            return request(params.uri || null, params.options, params.callback);
        };
        request.jar = function () {
            return new CookieJar();
        };
        request.cookie = function (str) {
            if (str && str.uri)
                str = str.uri;
            if (typeof str !== 'string')
                throw new Error('The cookie function only accepts STRING as param');
            return new Cookie(str);
        };
        function getSafe(self, uuid) {
            if (typeof self === 'object' || typeof self === 'function')
                var safe = {};
            if (Array.isArray(self))
                var safe = [];
            var recurse = [];
            Object.defineProperty(self, uuid, {});
            var attrs = Object.keys(self).filter(function (i) {
                    if (i === uuid)
                        return false;
                    if (typeof self[i] !== 'object' && typeof self[i] !== 'function' || self[i] === null)
                        return true;
                    return !Object.getOwnPropertyDescriptor(self[i], uuid);
                });
            for (var i = 0; i < attrs.length; i++) {
                if (typeof self[attrs[i]] !== 'object' && typeof self[attrs[i]] !== 'function' || self[attrs[i]] === null) {
                    safe[attrs[i]] = self[attrs[i]];
                } else {
                    recurse.push(attrs[i]);
                    Object.defineProperty(self[attrs[i]], uuid, {});
                }
            }
            for (var i = 0; i < recurse.length; i++) {
                safe[recurse[i]] = getSafe(self[recurse[i]], uuid);
            }
            return safe;
        }
        function toJSON() {
            return getSafe(this, '__' + ((1 + Math.random()) * 65536 | 0).toString(16));
        }
        Request.prototype.toJSON = toJSON;
    },
    'v': function (require, module, exports, global) {
        var toString = Object.prototype.toString;
        var isint = /^[0-9]+$/;
        function promote(parent, key) {
            if (parent[key].length == 0)
                return parent[key] = {};
            var t = {};
            for (var i in parent[key])
                t[i] = parent[key][i];
            parent[key] = t;
            return t;
        }
        function parse(parts, parent, key, val) {
            var part = parts.shift();
            if (!part) {
                if (Array.isArray(parent[key])) {
                    parent[key].push(val);
                } else if ('object' == typeof parent[key]) {
                    parent[key] = val;
                } else if ('undefined' == typeof parent[key]) {
                    parent[key] = val;
                } else {
                    parent[key] = [
                        parent[key],
                        val
                    ];
                }
            } else {
                var obj = parent[key] = parent[key] || [];
                if (']' == part) {
                    if (Array.isArray(obj)) {
                        if ('' != val)
                            obj.push(val);
                    } else if ('object' == typeof obj) {
                        obj[Object.keys(obj).length] = val;
                    } else {
                        obj = parent[key] = [
                            parent[key],
                            val
                        ];
                    }
                } else if (~part.indexOf(']')) {
                    part = part.substr(0, part.length - 1);
                    if (!isint.test(part) && Array.isArray(obj))
                        obj = promote(parent, key);
                    parse(parts, obj, part, val);
                } else {
                    if (!isint.test(part) && Array.isArray(obj))
                        obj = promote(parent, key);
                    parse(parts, obj, part, val);
                }
            }
        }
        function merge(parent, key, val) {
            if (~key.indexOf(']')) {
                var parts = key.split('['), len = parts.length, last = len - 1;
                parse(parts, parent, 'base', val);
            } else {
                if (!isint.test(key) && Array.isArray(parent.base)) {
                    var t = {};
                    for (var k in parent.base)
                        t[k] = parent.base[k];
                    parent.base = t;
                }
                set(parent.base, key, val);
            }
            return parent;
        }
        function parseObject(obj) {
            var ret = { base: {} };
            Object.keys(obj).forEach(function (name) {
                merge(ret, name, obj[name]);
            });
            return ret.base;
        }
        function parseString(str) {
            return String(str).split('&').reduce(function (ret, pair) {
                var eql = pair.indexOf('='), brace = lastBraceInKey(pair), key = pair.substr(0, brace || eql), val = pair.substr(brace || eql, pair.length), val = val.substr(val.indexOf('=') + 1, val.length);
                if ('' == key)
                    key = pair, val = '';
                if ('' == key)
                    return ret;
                return merge(ret, decode(key), decode(val));
            }, { base: {} }).base;
        }
        exports.parse = function (str) {
            if (null == str || '' == str)
                return {};
            return 'object' == typeof str ? parseObject(str) : parseString(str);
        };
        var stringify = exports.stringify = function (obj, prefix) {
                if (Array.isArray(obj)) {
                    return stringifyArray(obj, prefix);
                } else if ('[object Object]' == toString.call(obj)) {
                    return stringifyObject(obj, prefix);
                } else if ('string' == typeof obj) {
                    return stringifyString(obj, prefix);
                } else {
                    return prefix + '=' + encodeURIComponent(String(obj));
                }
            };
        function stringifyString(str, prefix) {
            if (!prefix)
                throw new TypeError('stringify expects an object');
            return prefix + '=' + encodeURIComponent(str);
        }
        function stringifyArray(arr, prefix) {
            var ret = [];
            if (!prefix)
                throw new TypeError('stringify expects an object');
            for (var i = 0; i < arr.length; i++) {
                ret.push(stringify(arr[i], prefix + '[' + i + ']'));
            }
            return ret.join('&');
        }
        function stringifyObject(obj, prefix) {
            var ret = [], keys = Object.keys(obj), key;
            for (var i = 0, len = keys.length; i < len; ++i) {
                key = keys[i];
                if ('' == key)
                    continue;
                if (null == obj[key]) {
                    ret.push(encodeURIComponent(key) + '=');
                } else {
                    ret.push(stringify(obj[key], prefix ? prefix + '[' + encodeURIComponent(key) + ']' : encodeURIComponent(key)));
                }
            }
            return ret.join('&');
        }
        function set(obj, key, val) {
            var v = obj[key];
            if (undefined === v) {
                obj[key] = val;
            } else if (Array.isArray(v)) {
                v.push(val);
            } else {
                obj[key] = [
                    v,
                    val
                ];
            }
        }
        function lastBraceInKey(str) {
            var len = str.length, brace, c;
            for (var i = 0; i < len; ++i) {
                c = str[i];
                if (']' == c)
                    brace = false;
                if ('[' == c)
                    brace = true;
                if ('=' == c && !brace)
                    return i;
            }
        }
        function decode(str) {
            try {
                return decodeURIComponent(str.replace(/\+/g, ' '));
            } catch (err) {
                return str;
            }
        }
    },
    'w': function (require, module, exports, global) {
        var crypto = null, qs = null;
        ;
        function sha1(key, body) {
            return crypto.createHmac('sha1', key).update(body).digest('base64');
        }
        function rfc3986(str) {
            return encodeURIComponent(str).replace(/!/g, '%21').replace(/\*/g, '%2A').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/'/g, '%27');
            ;
        }
        function hmacsign(httpMethod, base_uri, params, consumer_secret, token_secret) {
            var querystring = Object.keys(params).sort().map(function (key) {
                    return escape(rfc3986(key)) + '%3D' + escape(rfc3986(params[key]));
                }).join('%26');
            var base = [
                    httpMethod ? httpMethod.toUpperCase() : 'GET',
                    rfc3986(base_uri),
                    querystring
                ].join('&');
            var key = [
                    consumer_secret,
                    token_secret || ''
                ].map(rfc3986).join('&');
            return sha1(key, base);
        }
        exports.hmacsign = hmacsign;
        exports.rfc3986 = rfc3986;
    },
    'x': function (require, module, exports, global) {
        module.exports = require('y');
    },
    'y': function (require, module, exports, global) {
        exports.error = exports.Error = require('z');
        exports.sntp = require('14');
        exports.server = require('16');
        exports.client = require('1b');
        exports.uri = require('1c');
        exports.crypto = require('19');
        exports.utils = require('1a');
    },
    'z': function (require, module, exports, global) {
        module.exports = require('10');
    },
    '10': function (require, module, exports, global) {
        var Http = null;
        var NodeUtil = null;
        var Hoek = require('11');
        var internals = {};
        exports = module.exports = internals.Boom = function () {
            var self = this;
            Hoek.assert(this.constructor === internals.Boom, 'Error must be instantiated using new');
            Error.call(this);
            this.isBoom = true;
            this.response = {
                code: 0,
                payload: {},
                headers: {}
            };
            if (arguments[0] instanceof Error) {
                var error = arguments[0];
                this.data = error;
                this.response.code = error.code || 500;
                if (error.message) {
                    this.message = error.message;
                }
            } else {
                var code = arguments[0];
                var message = arguments[1];
                Hoek.assert(!isNaN(parseFloat(code)) && isFinite(code) && code >= 400, 'First argument must be a number (400+)');
                this.response.code = code;
                if (message) {
                    this.message = message;
                }
            }
            this.reformat();
            return this;
        };
        NodeUtil.inherits(internals.Boom, Error);
        internals.Boom.prototype.reformat = function () {
            this.response.payload.code = this.response.code;
            this.response.payload.error = Http.STATUS_CODES[this.response.code] || 'Unknown';
            if (this.message) {
                this.response.payload.message = Hoek.escapeHtml(this.message);
            }
        };
        internals.Boom.badRequest = function (message) {
            return new internals.Boom(400, message);
        };
        internals.Boom.unauthorized = function (error, scheme, attributes) {
            var err = new internals.Boom(401, error);
            if (!scheme) {
                return err;
            }
            var wwwAuthenticate = '';
            if (typeof scheme === 'string') {
                wwwAuthenticate = scheme;
                if (attributes) {
                    var names = Object.keys(attributes);
                    for (var i = 0, il = names.length; i < il; ++i) {
                        if (i) {
                            wwwAuthenticate += ',';
                        }
                        var value = attributes[names[i]];
                        if (value === null || value === undefined) {
                            value = '';
                        }
                        wwwAuthenticate += ' ' + names[i] + '="' + Hoek.escapeHeaderAttribute(value.toString()) + '"';
                    }
                }
                if (error) {
                    if (attributes) {
                        wwwAuthenticate += ',';
                    }
                    wwwAuthenticate += ' error="' + Hoek.escapeHeaderAttribute(error) + '"';
                } else {
                    err.isMissing = true;
                }
            } else {
                var wwwArray = scheme;
                for (var i = 0, il = wwwArray.length; i < il; ++i) {
                    if (i) {
                        wwwAuthenticate += ', ';
                    }
                    wwwAuthenticate += wwwArray[i];
                }
            }
            err.response.headers['WWW-Authenticate'] = wwwAuthenticate;
            return err;
        };
        internals.Boom.clientTimeout = function (message) {
            return new internals.Boom(408, message);
        };
        internals.Boom.serverTimeout = function (message) {
            return new internals.Boom(503, message);
        };
        internals.Boom.forbidden = function (message) {
            return new internals.Boom(403, message);
        };
        internals.Boom.notFound = function (message) {
            return new internals.Boom(404, message);
        };
        internals.Boom.internal = function (message, data) {
            var err = new internals.Boom(500, message);
            if (data && data.stack) {
                err.trace = data.stack.split('\n');
                err.outterTrace = Hoek.displayStack(1);
            } else {
                err.trace = Hoek.displayStack(1);
            }
            err.data = data;
            err.response.payload.message = 'An internal server error occurred';
            return err;
        };
        internals.Boom.passThrough = function (code, payload, contentType, headers) {
            var err = new internals.Boom(500, 'Pass-through');
            err.data = {
                code: code,
                payload: payload,
                type: contentType
            };
            err.response.code = code;
            err.response.type = contentType;
            err.response.headers = headers;
            err.response.payload = payload;
            return err;
        };
    },
    '11': function (require, module, exports, global) {
        module.exports = require('12');
    },
    '12': function (require, module, exports, global) {
        var Fs = null;
        var Escape = require('13');
        var internals = {};
        exports.clone = function (obj, seen) {
            if (typeof obj !== 'object' || obj === null) {
                return obj;
            }
            seen = seen || {
                orig: [],
                copy: []
            };
            var lookup = seen.orig.indexOf(obj);
            if (lookup !== -1) {
                return seen.copy[lookup];
            }
            var newObj = obj instanceof Array ? [] : {};
            seen.orig.push(obj);
            seen.copy.push(newObj);
            for (var i in obj) {
                if (obj.hasOwnProperty(i)) {
                    if (obj[i] instanceof Date) {
                        newObj[i] = new Date(obj[i].getTime());
                    } else if (obj[i] instanceof RegExp) {
                        var flags = '' + (obj[i].global ? 'g' : '') + (obj[i].ignoreCase ? 'i' : '') + (obj[i].multiline ? 'm' : '');
                        newObj[i] = new RegExp(obj[i].source, flags);
                    } else {
                        newObj[i] = exports.clone(obj[i], seen);
                    }
                }
            }
            return newObj;
        };
        exports.merge = function (target, source, isNullOverride, isMergeArrays) {
            exports.assert(target && typeof target == 'object', 'Invalid target value: must be an object');
            exports.assert(source === null || source === undefined || typeof source === 'object', 'Invalid source value: must be null, undefined, or an object');
            if (!source) {
                return target;
            }
            if (source instanceof Array) {
                exports.assert(target instanceof Array, 'Cannot merge array onto an object');
                if (isMergeArrays === false) {
                    target.length = 0;
                }
                source.forEach(function (item) {
                    target.push(item);
                });
                return target;
            }
            Object.keys(source).forEach(function (key) {
                var value = source[key];
                if (value && typeof value === 'object') {
                    if (!target[key] || typeof target[key] !== 'object') {
                        target[key] = exports.clone(value);
                    } else {
                        exports.merge(target[key], source[key], isNullOverride, isMergeArrays);
                    }
                } else {
                    if (value !== null && value !== undefined) {
                        target[key] = value;
                    } else if (isNullOverride !== false) {
                        target[key] = value;
                    }
                }
            });
            return target;
        };
        exports.applyToDefaults = function (defaults, options) {
            exports.assert(defaults && typeof defaults == 'object', 'Invalid defaults value: must be an object');
            exports.assert(!options || options === true || typeof options === 'object', 'Invalid options value: must be true, falsy or an object');
            if (!options) {
                return null;
            }
            var copy = exports.clone(defaults);
            if (options === true) {
                return copy;
            }
            return exports.merge(copy, options, false, false);
        };
        exports.unique = function (array, key) {
            var index = {};
            var result = [];
            for (var i = 0, il = array.length; i < il; ++i) {
                var id = key ? array[i][key] : array[i];
                if (index[id] !== true) {
                    result.push(array[i]);
                    index[id] = true;
                }
            }
            return result;
        };
        exports.mapToObject = function (array, key) {
            if (!array) {
                return null;
            }
            var obj = {};
            for (var i = 0, il = array.length; i < il; ++i) {
                if (key) {
                    if (array[i][key]) {
                        obj[array[i][key]] = true;
                    }
                } else {
                    obj[array[i]] = true;
                }
            }
            return obj;
        };
        exports.intersect = function (array1, array2) {
            if (!array1 || !array2) {
                return [];
            }
            var common = [];
            var hash = array1 instanceof Array ? exports.mapToObject(array1) : array1;
            var found = {};
            for (var i = 0, il = array2.length; i < il; ++i) {
                if (hash[array2[i]] && !found[array2[i]]) {
                    common.push(array2[i]);
                    found[array2[i]] = true;
                }
            }
            return common;
        };
        exports.matchKeys = function (obj, keys) {
            var matched = [];
            for (var i = 0, il = keys.length; i < il; ++i) {
                if (obj.hasOwnProperty(keys[i])) {
                    matched.push(keys[i]);
                }
            }
            return matched;
        };
        exports.flatten = function (array, target) {
            var result = target || [];
            for (var i = 0, il = array.length; i < il; ++i) {
                if (Array.isArray(array[i])) {
                    exports.flatten(array[i], result);
                } else {
                    result.push(array[i]);
                }
            }
            return result;
        };
        exports.removeKeys = function (object, keys) {
            for (var i = 0, il = keys.length; i < il; i++) {
                delete object[keys[i]];
            }
        };
        exports.reach = function (obj, chain) {
            var path = chain.split('.');
            var ref = obj;
            path.forEach(function (level) {
                if (ref) {
                    ref = ref[level];
                }
            });
            return ref;
        };
        exports.inheritAsync = function (self, obj, keys) {
            keys = keys || null;
            for (var i in obj) {
                if (obj.hasOwnProperty(i)) {
                    if (keys instanceof Array && keys.indexOf(i) < 0) {
                        continue;
                    }
                    self.prototype[i] = function (fn) {
                        return function (callback) {
                            var result = null;
                            try {
                                result = fn();
                            } catch (err) {
                                return callback(err);
                            }
                            return callback(null, result);
                        };
                    }(obj[i]);
                }
            }
        };
        exports.formatStack = function (stack) {
            var trace = [];
            stack.forEach(function (item) {
                trace.push([
                    item.getFileName(),
                    item.getLineNumber(),
                    item.getColumnNumber(),
                    item.getFunctionName(),
                    item.isConstructor()
                ]);
            });
            return trace;
        };
        exports.formatTrace = function (trace) {
            var display = [];
            trace.forEach(function (row) {
                display.push((row[4] ? 'new ' : '') + row[3] + ' (' + row[0] + ':' + row[1] + ':' + row[2] + ')');
            });
            return display;
        };
        exports.callStack = function (slice) {
            var v8 = Error.prepareStackTrace;
            Error.prepareStackTrace = function (err, stack) {
                return stack;
            };
            var capture = {};
            Error.captureStackTrace(capture, arguments.callee);
            var stack = capture.stack;
            Error.prepareStackTrace = v8;
            var trace = exports.formatStack(stack);
            if (slice) {
                return trace.slice(slice);
            }
            return trace;
        };
        exports.displayStack = function (slice) {
            var trace = exports.callStack(slice === undefined ? 1 : slice + 1);
            return exports.formatTrace(trace);
        };
        exports.abortThrow = false;
        exports.abort = function (message, hideStack) {
            if (process.env.NODE_ENV === 'test' || exports.abortThrow === true) {
                throw new Error(message || 'Unknown error');
            }
            var stack = '';
            if (!hideStack) {
                stack = exports.displayStack(1).join('\n\t');
            }
            console.log('ABORT: ' + message + '\n\t' + stack);
            process.exit(1);
        };
        exports.assert = function (condition, message) {
            if (!condition) {
                throw new Error(message || 'Unknown error');
            }
        };
        exports.loadDirModules = function (path, excludeFiles, target) {
            var exclude = {};
            for (var i = 0, il = excludeFiles.length; i < il; ++i) {
                exclude[excludeFiles[i] + '.js'] = true;
            }
            Fs.readdirSync(path).forEach(function (filename) {
                if (/\.js$/.test(filename) && !exclude[filename]) {
                    var name = filename.substr(0, filename.lastIndexOf('.'));
                    var capName = name.charAt(0).toUpperCase() + name.substr(1).toLowerCase();
                    if (typeof target !== 'function') {
                        target[capName] = null;
                    } else {
                        target(path + '/' + name, name, capName);
                    }
                }
            });
        };
        exports.rename = function (obj, from, to) {
            obj[to] = obj[from];
            delete obj[from];
        };
        exports.Timer = function () {
            this.reset();
        };
        exports.Timer.prototype.reset = function () {
            this.ts = Date.now();
        };
        exports.Timer.prototype.elapsed = function () {
            return Date.now() - this.ts;
        };
        exports.loadPackage = function (dir) {
            var result = {};
            var filepath = (dir || process.env.PWD) + '/package.json';
            if (Fs.existsSync(filepath)) {
                try {
                    result = JSON.parse(Fs.readFileSync(filepath));
                } catch (e) {
                }
            }
            return result;
        };
        exports.escapeRegex = function (string) {
            return string.replace(/[\^\$\.\*\+\-\?\=\!\:\|\\\/\(\)\[\]\{\}\,]/g, '\\$&');
        };
        exports.toss = function (condition) {
            var message = arguments.length === 3 ? arguments[1] : '';
            var callback = arguments.length === 3 ? arguments[2] : arguments[1];
            var err = message instanceof Error ? message : message ? new Error(message) : condition instanceof Error ? condition : new Error();
            if (condition instanceof Error || !condition) {
                return callback(err);
            }
        };
        exports.base64urlEncode = function (value) {
            return new Buffer(value, 'binary').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/\=/g, '');
        };
        exports.base64urlDecode = function (encoded) {
            if (encoded && !encoded.match(/^[\w\-]*$/)) {
                return new Error('Invalid character');
            }
            try {
                return new Buffer(encoded.replace(/-/g, '+').replace(/:/g, '/'), 'base64').toString('binary');
            } catch (err) {
                return err;
            }
        };
        exports.escapeHeaderAttribute = function (attribute) {
            exports.assert(attribute.match(/^[ \w\!#\$%&'\(\)\*\+,\-\.\/\:;<\=>\?@\[\]\^`\{\|\}~\"\\]*$/), 'Bad attribute value (' + attribute + ')');
            return attribute.replace(/\\/g, '\\\\').replace(/\"/g, '\\"');
        };
        exports.escapeHtml = function (string) {
            return Escape.escapeHtml(string);
        };
        exports.escapeJavaScript = function (string) {
            return Escape.escapeJavaScript(string);
        };
        exports.consoleFunc = console.log;
        exports.printEvent = function (event) {
            var pad = function (value) {
                return (value < 10 ? '0' : '') + value;
            };
            var now = new Date(event.timestamp);
            var timestring = (now.getYear() - 100).toString() + pad(now.getMonth() + 1) + pad(now.getDate()) + '/' + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()) + '.' + now.getMilliseconds();
            var data = event.data;
            if (typeof event.data !== 'string') {
                try {
                    data = JSON.stringify(event.data);
                } catch (e) {
                    data = 'JSON Error: ' + e.message;
                }
            }
            var output = timestring + ', ' + event.tags[0] + ', ' + data;
            exports.consoleFunc(output);
        };
    },
    '13': function (require, module, exports, global) {
        var internals = {};
        exports.escapeJavaScript = function (input) {
            if (!input) {
                return '';
            }
            var escaped = '';
            for (var i = 0, il = input.length; i < il; ++i) {
                var charCode = input.charCodeAt(i);
                if (internals.isSafe(charCode)) {
                    escaped += input[i];
                } else {
                    escaped += internals.escapeJavaScriptChar(charCode);
                }
            }
            return escaped;
        };
        exports.escapeHtml = function (input) {
            if (!input) {
                return '';
            }
            var escaped = '';
            for (var i = 0, il = input.length; i < il; ++i) {
                var charCode = input.charCodeAt(i);
                if (internals.isSafe(charCode)) {
                    escaped += input[i];
                } else {
                    escaped += internals.escapeHtmlChar(charCode);
                }
            }
            return escaped;
        };
        internals.escapeJavaScriptChar = function (charCode) {
            if (charCode >= 256) {
                return '\\u' + internals.padLeft('' + charCode, 4);
            }
            var hexValue = new Buffer(String.fromCharCode(charCode), 'ascii').toString('hex');
            return '\\x' + internals.padLeft(hexValue, 2);
        };
        internals.escapeHtmlChar = function (charCode) {
            var namedEscape = internals.namedHtml[charCode];
            if (typeof namedEscape !== 'undefined') {
                return namedEscape;
            }
            if (charCode >= 256) {
                return '&#' + charCode + ';';
            }
            var hexValue = new Buffer(String.fromCharCode(charCode), 'ascii').toString('hex');
            return '&#x' + internals.padLeft(hexValue, 2) + ';';
        };
        internals.padLeft = function (str, len) {
            while (str.length < len) {
                str = '0' + str;
            }
            return str;
        };
        internals.isSafe = function (charCode) {
            return typeof internals.safeCharCodes[charCode] !== 'undefined';
        };
        internals.namedHtml = {
            '38': '&amp;',
            '60': '&lt;',
            '62': '&gt;',
            '34': '&quot;',
            '160': '&nbsp;',
            '162': '&cent;',
            '163': '&pound;',
            '164': '&curren;',
            '169': '&copy;',
            '174': '&reg;'
        };
        internals.safeCharCodes = function () {
            var safe = {};
            for (var i = 32; i < 123; ++i) {
                if (i >= 97 && i <= 122 || i >= 65 && i <= 90 || i >= 48 && i <= 57 || i === 32 || i === 46 || i === 44 || i === 45 || i === 58 || i === 95) {
                    safe[i] = null;
                }
            }
            return safe;
        }();
    },
    '14': function (require, module, exports, global) {
        module.exports = require('15');
    },
    '15': function (require, module, exports, global) {
        var Dgram = null;
        var Dns = null;
        var Hoek = require('11');
        var internals = {};
        exports.time = function (options, callback) {
            if (arguments.length !== 2) {
                callback = arguments[0];
                options = {};
            }
            var settings = Hoek.clone(options);
            settings.host = settings.host || 'pool.ntp.org';
            settings.port = settings.port || 123;
            settings.resolveReference = settings.resolveReference || false;
            var timeoutId = 0;
            var sent = 0;
            var isFinished = false;
            var finish = function (err, result) {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = 0;
                }
                if (!isFinished) {
                    isFinished = true;
                    socket.close();
                    return callback(err, result);
                }
            };
            var socket = Dgram.createSocket('udp4');
            socket.on('error', function (err) {
                return finish(err);
            });
            socket.on('message', function (buffer, rinfo) {
                var received = Date.now();
                var message = new internals.NtpMessage(buffer);
                if (!message.isValid) {
                    return finish(new Error('Invalid server response'), message);
                }
                if (message.originateTimestamp !== sent) {
                    return finish(new Error('Wrong originate timestamp'), message);
                }
                var T1 = message.originateTimestamp;
                var T2 = message.receiveTimestamp;
                var T3 = message.transmitTimestamp;
                var T4 = received;
                message.d = T4 - T1 - (T3 - T2);
                message.t = (T2 - T1 + (T3 - T4)) / 2;
                message.receivedLocally = received;
                if (!settings.resolveReference || message.stratum !== 'secondary') {
                    return finish(null, message);
                }
                Dns.reverse(message.referenceId, function (err, domains) {
                    if (!err) {
                        message.referenceHost = domains[0];
                    }
                    return finish(null, message);
                });
            });
            if (settings.timeout) {
                timeoutId = setTimeout(function () {
                    timeoutId = 0;
                    return finish(new Error('Timeout'));
                }, settings.timeout);
            }
            var message = new Buffer(48);
            for (var i = 0; i < 48; i++) {
                message[i] = 0;
            }
            message[0] = (0 << 6) + (4 << 3) + (3 << 0);
            sent = Date.now();
            internals.fromMsecs(sent, message, 40);
            socket.send(message, 0, message.length, settings.port, settings.host, function (err, bytes) {
                if (err || bytes !== 48) {
                    return finish(err || new Error('Could not send entire message'));
                }
            });
        };
        internals.NtpMessage = function (buffer) {
            this.isValid = false;
            if (buffer.length !== 48) {
                return;
            }
            var li = buffer[0] >> 6;
            switch (li) {
            case 0:
                this.leapIndicator = 'no-warning';
                break;
            case 1:
                this.leapIndicator = 'last-minute-61';
                break;
            case 2:
                this.leapIndicator = 'last-minute-59';
                break;
            case 3:
                this.leapIndicator = 'alarm';
                break;
            }
            var vn = (buffer[0] & 56) >> 3;
            this.version = vn;
            var mode = buffer[0] & 7;
            switch (mode) {
            case 1:
                this.mode = 'symmetric-active';
                break;
            case 2:
                this.mode = 'symmetric-passive';
                break;
            case 3:
                this.mode = 'client';
                break;
            case 4:
                this.mode = 'server';
                break;
            case 5:
                this.mode = 'broadcast';
                break;
            case 0:
            case 6:
            case 7:
                this.mode = 'reserved';
                break;
            }
            var stratum = buffer[1];
            if (stratum === 0) {
                this.stratum = 'death';
            } else if (stratum === 1) {
                this.stratum = 'primary';
            } else if (stratum <= 15) {
                this.stratum = 'secondary';
            } else {
                this.stratum = 'reserved';
            }
            this.pollInterval = Math.round(Math.pow(2, buffer[2])) * 1000;
            this.precision = Math.pow(2, buffer[3]) * 1000;
            var rootDelay = 256 * (256 * (256 * buffer[4] + buffer[5]) + buffer[6]) + buffer[7];
            this.rootDelay = 1000 * (rootDelay / 65536);
            this.rootDispersion = ((buffer[8] << 8) + buffer[9] + ((buffer[10] << 8) + buffer[11]) / Math.pow(2, 16)) * 1000;
            this.referenceId = '';
            switch (this.stratum) {
            case 'death':
            case 'primary':
                this.referenceId = String.fromCharCode(buffer[12]) + String.fromCharCode(buffer[13]) + String.fromCharCode(buffer[14]) + String.fromCharCode(buffer[15]);
                break;
            case 'secondary':
                this.referenceId = '' + buffer[12] + '.' + buffer[13] + '.' + buffer[14] + '.' + buffer[15];
                break;
            }
            this.referenceTimestamp = internals.toMsecs(buffer, 16);
            this.originateTimestamp = internals.toMsecs(buffer, 24);
            this.receiveTimestamp = internals.toMsecs(buffer, 32);
            this.transmitTimestamp = internals.toMsecs(buffer, 40);
            if (this.version === 4 && this.stratum !== 'reserved' && this.mode === 'server' && this.originateTimestamp && this.receiveTimestamp && this.transmitTimestamp) {
                this.isValid = true;
            }
            return this;
        };
        internals.toMsecs = function (buffer, offset) {
            var seconds = 0;
            var fraction = 0;
            for (var i = 0; i < 4; ++i) {
                seconds = seconds * 256 + buffer[offset + i];
            }
            for (i = 4; i < 8; ++i) {
                fraction = fraction * 256 + buffer[offset + i];
            }
            return (seconds - 2208988800 + fraction / Math.pow(2, 32)) * 1000;
        };
        internals.fromMsecs = function (ts, buffer, offset) {
            var seconds = Math.floor(ts / 1000) + 2208988800;
            var fraction = Math.round(ts % 1000 / 1000 * Math.pow(2, 32));
            buffer[offset + 0] = (seconds & 4278190080) >> 24;
            buffer[offset + 1] = (seconds & 16711680) >> 16;
            buffer[offset + 2] = (seconds & 65280) >> 8;
            buffer[offset + 3] = seconds & 255;
            buffer[offset + 4] = (fraction & 4278190080) >> 24;
            buffer[offset + 5] = (fraction & 16711680) >> 16;
            buffer[offset + 6] = (fraction & 65280) >> 8;
            buffer[offset + 7] = fraction & 255;
        };
        internals.last = {
            offset: 0,
            expires: 0,
            host: '',
            port: 0
        };
        exports.offset = function (options, callback) {
            if (arguments.length !== 2) {
                callback = arguments[0];
                options = {};
            }
            var now = Date.now();
            var clockSyncRefresh = options.clockSyncRefresh || 24 * 60 * 60 * 1000;
            if (internals.last.offset && internals.last.host === options.host && internals.last.port === options.port && now < internals.last.expires) {
                return callback(null, internals.last.offset);
            }
            exports.time(options, function (err, time) {
                if (err) {
                    return callback(err, 0);
                }
                internals.last = {
                    offset: Math.round(time.t),
                    expires: now + clockSyncRefresh,
                    host: options.host,
                    port: options.port
                };
                return callback(null, internals.last.offset);
            });
        };
        internals.now = { intervalId: 0 };
        exports.start = function (options, callback) {
            if (arguments.length !== 2) {
                callback = arguments[0];
                options = {};
            }
            if (internals.now.intervalId) {
                return callback();
            }
            exports.offset(options, function (err, offset) {
                internals.now.intervalId = setInterval(function () {
                    exports.offset(options, function () {
                    });
                }, options.clockSyncRefresh || 24 * 60 * 60 * 1000);
                return callback();
            });
        };
        exports.stop = function () {
            if (!internals.now.intervalId) {
                return;
            }
            clearInterval(internals.now.intervalId);
            internals.now.intervalId = 0;
        };
        exports.isLive = function () {
            return !!internals.now.intervalId;
        };
        exports.now = function () {
            var now = Date.now();
            if (!exports.isLive() || now >= internals.last.expires) {
                return now;
            }
            return now + internals.last.offset;
        };
    },
    '16': function (require, module, exports, global) {
        var Boom = require('z');
        var Hoek = require('11');
        var Cryptiles = require('17');
        var Crypto = require('19');
        var Utils = require('1a');
        var internals = {};
        exports.authenticate = function (req, credentialsFunc, options, callback) {
            options.nonceFunc = options.nonceFunc || function (nonce, ts, callback) {
                return callback();
            };
            options.timestampSkewSec = options.timestampSkewSec || 60;
            var now = Utils.now() + (options.localtimeOffsetMsec || 0);
            var request = Utils.parseRequest(req, options);
            if (request instanceof Error) {
                return callback(Boom.badRequest(request.message));
            }
            var attributes = Utils.parseAuthorizationHeader(request.authorization);
            if (attributes instanceof Error) {
                return callback(attributes);
            }
            var artifacts = {
                    method: request.method,
                    host: request.host,
                    port: request.port,
                    resource: request.url,
                    ts: attributes.ts,
                    nonce: attributes.nonce,
                    hash: attributes.hash,
                    ext: attributes.ext,
                    app: attributes.app,
                    dlg: attributes.dlg,
                    mac: attributes.mac,
                    id: attributes.id
                };
            if (!attributes.id || !attributes.ts || !attributes.nonce || !attributes.mac) {
                return callback(Boom.badRequest('Missing attributes'), null, artifacts);
            }
            credentialsFunc(attributes.id, function (err, credentials) {
                artifacts.credentials = credentials;
                if (err) {
                    return callback(err, credentials || null, artifacts);
                }
                if (!credentials) {
                    return callback(Boom.unauthorized('Unknown credentials', 'Hawk'), null, artifacts);
                }
                if (!credentials.key || !credentials.algorithm) {
                    return callback(Boom.internal('Invalid credentials'), credentials, artifacts);
                }
                if (Crypto.algorithms.indexOf(credentials.algorithm) === -1) {
                    return callback(Boom.internal('Unknown algorithm'), credentials, artifacts);
                }
                var mac = Crypto.calculateMac('header', artifacts);
                if (!Cryptiles.fixedTimeComparison(mac, attributes.mac)) {
                    return callback(Boom.unauthorized('Bad mac', 'Hawk'), credentials, artifacts);
                }
                if (options.payload !== null && options.payload !== undefined) {
                    if (!attributes.hash) {
                        return callback(Boom.unauthorized('Missing required payload hash', 'Hawk'), credentials, artifacts);
                    }
                    var hash = Crypto.calculateHash(options.payload, credentials.algorithm, request.contentType);
                    if (!Cryptiles.fixedTimeComparison(hash, attributes.hash)) {
                        return callback(Boom.unauthorized('Bad payload hash', 'Hawk'), credentials, artifacts);
                    }
                }
                options.nonceFunc(attributes.nonce, attributes.ts, function (err) {
                    if (err) {
                        return callback(Boom.unauthorized('Invalid nonce', 'Hawk'), credentials, artifacts);
                    }
                    if (Math.abs(attributes.ts * 1000 - now) > options.timestampSkewSec * 1000) {
                        var fresh = Utils.now() + (options.localtimeOffsetMsec || 0);
                        var tsm = Crypto.calculateTsMac(fresh, credentials);
                        return callback(Boom.unauthorized('Stale timestamp', 'Hawk', {
                            ts: fresh,
                            tsm: tsm
                        }), credentials, artifacts);
                    }
                    return callback(null, credentials, artifacts);
                });
            });
        };
        exports.authenticatePayload = function (payload, credentials, hash, contentType) {
            var calculatedHash = Crypto.calculateHash(payload, credentials.algorithm, contentType);
            return Cryptiles.fixedTimeComparison(calculatedHash, hash);
        };
        exports.header = function (artifacts, options) {
            options = options || {};
            if (!artifacts || typeof artifacts !== 'object' || typeof options !== 'object') {
                return '';
            }
            artifacts = Hoek.clone(artifacts);
            delete artifacts.mac;
            artifacts.hash = options.hash;
            artifacts.ext = options.ext;
            var credentials = artifacts.credentials;
            if (!credentials || !credentials.key || !credentials.algorithm) {
                return '';
            }
            if (Crypto.algorithms.indexOf(credentials.algorithm) === -1) {
                return '';
            }
            if (!artifacts.hash && options.hasOwnProperty('payload')) {
                artifacts.hash = Crypto.calculateHash(options.payload, credentials.algorithm, options.contentType);
            }
            var mac = Crypto.calculateMac('response', artifacts);
            var header = 'Hawk mac="' + mac + '"' + (artifacts.hash ? ', hash="' + artifacts.hash + '"' : '');
            if (artifacts.ext !== null && artifacts.ext !== undefined && artifacts.ext !== '') {
                header += ', ext="' + Utils.escapeHeaderAttribute(artifacts.ext) + '"';
            }
            return header;
        };
    },
    '17': function (require, module, exports, global) {
        module.exports = require('18');
    },
    '18': function (require, module, exports, global) {
        var Crypto = null;
        var Boom = require('z');
        var internals = {};
        exports.randomString = function (size) {
            var buffer = exports.randomBits((size + 1) * 6);
            if (buffer instanceof Error) {
                return buffer;
            }
            var string = buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/\=/g, '');
            return string.slice(0, size);
        };
        exports.randomBits = function (bits) {
            if (!bits || bits < 0) {
                return Boom.internal('Invalid random bits count');
            }
            var bytes = Math.ceil(bits / 8);
            try {
                return Crypto.randomBytes(bytes);
            } catch (err) {
                return Boom.internal('Failed generating random bits: ' + err.message);
            }
        };
        exports.fixedTimeComparison = function (a, b) {
            var mismatch = a.length === b.length ? 0 : 1;
            if (mismatch) {
                b = a;
            }
            for (var i = 0, il = a.length; i < il; ++i) {
                var ac = a.charCodeAt(i);
                var bc = b.charCodeAt(i);
                mismatch += ac === bc ? 0 : 1;
            }
            return mismatch === 0;
        };
    },
    '19': function (require, module, exports, global) {
        var Crypto = null;
        var Url = null;
        var Utils = require('1a');
        var internals = {};
        exports.headerVersion = '1';
        exports.algorithms = [
            'sha1',
            'sha256'
        ];
        exports.calculateMac = function (type, options) {
            var normalized = exports.generateNormalizedString(type, options);
            var hmac = Crypto.createHmac(options.credentials.algorithm, options.credentials.key).update(normalized);
            var digest = hmac.digest('base64');
            return digest;
        };
        exports.generateNormalizedString = function (type, options) {
            var normalized = 'hawk.' + exports.headerVersion + '.' + type + '\n' + options.ts + '\n' + options.nonce + '\n' + options.method.toUpperCase() + '\n' + options.resource + '\n' + options.host.toLowerCase() + '\n' + options.port + '\n' + (options.hash || '') + '\n';
            if (options.ext) {
                normalized += options.ext.replace('\\', '\\\\').replace('\n', '\\n');
            }
            normalized += '\n';
            if (options.app) {
                normalized += options.app + '\n' + (options.dlg || '') + '\n';
            }
            return normalized;
        };
        exports.calculateHash = function (payload, algorithm, contentType) {
            var hash = Crypto.createHash(algorithm);
            hash.update('hawk.' + exports.headerVersion + '.payload\n');
            hash.update(Utils.parseContentType(contentType) + '\n');
            hash.update(payload || '');
            hash.update('\n');
            return hash.digest('base64');
        };
        exports.calculateTsMac = function (ts, credentials) {
            var hash = Crypto.createHash(credentials.algorithm);
            hash.update('hawk.' + exports.headerVersion + '.ts\n' + ts + '\n');
            return hash.digest('base64');
        };
    },
    '1a': function (require, module, exports, global) {
        var Hoek = require('11');
        var Sntp = require('14');
        var Boom = require('z');
        var internals = {};
        internals.import = function () {
            for (var i in Hoek) {
                if (Hoek.hasOwnProperty(i)) {
                    exports[i] = Hoek[i];
                }
            }
        };
        internals.import();
        exports.version = function () {
            return exports.loadPackage(__dirname + '/..').version;
        };
        exports.parseHost = function (req, hostHeaderName) {
            hostHeaderName = hostHeaderName ? hostHeaderName.toLowerCase() : 'host';
            var hostHeader = req.headers[hostHeaderName];
            if (!hostHeader) {
                return null;
            }
            var hostHeaderRegex = /^(?:(?:\r\n)?[\t ])*([^:]+)(?::(\d+))?(?:(?:\r\n)?[\t ])*$/;
            var hostParts = hostHeader.match(hostHeaderRegex);
            if (!hostParts || hostParts.length !== 3 || !hostParts[1]) {
                return null;
            }
            return {
                name: hostParts[1],
                port: hostParts[2] ? hostParts[2] : req.connection && req.connection.encrypted ? 443 : 80
            };
        };
        exports.parseContentType = function (header) {
            if (!header) {
                return '';
            }
            return header.split(';')[0].trim().toLowerCase();
        };
        exports.parseRequest = function (req, options) {
            if (!req.headers) {
                return req;
            }
            var host = exports.parseHost(req, options.hostHeaderName);
            if (!host) {
                return new Error('Invalid Host header');
            }
            var request = {
                    method: req.method,
                    url: req.url,
                    host: host.name,
                    port: host.port,
                    authorization: req.headers.authorization,
                    contentType: req.headers['content-type'] || ''
                };
            return request;
        };
        exports.now = function () {
            return Sntp.now();
        };
        exports.parseAuthorizationHeader = function (header, keys) {
            keys = keys || [
                'id',
                'ts',
                'nonce',
                'hash',
                'ext',
                'mac',
                'app',
                'dlg'
            ];
            if (!header) {
                return Boom.unauthorized(null, 'Hawk');
            }
            var headerParts = header.match(/^(\w+)(?:\s+(.*))?$/);
            if (!headerParts) {
                return Boom.badRequest('Invalid header syntax');
            }
            var scheme = headerParts[1];
            if (scheme.toLowerCase() !== 'hawk') {
                return Boom.unauthorized(null, 'Hawk');
            }
            var attributesString = headerParts[2];
            if (!attributesString) {
                return Boom.badRequest('Invalid header syntax');
            }
            var attributes = {};
            var errorMessage = '';
            var verify = attributesString.replace(/(\w+)="([^"\\]*)"\s*(?:,\s*|$)/g, function ($0, $1, $2) {
                    if (keys.indexOf($1) === -1) {
                        errorMessage = 'Unknown attribute: ' + $1;
                        return;
                    }
                    if ($2.match(/^[ \w\!#\$%&'\(\)\*\+,\-\.\/\:;<\=>\?@\[\]\^`\{\|\}~]+$/) === null) {
                        errorMessage = 'Bad attribute value: ' + $1;
                        return;
                    }
                    if (attributes.hasOwnProperty($1)) {
                        errorMessage = 'Duplicate attribute: ' + $1;
                        return;
                    }
                    attributes[$1] = $2;
                    return '';
                });
            if (verify !== '') {
                return Boom.badRequest(errorMessage || 'Bad header format');
            }
            return attributes;
        };
    },
    '1b': function (require, module, exports, global) {
        var Url = null;
        var Hoek = require('11');
        var Cryptiles = require('17');
        var Crypto = require('19');
        var Utils = require('1a');
        var internals = {};
        exports.header = function (uri, method, options) {
            var result = {
                    field: '',
                    artifacts: {}
                };
            if (!uri || typeof uri !== 'string' && typeof uri !== 'object' || !method || typeof method !== 'string' || !options || typeof options !== 'object') {
                return result;
            }
            var timestamp = options.timestamp || Math.floor((Utils.now() + (options.localtimeOffsetMsec || 0)) / 1000);
            var credentials = options.credentials;
            if (!credentials || !credentials.id || !credentials.key || !credentials.algorithm) {
                return result;
            }
            if (Crypto.algorithms.indexOf(credentials.algorithm) === -1) {
                return result;
            }
            if (typeof uri === 'string') {
                uri = Url.parse(uri);
            }
            var artifacts = {
                    credentials: credentials,
                    ts: timestamp,
                    nonce: options.nonce || Cryptiles.randomString(6),
                    method: method,
                    resource: uri.pathname + (uri.search || ''),
                    host: uri.hostname,
                    port: uri.port || (uri.protocol === 'http:' ? 80 : 443),
                    hash: options.hash,
                    ext: options.ext,
                    app: options.app,
                    dlg: options.dlg
                };
            result.artifacts = artifacts;
            if (!artifacts.hash && options.hasOwnProperty('payload')) {
                artifacts.hash = Crypto.calculateHash(options.payload, credentials.algorithm, options.contentType);
            }
            var mac = Crypto.calculateMac('header', artifacts);
            var hasExt = artifacts.ext !== null && artifacts.ext !== undefined && artifacts.ext !== '';
            var header = 'Hawk id="' + credentials.id + '", ts="' + artifacts.ts + '", nonce="' + artifacts.nonce + (artifacts.hash ? '", hash="' + artifacts.hash : '') + (hasExt ? '", ext="' + Utils.escapeHeaderAttribute(artifacts.ext) : '') + '", mac="' + mac + '"';
            if (artifacts.app) {
                header += ', app="' + artifacts.app + (artifacts.dlg ? '", dlg="' + artifacts.dlg : '') + '"';
            }
            result.field = header;
            return result;
        };
        exports.authenticate = function (res, artifacts, options) {
            artifacts = Hoek.clone(artifacts);
            options = options || {};
            if (res.headers['www-authenticate']) {
                var attributes = Utils.parseAuthorizationHeader(res.headers['www-authenticate'], [
                        'ts',
                        'tsm',
                        'error'
                    ]);
                if (attributes instanceof Error) {
                    return false;
                }
                if (attributes.ts) {
                    var tsm = Crypto.calculateTsMac(attributes.ts, artifacts.credentials);
                    if (!Cryptiles.fixedTimeComparison(tsm, attributes.tsm)) {
                        return false;
                    }
                }
            }
            if (!res.headers['server-authorization'] && !options.required) {
                return true;
            }
            var attributes = Utils.parseAuthorizationHeader(res.headers['server-authorization'], [
                    'mac',
                    'ext',
                    'hash'
                ]);
            if (attributes instanceof Error) {
                return false;
            }
            artifacts.ext = attributes.ext;
            artifacts.hash = attributes.hash;
            var mac = Crypto.calculateMac('response', artifacts);
            if (!Cryptiles.fixedTimeComparison(mac, attributes.mac)) {
                return false;
            }
            if (!options.hasOwnProperty('payload')) {
                return true;
            }
            if (!attributes.hash) {
                return false;
            }
            var calculatedHash = Crypto.calculateHash(options.payload, artifacts.credentials.algorithm, res.headers['content-type']);
            return Cryptiles.fixedTimeComparison(calculatedHash, attributes.hash);
        };
    },
    '1c': function (require, module, exports, global) {
        var Url = null;
        var Boom = require('z');
        var Cryptiles = require('17');
        var Crypto = require('19');
        var Utils = require('1a');
        var internals = {};
        exports.authenticate = function (req, credentialsFunc, options, callback) {
            var now = Utils.now() + (options.localtimeOffsetMsec || 0);
            var request = Utils.parseRequest(req, options);
            if (request instanceof Error) {
                return callback(Boom.badRequest(request.message));
            }
            var resource = request.url.match(/^(\/.*)([\?&])bewit\=([^&$]*)(?:&(.+))?$/);
            if (!resource) {
                return callback(Boom.unauthorized(null, 'Hawk'));
            }
            if (!resource[3]) {
                return callback(Boom.unauthorized('Empty bewit', 'Hawk'));
            }
            if (request.method !== 'GET' && request.method !== 'HEAD') {
                return callback(Boom.unauthorized('Invalid method', 'Hawk'));
            }
            if (request.authorization) {
                return callback(Boom.badRequest('Multiple authentications', 'Hawk'));
            }
            var bewitString = Utils.base64urlDecode(resource[3]);
            if (bewitString instanceof Error) {
                return callback(Boom.badRequest('Invalid bewit encoding'));
            }
            var bewitParts = bewitString.split('\\');
            if (!bewitParts || bewitParts.length !== 4) {
                return callback(Boom.badRequest('Invalid bewit structure'));
            }
            var bewit = {
                    id: bewitParts[0],
                    exp: parseInt(bewitParts[1], 10),
                    mac: bewitParts[2],
                    ext: bewitParts[3] || ''
                };
            if (!bewit.id || !bewit.exp || !bewit.mac) {
                return callback(Boom.badRequest('Missing bewit attributes'));
            }
            var url = resource[1];
            if (resource[4]) {
                url += resource[2] + resource[4];
            }
            if (bewit.exp * 1000 <= now) {
                return callback(Boom.unauthorized('Access expired', 'Hawk'), null, bewit);
            }
            credentialsFunc(bewit.id, function (err, credentials) {
                if (err) {
                    return callback(err, credentials || null, bewit.ext);
                }
                if (!credentials) {
                    return callback(Boom.unauthorized('Unknown credentials', 'Hawk'), null, bewit);
                }
                if (!credentials.key || !credentials.algorithm) {
                    return callback(Boom.internal('Invalid credentials'), credentials, bewit);
                }
                if (Crypto.algorithms.indexOf(credentials.algorithm) === -1) {
                    return callback(Boom.internal('Unknown algorithm'), credentials, bewit);
                }
                var mac = Crypto.calculateMac('bewit', {
                        credentials: credentials,
                        ts: bewit.exp,
                        nonce: '',
                        method: 'GET',
                        resource: url,
                        host: request.host,
                        port: request.port,
                        ext: bewit.ext
                    });
                if (!Cryptiles.fixedTimeComparison(mac, bewit.mac)) {
                    return callback(Boom.unauthorized('Bad mac', 'Hawk'), credentials, bewit);
                }
                return callback(null, credentials, bewit);
            });
        };
        exports.getBewit = function (uri, options) {
            if (!uri || typeof uri !== 'string' && typeof uri !== 'object' || !options || typeof options !== 'object' || !options.ttlSec) {
                return '';
            }
            options.ext = options.ext === null || options.ext === undefined ? '' : options.ext;
            var now = Utils.now() + (options.localtimeOffsetMsec || 0);
            var credentials = options.credentials;
            if (!credentials || !credentials.id || !credentials.key || !credentials.algorithm) {
                return '';
            }
            if (Crypto.algorithms.indexOf(credentials.algorithm) === -1) {
                return '';
            }
            if (typeof uri === 'string') {
                uri = Url.parse(uri);
            }
            var exp = Math.floor(now / 1000) + options.ttlSec;
            var mac = Crypto.calculateMac('bewit', {
                    credentials: credentials,
                    ts: exp,
                    nonce: '',
                    method: 'GET',
                    resource: uri.pathname + (uri.search || ''),
                    host: uri.hostname,
                    port: uri.port || (uri.protocol === 'http:' ? 80 : 443),
                    ext: options.ext
                });
            var bewit = credentials.id + '\\' + exp + '\\' + mac + '\\' + options.ext;
            return Utils.base64urlEncode(bewit);
        };
    },
    '1d': function (require, module, exports, global) {
        var crypto = null, parse = null.parse;
        ;
        var keys = [
                'acl',
                'location',
                'logging',
                'notification',
                'partNumber',
                'policy',
                'requestPayment',
                'torrent',
                'uploadId',
                'uploads',
                'versionId',
                'versioning',
                'versions',
                'website'
            ];
        function authorization(options) {
            return 'AWS ' + options.key + ':' + sign(options);
        }
        module.exports = authorization;
        module.exports.authorization = authorization;
        function hmacSha1(options) {
            return crypto.createHmac('sha1', options.secret).update(options.message).digest('base64');
        }
        module.exports.hmacSha1 = hmacSha1;
        function sign(options) {
            options.message = stringToSign(options);
            return hmacSha1(options);
        }
        module.exports.sign = sign;
        function signQuery(options) {
            options.message = queryStringToSign(options);
            return hmacSha1(options);
        }
        module.exports.signQuery = signQuery;
        function stringToSign(options) {
            var headers = options.amazonHeaders || '';
            if (headers)
                headers += '\n';
            var r = [
                    options.verb,
                    options.md5,
                    options.contentType,
                    options.date.toUTCString(),
                    headers + options.resource
                ];
            return r.join('\n');
        }
        module.exports.queryStringToSign = stringToSign;
        function queryStringToSign(options) {
            return 'GET\n\n\n' + options.date + '\n' + options.resource;
        }
        module.exports.queryStringToSign = queryStringToSign;
        function canonicalizeHeaders(headers) {
            var buf = [], fields = Object.keys(headers);
            ;
            for (var i = 0, len = fields.length; i < len; ++i) {
                var field = fields[i], val = headers[field], field = field.toLowerCase();
                ;
                if (0 !== field.indexOf('x-amz'))
                    continue;
                buf.push(field + ':' + val);
            }
            return buf.sort().join('\n');
        }
        module.exports.canonicalizeHeaders = canonicalizeHeaders;
        function canonicalizeResource(resource) {
            var url = parse(resource, true), path = url.pathname, buf = [];
            ;
            Object.keys(url.query).forEach(function (key) {
                if (!~keys.indexOf(key))
                    return;
                var val = '' == url.query[key] ? '' : '=' + encodeURIComponent(url.query[key]);
                buf.push(key + val);
            });
            return path + (buf.length ? '?' + buf.sort().join('&') : '');
        }
        module.exports.canonicalizeResource = canonicalizeResource;
    },
    '1e': function (require, module, exports, global) {
        var parser = require('1f');
        var signer = require('1h');
        var verify = require('1i');
        var util = require('1j');
        module.exports = {
            parse: parser.parseRequest,
            parseRequest: parser.parseRequest,
            sign: signer.signRequest,
            signRequest: signer.signRequest,
            sshKeyToPEM: util.sshKeyToPEM,
            sshKeyFingerprint: util.fingerprint,
            verify: verify.verifySignature,
            verifySignature: verify.verifySignature
        };
    },
    '1f': function (require, module, exports, global) {
        var assert = require('1g');
        var util = null;
        var Algorithms = {
                'rsa-sha1': true,
                'rsa-sha256': true,
                'rsa-sha512': true,
                'dsa-sha1': true,
                'hmac-sha1': true,
                'hmac-sha256': true,
                'hmac-sha512': true
            };
        var State = {
                New: 0,
                Params: 1,
                Signature: 2
            };
        var ParamsState = {
                Name: 0,
                Value: 1
            };
        function HttpSignatureError(message, caller) {
            if (Error.captureStackTrace)
                Error.captureStackTrace(this, caller || HttpSignatureError);
            this.message = message;
            this.name = caller.name;
        }
        util.inherits(HttpSignatureError, Error);
        function ExpiredRequestError(message) {
            HttpSignatureError.call(this, message, ExpiredRequestError);
        }
        util.inherits(ExpiredRequestError, HttpSignatureError);
        function InvalidHeaderError(message) {
            HttpSignatureError.call(this, message, InvalidHeaderError);
        }
        util.inherits(InvalidHeaderError, HttpSignatureError);
        function InvalidParamsError(message) {
            HttpSignatureError.call(this, message, InvalidParamsError);
        }
        util.inherits(InvalidParamsError, HttpSignatureError);
        function MissingHeaderError(message) {
            HttpSignatureError.call(this, message, MissingHeaderError);
        }
        util.inherits(MissingHeaderError, HttpSignatureError);
        module.exports = {
            parseRequest: function parseRequest(request, options) {
                assert.object(request, 'request');
                assert.object(request.headers, 'request.headers');
                if (options === undefined) {
                    options = {};
                }
                if (options.headers === undefined) {
                    options.headers = [request.headers['x-date'] ? 'x-date' : 'date'];
                }
                assert.object(options, 'options');
                assert.arrayOfString(options.headers, 'options.headers');
                assert.optionalNumber(options.clockSkew, 'options.clockSkew');
                if (!request.headers.authorization)
                    throw new MissingHeaderError('no authorization header present in ' + 'the request');
                options.clockSkew = options.clockSkew || 300;
                var i = 0;
                var state = State.New;
                var substate = ParamsState.Name;
                var tmpName = '';
                var tmpValue = '';
                var parsed = {
                        scheme: '',
                        params: {},
                        signature: '',
                        signingString: '',
                        get algorithm() {
                            return this.params.algorithm.toUpperCase();
                        },
                        get keyId() {
                            return this.params.keyId;
                        }
                    };
                var authz = request.headers.authorization;
                for (i = 0; i < authz.length; i++) {
                    var c = authz.charAt(i);
                    switch (Number(state)) {
                    case State.New:
                        if (c !== ' ')
                            parsed.scheme += c;
                        else
                            state = State.Params;
                        break;
                    case State.Params:
                        switch (Number(substate)) {
                        case ParamsState.Name:
                            if (c === '"') {
                                parsed.params[tmpName] = '';
                                tmpValue = '';
                                substate = ParamsState.Value;
                            } else if (c === ' ') {
                                state = State.Signature;
                            } else if (c !== '=' && c !== ',') {
                                tmpName += c;
                            }
                            break;
                        case ParamsState.Value:
                            if (c === '"') {
                                parsed.params[tmpName] = tmpValue;
                                tmpName = '';
                                substate = ParamsState.Name;
                            } else {
                                tmpValue += c;
                            }
                            break;
                        default:
                            throw new Error('Invalid substate');
                        }
                        break;
                    case State.Signature:
                        parsed.signature += c;
                        break;
                    default:
                        throw new Error('Invalid substate');
                    }
                }
                if (!parsed.params.headers || parsed.params.headers === '') {
                    if (request.headers['x-date']) {
                        parsed.params.headers = ['x-date'];
                    } else {
                        parsed.params.headers = ['date'];
                    }
                } else {
                    parsed.params.headers = parsed.params.headers.split(' ');
                }
                if (!parsed.scheme || parsed.scheme !== 'Signature')
                    throw new InvalidHeaderError('scheme was not "Signature"');
                if (!parsed.params.keyId)
                    throw new InvalidHeaderError('keyId was not specified');
                if (!parsed.params.algorithm)
                    throw new InvalidHeaderError('algorithm was not specified');
                if (!parsed.signature)
                    throw new InvalidHeaderError('signature was empty');
                parsed.params.algorithm = parsed.params.algorithm.toLowerCase();
                if (!Algorithms[parsed.params.algorithm])
                    throw new InvalidParamsError(parsed.params.algorithm + ' is not supported');
                for (i = 0; i < parsed.params.headers.length; i++) {
                    var h = parsed.params.headers[i].toLowerCase();
                    parsed.params.headers[i] = h;
                    var value;
                    if (h !== 'request-line') {
                        value = request.headers[h];
                        if (!value)
                            throw new MissingHeaderError(h + ' was not in the request');
                    } else {
                        value = request.method + ' ' + request.url + ' HTTP/' + request.httpVersion;
                    }
                    parsed.signingString += value;
                    if (i + 1 < parsed.params.headers.length)
                        parsed.signingString += '\n';
                }
                var date;
                if (request.headers.date || request.headers['x-date']) {
                    if (request.headers['x-date']) {
                        date = new Date(request.headers['x-date']);
                    } else {
                        date = new Date(request.headers.date);
                    }
                    var now = new Date();
                    var skew = Math.abs(now.getTime() - date.getTime());
                    if (skew > options.clockSkew * 1000) {
                        throw new ExpiredRequestError('clock skew of ' + skew / 1000 + 's was greater than ' + options.clockSkew + 's');
                    }
                }
                options.headers.forEach(function (hdr) {
                    if (parsed.params.headers.indexOf(hdr) < 0)
                        throw new MissingHeaderError(hdr + ' was not a signed header');
                });
                if (options.algorithms) {
                    if (options.algorithms.indexOf(parsed.params.algorithm) === -1)
                        throw new InvalidParamsError(parsed.params.algorithm + ' is not a supported algorithm');
                }
                return parsed;
            }
        };
    },
    '1g': function (require, module, exports, global) {
        var assert = null;
        var Stream = null.Stream;
        var util = null;
        var NDEBUG = process.env.NODE_NDEBUG || false;
        var ARRAY_TYPE_REQUIRED = '%s ([%s]) required';
        var TYPE_REQUIRED = '%s (%s) is required';
        function capitalize(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        }
        function uncapitalize(str) {
            return str.charAt(0).toLowerCase() + str.slice(1);
        }
        function _() {
            return util.format.apply(util, arguments);
        }
        function _assert(arg, type, name, stackFunc) {
            if (!NDEBUG) {
                name = name || type;
                stackFunc = stackFunc || _assert.caller;
                var t = typeof arg;
                if (t !== type) {
                    throw new assert.AssertionError({
                        message: _(TYPE_REQUIRED, name, type),
                        actual: t,
                        expected: type,
                        operator: '===',
                        stackStartFunction: stackFunc
                    });
                }
            }
        }
        function array(arr, type, name) {
            if (!NDEBUG) {
                name = name || type;
                if (!Array.isArray(arr)) {
                    throw new assert.AssertionError({
                        message: _(ARRAY_TYPE_REQUIRED, name, type),
                        actual: typeof arr,
                        expected: 'array',
                        operator: 'Array.isArray',
                        stackStartFunction: array.caller
                    });
                }
                for (var i = 0; i < arr.length; i++) {
                    _assert(arr[i], type, name, array);
                }
            }
        }
        function bool(arg, name) {
            _assert(arg, 'boolean', name, bool);
        }
        function buffer(arg, name) {
            if (!Buffer.isBuffer(arg)) {
                throw new assert.AssertionError({
                    message: _(TYPE_REQUIRED, name, type),
                    actual: typeof arg,
                    expected: 'buffer',
                    operator: 'Buffer.isBuffer',
                    stackStartFunction: buffer
                });
            }
        }
        function func(arg, name) {
            _assert(arg, 'function', name);
        }
        function number(arg, name) {
            _assert(arg, 'number', name);
        }
        function object(arg, name) {
            _assert(arg, 'object', name);
        }
        function stream(arg, name) {
            if (!(arg instanceof Stream)) {
                throw new assert.AssertionError({
                    message: _(TYPE_REQUIRED, name, type),
                    actual: typeof arg,
                    expected: 'Stream',
                    operator: 'instanceof',
                    stackStartFunction: buffer
                });
            }
        }
        function string(arg, name) {
            _assert(arg, 'string', name);
        }
        module.exports = {
            bool: bool,
            buffer: buffer,
            func: func,
            number: number,
            object: object,
            stream: stream,
            string: string
        };
        Object.keys(module.exports).forEach(function (k) {
            if (k === 'buffer')
                return;
            var name = 'arrayOf' + capitalize(k);
            if (k === 'bool')
                k = 'boolean';
            if (k === 'func')
                k = 'function';
            module.exports[name] = function (arg, name) {
                array(arg, k, name);
            };
        });
        Object.keys(module.exports).forEach(function (k) {
            var _name = 'optional' + capitalize(k);
            var s = uncapitalize(k.replace('arrayOf', ''));
            if (s === 'bool')
                s = 'boolean';
            if (s === 'func')
                s = 'function';
            if (k.indexOf('arrayOf') !== -1) {
                module.exports[_name] = function (arg, name) {
                    if (!NDEBUG && arg !== undefined) {
                        array(arg, s, name);
                    }
                };
            } else {
                module.exports[_name] = function (arg, name) {
                    if (!NDEBUG && arg !== undefined) {
                        _assert(arg, s, name);
                    }
                };
            }
        });
        Object.keys(assert).forEach(function (k) {
            if (k === 'AssertionError') {
                module.exports[k] = assert[k];
                return;
            }
            module.exports[k] = function () {
                if (!NDEBUG) {
                    assert[k].apply(assert[k], arguments);
                }
            };
        });
    },
    '1h': function (require, module, exports, global) {
        var assert = require('1g');
        var crypto = null;
        var http = null;
        var sprintf = null.format;
        var Algorithms = {
                'rsa-sha1': true,
                'rsa-sha256': true,
                'rsa-sha512': true,
                'dsa-sha1': true,
                'hmac-sha1': true,
                'hmac-sha256': true,
                'hmac-sha512': true
            };
        var Authorization = 'Signature keyId="%s",algorithm="%s",headers="%s" %s';
        function MissingHeaderError(message) {
            this.name = 'MissingHeaderError';
            this.message = message;
            this.stack = new Error().stack;
        }
        MissingHeaderError.prototype = new Error();
        function InvalidAlgorithmError(message) {
            this.name = 'InvalidAlgorithmError';
            this.message = message;
            this.stack = new Error().stack;
        }
        InvalidAlgorithmError.prototype = new Error();
        function _pad(val) {
            if (parseInt(val, 10) < 10) {
                val = '0' + val;
            }
            return val;
        }
        function _rfc1123() {
            var date = new Date();
            var months = [
                    'Jan',
                    'Feb',
                    'Mar',
                    'Apr',
                    'May',
                    'Jun',
                    'Jul',
                    'Aug',
                    'Sep',
                    'Oct',
                    'Nov',
                    'Dec'
                ];
            var days = [
                    'Sun',
                    'Mon',
                    'Tue',
                    'Wed',
                    'Thu',
                    'Fri',
                    'Sat'
                ];
            return days[date.getUTCDay()] + ', ' + _pad(date.getUTCDate()) + ' ' + months[date.getUTCMonth()] + ' ' + date.getUTCFullYear() + ' ' + _pad(date.getUTCHours()) + ':' + _pad(date.getUTCMinutes()) + ':' + _pad(date.getUTCSeconds()) + ' GMT';
        }
        module.exports = {
            signRequest: function signRequest(request, options) {
                assert.object(request, 'request');
                assert.object(options, 'options');
                assert.optionalString(options.algorithm, 'options.algorithm');
                assert.string(options.keyId, 'options.keyId');
                assert.optionalArrayOfString(options.headers, 'options.headers');
                if (!request.getHeader('Date'))
                    request.setHeader('Date', _rfc1123());
                if (!options.headers)
                    options.headers = ['date'];
                if (!options.algorithm)
                    options.algorithm = 'rsa-sha256';
                options.algorithm = options.algorithm.toLowerCase();
                if (!Algorithms[options.algorithm])
                    throw new InvalidAlgorithmError(options.algorithm + ' is not supported');
                var i;
                var stringToSign = '';
                for (i = 0; i < options.headers.length; i++) {
                    if (typeof options.headers[i] !== 'string')
                        throw new TypeError('options.headers must be an array of Strings');
                    var h = options.headers[i].toLowerCase();
                    request.getHeader(h);
                    var value = request.getHeader(h);
                    if (!value) {
                        if (h === 'request-line') {
                            value = request.method + ' ' + request.path + ' HTTP/1.1';
                        } else {
                            throw new MissingHeaderError(h + ' was not in the request');
                        }
                    }
                    stringToSign += value;
                    if (i + 1 < options.headers.length)
                        stringToSign += '\n';
                }
                var alg = options.algorithm.match(/(hmac|rsa)-(\w+)/);
                var signature;
                if (alg[1] === 'hmac') {
                    var hmac = crypto.createHmac(alg[2].toUpperCase(), options.key);
                    hmac.update(stringToSign);
                    signature = hmac.digest('base64');
                } else {
                    var signer = crypto.createSign(options.algorithm.toUpperCase());
                    signer.update(stringToSign);
                    signature = signer.sign(options.key, 'base64');
                }
                request.setHeader('Authorization', sprintf(Authorization, options.keyId, options.algorithm, options.headers.join(' '), signature));
                return true;
            }
        };
    },
    '1i': function (require, module, exports, global) {
        var assert = require('1g');
        var crypto = null;
        module.exports = {
            verifySignature: function verifySignature(parsedSignature, key) {
                assert.object(parsedSignature, 'parsedSignature');
                assert.string(key, 'key');
                var alg = parsedSignature.algorithm.match(/(HMAC|RSA|DSA)-(\w+)/);
                if (!alg || alg.length !== 3)
                    throw new TypeError('parsedSignature: unsupported algorithm ' + parsedSignature.algorithm);
                if (alg[1] === 'HMAC') {
                    var hmac = crypto.createHmac(alg[2].toLowerCase(), key);
                    hmac.update(parsedSignature.signingString);
                    return hmac.digest('base64') === parsedSignature.signature;
                } else {
                    var verify = crypto.createVerify(alg[0]);
                    verify.update(parsedSignature.signingString);
                    return verify.verify(key, parsedSignature.signature, 'base64');
                }
            }
        };
    },
    '1j': function (require, module, exports, global) {
        var assert = require('1g');
        var crypto = null;
        var asn1 = require('1k');
        var ctype = require('1q');
        function readNext(buffer, offset) {
            var len = ctype.ruint32(buffer, 'big', offset);
            offset += 4;
            var newOffset = offset + len;
            return {
                data: buffer.slice(offset, newOffset),
                offset: newOffset
            };
        }
        function writeInt(writer, buffer) {
            writer.writeByte(2);
            writer.writeLength(buffer.length);
            for (var i = 0; i < buffer.length; i++)
                writer.writeByte(buffer[i]);
            return writer;
        }
        function rsaToPEM(key) {
            var buffer;
            var der;
            var exponent;
            var i;
            var modulus;
            var newKey = '';
            var offset = 0;
            var type;
            var tmp;
            try {
                buffer = new Buffer(key.split(' ')[1], 'base64');
                tmp = readNext(buffer, offset);
                type = tmp.data.toString();
                offset = tmp.offset;
                if (type !== 'ssh-rsa')
                    throw new Error('Invalid ssh key type: ' + type);
                tmp = readNext(buffer, offset);
                exponent = tmp.data;
                offset = tmp.offset;
                tmp = readNext(buffer, offset);
                modulus = tmp.data;
            } catch (e) {
                throw new Error('Invalid ssh key: ' + key);
            }
            der = new asn1.BerWriter();
            der.startSequence();
            der.startSequence();
            der.writeOID('1.2.840.113549.1.1.1');
            der.writeNull();
            der.endSequence();
            der.startSequence(3);
            der.writeByte(0);
            der.startSequence();
            writeInt(der, modulus);
            writeInt(der, exponent);
            der.endSequence();
            der.endSequence();
            der.endSequence();
            tmp = der.buffer.toString('base64');
            for (i = 0; i < tmp.length; i++) {
                if (i % 64 === 0)
                    newKey += '\n';
                newKey += tmp.charAt(i);
            }
            if (!/\\n$/.test(newKey))
                newKey += '\n';
            return '-----BEGIN PUBLIC KEY-----' + newKey + '-----END PUBLIC KEY-----\n';
        }
        function dsaToPEM(key) {
            var buffer;
            var offset = 0;
            var tmp;
            var der;
            var newKey = '';
            var type;
            var p;
            var q;
            var g;
            var y;
            try {
                buffer = new Buffer(key.split(' ')[1], 'base64');
                tmp = readNext(buffer, offset);
                type = tmp.data.toString();
                offset = tmp.offset;
                if (!/^ssh-ds[as].*/.test(type))
                    throw new Error('Invalid ssh key type: ' + type);
                tmp = readNext(buffer, offset);
                p = tmp.data;
                offset = tmp.offset;
                tmp = readNext(buffer, offset);
                q = tmp.data;
                offset = tmp.offset;
                tmp = readNext(buffer, offset);
                g = tmp.data;
                offset = tmp.offset;
                tmp = readNext(buffer, offset);
                y = tmp.data;
            } catch (e) {
                console.log(e.stack);
                throw new Error('Invalid ssh key: ' + key);
            }
            der = new asn1.BerWriter();
            der.startSequence();
            der.startSequence();
            der.writeOID('1.2.840.10040.4.1');
            der.startSequence();
            writeInt(der, p);
            writeInt(der, q);
            writeInt(der, g);
            der.endSequence();
            der.endSequence();
            der.startSequence(3);
            der.writeByte(0);
            writeInt(der, y);
            der.endSequence();
            der.endSequence();
            tmp = der.buffer.toString('base64');
            for (var i = 0; i < tmp.length; i++) {
                if (i % 64 === 0)
                    newKey += '\n';
                newKey += tmp.charAt(i);
            }
            if (!/\\n$/.test(newKey))
                newKey += '\n';
            return '-----BEGIN PUBLIC KEY-----' + newKey + '-----END PUBLIC KEY-----\n';
        }
        module.exports = {
            sshKeyToPEM: function sshKeyToPEM(key) {
                assert.string(key, 'ssh_key');
                if (/^ssh-rsa.*/.test(key))
                    return rsaToPEM(key);
                if (/^ssh-ds[as].*/.test(key))
                    return dsaToPEM(key);
                throw new Error('Only RSA and DSA public keys are allowed');
            },
            fingerprint: function fingerprint(key) {
                assert.string(key, 'ssh_key');
                var pieces = key.split(' ');
                if (!pieces || !pieces.length || pieces.length < 2)
                    throw new Error('invalid ssh key');
                var data = new Buffer(pieces[1], 'base64');
                var hash = crypto.createHash('md5');
                hash.update(data);
                var digest = hash.digest('hex');
                var fp = '';
                for (var i = 0; i < digest.length; i++) {
                    if (i && i % 2 === 0)
                        fp += ':';
                    fp += digest[i];
                }
                return fp;
            }
        };
    },
    '1k': function (require, module, exports, global) {
        var Ber = require('1l');
        module.exports = {
            Ber: Ber,
            BerReader: Ber.Reader,
            BerWriter: Ber.Writer
        };
    },
    '1l': function (require, module, exports, global) {
        var errors = require('1m');
        var types = require('1n');
        var Reader = require('1o');
        var Writer = require('1p');
        module.exports = {
            Reader: Reader,
            Writer: Writer
        };
        for (var t in types) {
            if (types.hasOwnProperty(t))
                module.exports[t] = types[t];
        }
        for (var e in errors) {
            if (errors.hasOwnProperty(e))
                module.exports[e] = errors[e];
        }
    },
    '1m': function (require, module, exports, global) {
        module.exports = {
            newInvalidAsn1Error: function (msg) {
                var e = new Error();
                e.name = 'InvalidAsn1Error';
                e.message = msg || '';
                return e;
            }
        };
    },
    '1n': function (require, module, exports, global) {
        module.exports = {
            EOC: 0,
            Boolean: 1,
            Integer: 2,
            BitString: 3,
            OctetString: 4,
            Null: 5,
            OID: 6,
            ObjectDescriptor: 7,
            External: 8,
            Real: 9,
            Enumeration: 10,
            PDV: 11,
            Utf8String: 12,
            RelativeOID: 13,
            Sequence: 16,
            Set: 17,
            NumericString: 18,
            PrintableString: 19,
            T61String: 20,
            VideotexString: 21,
            IA5String: 22,
            UTCTime: 23,
            GeneralizedTime: 24,
            GraphicString: 25,
            VisibleString: 26,
            GeneralString: 28,
            UniversalString: 29,
            CharacterString: 30,
            BMPString: 31,
            Constructor: 32,
            Context: 128
        };
    },
    '1o': function (require, module, exports, global) {
        var assert = null;
        var ASN1 = require('1n');
        var errors = require('1m');
        var newInvalidAsn1Error = errors.newInvalidAsn1Error;
        function Reader(data) {
            if (!data || !Buffer.isBuffer(data))
                throw new TypeError('data must be a node Buffer');
            this._buf = data;
            this._size = data.length;
            this._len = 0;
            this._offset = 0;
            var self = this;
            this.__defineGetter__('length', function () {
                return self._len;
            });
            this.__defineGetter__('offset', function () {
                return self._offset;
            });
            this.__defineGetter__('remain', function () {
                return self._size - self._offset;
            });
            this.__defineGetter__('buffer', function () {
                return self._buf.slice(self._offset);
            });
        }
        Reader.prototype.readByte = function (peek) {
            if (this._size - this._offset < 1)
                return null;
            var b = this._buf[this._offset] & 255;
            if (!peek)
                this._offset += 1;
            return b;
        };
        Reader.prototype.peek = function () {
            return this.readByte(true);
        };
        Reader.prototype.readLength = function (offset) {
            if (offset === undefined)
                offset = this._offset;
            if (offset >= this._size)
                return null;
            var lenB = this._buf[offset++] & 255;
            if (lenB === null)
                return null;
            if ((lenB & 128) == 128) {
                lenB &= 127;
                if (lenB == 0)
                    throw newInvalidAsn1Error('Indefinite length not supported');
                if (lenB > 4)
                    throw newInvalidAsn1Error('encoding too long');
                if (this._size - offset < lenB)
                    return null;
                this._len = 0;
                for (var i = 0; i < lenB; i++)
                    this._len = (this._len << 8) + (this._buf[offset++] & 255);
            } else {
                this._len = lenB;
            }
            return offset;
        };
        Reader.prototype.readSequence = function (tag) {
            var seq = this.peek();
            if (seq === null)
                return null;
            if (tag !== undefined && tag !== seq)
                throw newInvalidAsn1Error('Expected 0x' + tag.toString(16) + ': got 0x' + seq.toString(16));
            var o = this.readLength(this._offset + 1);
            if (o === null)
                return null;
            this._offset = o;
            return seq;
        };
        Reader.prototype.readInt = function () {
            return this._readTag(ASN1.Integer);
        };
        Reader.prototype.readBoolean = function () {
            return this._readTag(ASN1.Boolean) === 0 ? false : true;
        };
        Reader.prototype.readEnumeration = function () {
            return this._readTag(ASN1.Enumeration);
        };
        Reader.prototype.readString = function (tag, retbuf) {
            if (!tag)
                tag = ASN1.OctetString;
            var b = this.peek();
            if (b === null)
                return null;
            if (b !== tag)
                throw newInvalidAsn1Error('Expected 0x' + tag.toString(16) + ': got 0x' + b.toString(16));
            var o = this.readLength(this._offset + 1);
            if (o === null)
                return null;
            if (this.length > this._size - o)
                return null;
            this._offset = o;
            if (this.length === 0)
                return '';
            var str = this._buf.slice(this._offset, this._offset + this.length);
            this._offset += this.length;
            return retbuf ? str : str.toString('utf8');
        };
        Reader.prototype.readOID = function (tag) {
            if (!tag)
                tag = ASN1.OID;
            var b = this.peek();
            if (b === null)
                return null;
            if (b !== tag)
                throw newInvalidAsn1Error('Expected 0x' + tag.toString(16) + ': got 0x' + b.toString(16));
            var o = this.readLength(this._offset + 1);
            if (o === null)
                return null;
            if (this.length > this._size - o)
                return null;
            this._offset = o;
            var values = [];
            var value = 0;
            for (var i = 0; i < this.length; i++) {
                var byte = this._buf[this._offset++] & 255;
                value <<= 7;
                value += byte & 127;
                if ((byte & 128) == 0) {
                    values.push(value);
                    value = 0;
                }
            }
            value = values.shift();
            values.unshift(value % 40);
            values.unshift(value / 40 >> 0);
            return values.join('.');
        };
        Reader.prototype._readTag = function (tag) {
            assert.ok(tag !== undefined);
            var b = this.peek();
            if (b === null)
                return null;
            if (b !== tag)
                throw newInvalidAsn1Error('Expected 0x' + tag.toString(16) + ': got 0x' + b.toString(16));
            var o = this.readLength(this._offset + 1);
            if (o === null)
                return null;
            if (this.length > 4)
                throw newInvalidAsn1Error('Integer too long: ' + this.length);
            if (this.length > this._size - o)
                return null;
            this._offset = o;
            var fb = this._buf[this._offset++];
            var value = 0;
            value = fb & 127;
            for (var i = 1; i < this.length; i++) {
                value <<= 8;
                value |= this._buf[this._offset++] & 255;
            }
            if ((fb & 128) == 128)
                value = -value;
            return value;
        };
        module.exports = Reader;
    },
    '1p': function (require, module, exports, global) {
        var assert = null;
        var ASN1 = require('1n');
        var errors = require('1m');
        var newInvalidAsn1Error = errors.newInvalidAsn1Error;
        var DEFAULT_OPTS = {
                size: 1024,
                growthFactor: 8
            };
        function merge(from, to) {
            assert.ok(from);
            assert.equal(typeof from, 'object');
            assert.ok(to);
            assert.equal(typeof to, 'object');
            var keys = Object.getOwnPropertyNames(from);
            keys.forEach(function (key) {
                if (to[key])
                    return;
                var value = Object.getOwnPropertyDescriptor(from, key);
                Object.defineProperty(to, key, value);
            });
            return to;
        }
        function Writer(options) {
            options = merge(DEFAULT_OPTS, options || {});
            this._buf = new Buffer(options.size || 1024);
            this._size = this._buf.length;
            this._offset = 0;
            this._options = options;
            this._seq = [];
            var self = this;
            this.__defineGetter__('buffer', function () {
                if (self._seq.length)
                    throw new InvalidAsn1Error(self._seq.length + ' unended sequence(s)');
                return self._buf.slice(0, self._offset);
            });
        }
        Writer.prototype.writeByte = function (b) {
            if (typeof b !== 'number')
                throw new TypeError('argument must be a Number');
            this._ensure(1);
            this._buf[this._offset++] = b;
        };
        Writer.prototype.writeInt = function (i, tag) {
            if (typeof i !== 'number')
                throw new TypeError('argument must be a Number');
            if (typeof tag !== 'number')
                tag = ASN1.Integer;
            var sz = 4;
            while (((i & 4286578688) === 0 || (i & 4286578688) === 4286578688) && sz > 1) {
                sz--;
                i <<= 8;
            }
            if (sz > 4)
                throw new InvalidAsn1Error('BER ints cannot be > 0xffffffff');
            this._ensure(2 + sz);
            this._buf[this._offset++] = tag;
            this._buf[this._offset++] = sz;
            while (sz-- > 0) {
                this._buf[this._offset++] = (i & 4278190080) >> 24;
                i <<= 8;
            }
        };
        Writer.prototype.writeNull = function () {
            this.writeByte(ASN1.Null);
            this.writeByte(0);
        };
        Writer.prototype.writeEnumeration = function (i, tag) {
            if (typeof i !== 'number')
                throw new TypeError('argument must be a Number');
            if (typeof tag !== 'number')
                tag = ASN1.Enumeration;
            return this.writeInt(i, tag);
        };
        Writer.prototype.writeBoolean = function (b, tag) {
            if (typeof b !== 'boolean')
                throw new TypeError('argument must be a Boolean');
            if (typeof tag !== 'number')
                tag = ASN1.Boolean;
            this._ensure(3);
            this._buf[this._offset++] = tag;
            this._buf[this._offset++] = 1;
            this._buf[this._offset++] = b ? 255 : 0;
        };
        Writer.prototype.writeString = function (s, tag) {
            if (typeof s !== 'string')
                throw new TypeError('argument must be a string (was: ' + typeof s + ')');
            if (typeof tag !== 'number')
                tag = ASN1.OctetString;
            var len = Buffer.byteLength(s);
            this.writeByte(tag);
            this.writeLength(len);
            if (len) {
                this._ensure(len);
                this._buf.write(s, this._offset);
                this._offset += len;
            }
        };
        Writer.prototype.writeBuffer = function (buf, tag) {
            if (typeof tag !== 'number')
                throw new TypeError('tag must be a number');
            if (!Buffer.isBuffer(buf))
                throw new TypeError('argument must be a buffer');
            this.writeByte(tag);
            this.writeLength(buf.length);
            this._ensure(buf.length);
            buf.copy(this._buf, this._offset, 0, buf.length);
            this._offset += buf.length;
        };
        Writer.prototype.writeStringArray = function (strings) {
            if (!strings instanceof Array)
                throw new TypeError('argument must be an Array[String]');
            var self = this;
            strings.forEach(function (s) {
                self.writeString(s);
            });
        };
        Writer.prototype.writeOID = function (s, tag) {
            if (typeof s !== 'string')
                throw new TypeError('argument must be a string');
            if (typeof tag !== 'number')
                tag = ASN1.OID;
            if (!/^([0-9]+\.){3,}[0-9]+$/.test(s))
                throw new Error('argument is not a valid OID string');
            function encodeOctet(bytes, octet) {
                if (octet < 128) {
                    bytes.push(octet);
                } else if (octet < 16384) {
                    bytes.push(octet >>> 7 | 128);
                    bytes.push(octet & 127);
                } else if (octet < 2097152) {
                    bytes.push(octet >>> 14 | 128);
                    bytes.push((octet >>> 7 | 128) & 255);
                    bytes.push(octet & 127);
                } else if (octet < 268435456) {
                    bytes.push(octet >>> 21 | 128);
                    bytes.push((octet >>> 14 | 128) & 255);
                    bytes.push((octet >>> 7 | 128) & 255);
                    bytes.push(octet & 127);
                } else {
                    bytes.push((octet >>> 28 | 128) & 255);
                    bytes.push((octet >>> 21 | 128) & 255);
                    bytes.push((octet >>> 14 | 128) & 255);
                    bytes.push((octet >>> 7 | 128) & 255);
                    bytes.push(octet & 127);
                }
            }
            var tmp = s.split('.');
            var bytes = [];
            bytes.push(parseInt(tmp[0], 10) * 40 + parseInt(tmp[1], 10));
            tmp.slice(2).forEach(function (b) {
                encodeOctet(bytes, parseInt(b, 10));
            });
            var self = this;
            this._ensure(2 + bytes.length);
            this.writeByte(tag);
            this.writeLength(bytes.length);
            bytes.forEach(function (b) {
                self.writeByte(b);
            });
        };
        Writer.prototype.writeLength = function (len) {
            if (typeof len !== 'number')
                throw new TypeError('argument must be a Number');
            this._ensure(4);
            if (len <= 127) {
                this._buf[this._offset++] = len;
            } else if (len <= 255) {
                this._buf[this._offset++] = 129;
                this._buf[this._offset++] = len;
            } else if (len <= 65535) {
                this._buf[this._offset++] = 130;
                this._buf[this._offset++] = len >> 8;
                this._buf[this._offset++] = len;
            } else if (len <= 16777215) {
                this._shift(start, len, 1);
                this._buf[this._offset++] = 131;
                this._buf[this._offset++] = len >> 16;
                this._buf[this._offset++] = len >> 8;
                this._buf[this._offset++] = len;
            } else {
                throw new InvalidAsn1ERror('Length too long (> 4 bytes)');
            }
        };
        Writer.prototype.startSequence = function (tag) {
            if (typeof tag !== 'number')
                tag = ASN1.Sequence | ASN1.Constructor;
            this.writeByte(tag);
            this._seq.push(this._offset);
            this._ensure(3);
            this._offset += 3;
        };
        Writer.prototype.endSequence = function () {
            var seq = this._seq.pop();
            var start = seq + 3;
            var len = this._offset - start;
            if (len <= 127) {
                this._shift(start, len, -2);
                this._buf[seq] = len;
            } else if (len <= 255) {
                this._shift(start, len, -1);
                this._buf[seq] = 129;
                this._buf[seq + 1] = len;
            } else if (len <= 65535) {
                this._buf[seq] = 130;
                this._buf[seq + 1] = len >> 8;
                this._buf[seq + 2] = len;
            } else if (len <= 16777215) {
                this._shift(start, len, 1);
                this._buf[seq] = 131;
                this._buf[seq + 1] = len >> 16;
                this._buf[seq + 2] = len >> 8;
                this._buf[seq + 3] = len;
            } else {
                throw new InvalidAsn1Error('Sequence too long');
            }
        };
        Writer.prototype._shift = function (start, len, shift) {
            assert.ok(start !== undefined);
            assert.ok(len !== undefined);
            assert.ok(shift);
            this._buf.copy(this._buf, start + shift, start, start + len);
            this._offset += shift;
        };
        Writer.prototype._ensure = function (len) {
            assert.ok(len);
            if (this._size - this._offset < len) {
                var sz = this._size * this._options.growthFactor;
                if (sz - this._offset < len)
                    sz += len;
                var buf = new Buffer(sz);
                this._buf.copy(buf, 0, 0, this._offset);
                this._buf = buf;
                this._size = sz;
            }
        };
        module.exports = Writer;
    },
    '1q': function (require, module, exports, global) {
        var mod_ctf = require('1r');
        var mod_ctio = require('1s');
        var mod_assert = null;
        var deftypes = {
                'uint8_t': {
                    read: ctReadUint8,
                    write: ctWriteUint8
                },
                'uint16_t': {
                    read: ctReadUint16,
                    write: ctWriteUint16
                },
                'uint32_t': {
                    read: ctReadUint32,
                    write: ctWriteUint32
                },
                'uint64_t': {
                    read: ctReadUint64,
                    write: ctWriteUint64
                },
                'int8_t': {
                    read: ctReadSint8,
                    write: ctWriteSint8
                },
                'int16_t': {
                    read: ctReadSint16,
                    write: ctWriteSint16
                },
                'int32_t': {
                    read: ctReadSint32,
                    write: ctWriteSint32
                },
                'int64_t': {
                    read: ctReadSint64,
                    write: ctWriteSint64
                },
                'float': {
                    read: ctReadFloat,
                    write: ctWriteFloat
                },
                'double': {
                    read: ctReadDouble,
                    write: ctWriteDouble
                },
                'char': {
                    read: ctReadChar,
                    write: ctWriteChar
                },
                'char[]': {
                    read: ctReadCharArray,
                    write: ctWriteCharArray
                }
            };
        function ctReadUint8(endian, buffer, offset) {
            var val = mod_ctio.ruint8(buffer, endian, offset);
            return {
                value: val,
                size: 1
            };
        }
        function ctReadUint16(endian, buffer, offset) {
            var val = mod_ctio.ruint16(buffer, endian, offset);
            return {
                value: val,
                size: 2
            };
        }
        function ctReadUint32(endian, buffer, offset) {
            var val = mod_ctio.ruint32(buffer, endian, offset);
            return {
                value: val,
                size: 4
            };
        }
        function ctReadUint64(endian, buffer, offset) {
            var val = mod_ctio.ruint64(buffer, endian, offset);
            return {
                value: val,
                size: 8
            };
        }
        function ctReadSint8(endian, buffer, offset) {
            var val = mod_ctio.rsint8(buffer, endian, offset);
            return {
                value: val,
                size: 1
            };
        }
        function ctReadSint16(endian, buffer, offset) {
            var val = mod_ctio.rsint16(buffer, endian, offset);
            return {
                value: val,
                size: 2
            };
        }
        function ctReadSint32(endian, buffer, offset) {
            var val = mod_ctio.rsint32(buffer, endian, offset);
            return {
                value: val,
                size: 4
            };
        }
        function ctReadSint64(endian, buffer, offset) {
            var val = mod_ctio.rsint64(buffer, endian, offset);
            return {
                value: val,
                size: 8
            };
        }
        function ctReadFloat(endian, buffer, offset) {
            var val = mod_ctio.rfloat(buffer, endian, offset);
            return {
                value: val,
                size: 4
            };
        }
        function ctReadDouble(endian, buffer, offset) {
            var val = mod_ctio.rdouble(buffer, endian, offset);
            return {
                value: val,
                size: 8
            };
        }
        function ctReadChar(endian, buffer, offset) {
            var res = new Buffer(1);
            res[0] = mod_ctio.ruint8(buffer, endian, offset);
            return {
                value: res,
                size: 1
            };
        }
        function ctReadCharArray(length, endian, buffer, offset) {
            var ii;
            var res = new Buffer(length);
            for (ii = 0; ii < length; ii++)
                res[ii] = mod_ctio.ruint8(buffer, endian, offset + ii);
            return {
                value: res,
                size: length
            };
        }
        function ctWriteUint8(value, endian, buffer, offset) {
            mod_ctio.wuint8(value, endian, buffer, offset);
            return 1;
        }
        function ctWriteUint16(value, endian, buffer, offset) {
            mod_ctio.wuint16(value, endian, buffer, offset);
            return 2;
        }
        function ctWriteUint32(value, endian, buffer, offset) {
            mod_ctio.wuint32(value, endian, buffer, offset);
            return 4;
        }
        function ctWriteUint64(value, endian, buffer, offset) {
            mod_ctio.wuint64(value, endian, buffer, offset);
            return 8;
        }
        function ctWriteSint8(value, endian, buffer, offset) {
            mod_ctio.wsint8(value, endian, buffer, offset);
            return 1;
        }
        function ctWriteSint16(value, endian, buffer, offset) {
            mod_ctio.wsint16(value, endian, buffer, offset);
            return 2;
        }
        function ctWriteSint32(value, endian, buffer, offset) {
            mod_ctio.wsint32(value, endian, buffer, offset);
            return 4;
        }
        function ctWriteSint64(value, endian, buffer, offset) {
            mod_ctio.wsint64(value, endian, buffer, offset);
            return 8;
        }
        function ctWriteFloat(value, endian, buffer, offset) {
            mod_ctio.wfloat(value, endian, buffer, offset);
            return 4;
        }
        function ctWriteDouble(value, endian, buffer, offset) {
            mod_ctio.wdouble(value, endian, buffer, offset);
            return 8;
        }
        function ctWriteChar(value, endian, buffer, offset) {
            if (!(value instanceof Buffer))
                throw new Error('Input must be a buffer');
            mod_ctio.ruint8(value[0], endian, buffer, offset);
            return 1;
        }
        function ctWriteCharArray(value, length, endian, buffer, offset) {
            var ii;
            if (!(value instanceof Buffer))
                throw new Error('Input must be a buffer');
            if (value.length > length)
                throw new Error('value length greater than array length');
            for (ii = 0; ii < value.length && ii < length; ii++)
                mod_ctio.wuint8(value[ii], endian, buffer, offset + ii);
            for (; ii < length; ii++)
                mod_ctio.wuint8(0, endian, offset + ii);
            return length;
        }
        function ctGetBasicTypes() {
            var ret = {};
            var key;
            for (key in deftypes)
                ret[key] = deftypes[key];
            return ret;
        }
        function ctParseType(str) {
            var begInd, endInd;
            var type, len;
            if (typeof str != 'string')
                throw new Error('type must be a Javascript string');
            endInd = str.lastIndexOf(']');
            if (endInd == -1) {
                if (str.lastIndexOf('[') != -1)
                    throw new Error('found invalid type with \'[\' but ' + 'no corresponding \']\'');
                return { type: str };
            }
            begInd = str.lastIndexOf('[');
            if (begInd == -1)
                throw new Error('found invalid type with \']\' but ' + 'no corresponding \'[\'');
            if (begInd >= endInd)
                throw new Error('malformed type, \']\' appears before \'[\'');
            type = str.substring(0, begInd);
            len = str.substring(begInd + 1, endInd);
            return {
                type: type,
                len: len
            };
        }
        function ctCheckReq(def, types, fields) {
            var ii, jj;
            var req, keys, key;
            var found = {};
            if (!(def instanceof Array))
                throw new Error('definition is not an array');
            if (def.length === 0)
                throw new Error('definition must have at least one element');
            for (ii = 0; ii < def.length; ii++) {
                req = def[ii];
                if (!(req instanceof Object))
                    throw new Error('definition must be an array of' + 'objects');
                keys = Object.keys(req);
                if (keys.length != 1)
                    throw new Error('definition entry must only have ' + 'one key');
                if (keys[0] in found)
                    throw new Error('Specified name already ' + 'specified: ' + keys[0]);
                if (!('type' in req[keys[0]]))
                    throw new Error('missing required type definition');
                key = ctParseType(req[keys[0]]['type']);
                while (key['len'] !== undefined) {
                    if (isNaN(parseInt(key['len'], 10))) {
                        if (!(key['len'] in found))
                            throw new Error('Given an array ' + 'length without a matching type');
                    }
                    key = ctParseType(key['type']);
                }
                if (!(key['type'] in types))
                    throw new Error('type not found or typdefed: ' + key['type']);
                if (fields !== undefined) {
                    for (jj = 0; jj < fields.length; jj++) {
                        if (!(fields[jj] in req[keys[0]]))
                            throw new Error('Missing required ' + 'field: ' + fields[jj]);
                    }
                }
                found[keys[0]] = true;
            }
        }
        function CTypeParser(conf) {
            if (!conf)
                throw new Error('missing required argument');
            if (!('endian' in conf))
                throw new Error('missing required endian value');
            if (conf['endian'] != 'big' && conf['endian'] != 'little')
                throw new Error('Invalid endian type');
            if ('char-type' in conf && (conf['char-type'] != 'uint8' && conf['char-type'] != 'int8'))
                throw new Error('invalid option for char-type: ' + conf['char-type']);
            this.endian = conf['endian'];
            this.types = ctGetBasicTypes();
            if ('char-type' in conf && conf['char-type'] == 'uint8')
                this.types['char'] = this.types['uint8_t'];
            if ('char-type' in conf && conf['char-type'] == 'int8')
                this.types['char'] = this.types['int8_t'];
        }
        CTypeParser.prototype.setEndian = function (endian) {
            if (endian != 'big' && endian != 'little')
                throw new Error('invalid endian type, must be big or ' + 'little');
            this.endian = endian;
        };
        CTypeParser.prototype.getEndian = function () {
            return this.endian;
        };
        CTypeParser.prototype.typedef = function (name, value) {
            var type;
            if (name === undefined)
                throw new (Error('missing required typedef argument: name'))();
            if (value === undefined)
                throw new (Error('missing required typedef argument: value'))();
            if (typeof name != 'string')
                throw new (Error('the name of a type must be a string'))();
            type = ctParseType(name);
            if (type['len'] !== undefined)
                throw new Error('Cannot have an array in the typedef name');
            if (name in this.types)
                throw new Error('typedef name already present: ' + name);
            if (typeof value != 'string' && !(value instanceof Array))
                throw new Error('typedef value must either be a string or ' + 'struct');
            if (typeof value == 'string') {
                type = ctParseType(value);
                if (type['len'] !== undefined) {
                    if (isNaN(parseInt(type['len'], 10)))
                        throw new (Error('typedef value must use ' + 'fixed size array when outside of a ' + 'struct'))();
                }
                this.types[name] = value;
            } else {
                ctCheckReq(value, this.types);
                this.types[name] = value;
            }
        };
        CTypeParser.prototype.lstypes = function () {
            var key;
            var ret = {};
            for (key in this.types) {
                if (key in deftypes)
                    continue;
                ret[key] = this.types[key];
            }
            return ret;
        };
        function ctResolveArray(str, values) {
            var ret = '';
            var type = ctParseType(str);
            while (type['len'] !== undefined) {
                if (isNaN(parseInt(type['len'], 10))) {
                    if (typeof values[type['len']] != 'number')
                        throw new Error('cannot sawp in non-number ' + 'for array value');
                    ret = '[' + values[type['len']] + ']' + ret;
                } else {
                    ret = '[' + type['len'] + ']' + ret;
                }
                type = ctParseType(type['type']);
            }
            ret = type['type'] + ret;
            return ret;
        }
        CTypeParser.prototype.resolveTypedef = function (type, dispatch, buffer, offset, value) {
            var pt;
            mod_assert.ok(type in this.types);
            if (typeof this.types[type] == 'string') {
                pt = ctParseType(this.types[type]);
                if (dispatch == 'read')
                    return this.readEntry(pt, buffer, offset);
                else if (dispatch == 'write')
                    return this.writeEntry(value, pt, buffer, offset);
                else
                    throw new Error('invalid dispatch type to ' + 'resolveTypedef');
            } else {
                if (dispatch == 'read')
                    return this.readStruct(this.types[type], buffer, offset);
                else if (dispatch == 'write')
                    return this.writeStruct(value, this.types[type], buffer, offset);
                else
                    throw new Error('invalid dispatch type to ' + 'resolveTypedef');
            }
        };
        CTypeParser.prototype.readEntry = function (type, buffer, offset) {
            var parse, len;
            if (type['len'] !== undefined) {
                len = parseInt(type['len'], 10);
                if (isNaN(len))
                    throw new Error('somehow got a non-numeric length');
                if (type['type'] == 'char')
                    parse = this.types['char[]']['read'](len, this.endian, buffer, offset);
                else
                    parse = this.readArray(type['type'], len, buffer, offset);
            } else {
                if (type['type'] in deftypes)
                    parse = this.types[type['type']]['read'](this.endian, buffer, offset);
                else
                    parse = this.resolveTypedef(type['type'], 'read', buffer, offset);
            }
            return parse;
        };
        CTypeParser.prototype.readArray = function (type, length, buffer, offset) {
            var ii, ent, pt;
            var baseOffset = offset;
            var ret = new Array(length);
            pt = ctParseType(type);
            for (ii = 0; ii < length; ii++) {
                ent = this.readEntry(pt, buffer, offset);
                offset += ent['size'];
                ret[ii] = ent['value'];
            }
            return {
                value: ret,
                size: offset - baseOffset
            };
        };
        CTypeParser.prototype.readStruct = function (def, buffer, offset) {
            var parse, ii, type, entry, key;
            var baseOffset = offset;
            var ret = {};
            for (ii = 0; ii < def.length; ii++) {
                key = Object.keys(def[ii])[0];
                entry = def[ii][key];
                type = ctParseType(ctResolveArray(entry['type'], ret));
                if ('offset' in entry)
                    offset = baseOffset + entry['offset'];
                parse = this.readEntry(type, buffer, offset);
                offset += parse['size'];
                ret[key] = parse['value'];
            }
            return {
                value: ret,
                size: offset - baseOffset
            };
        };
        CTypeParser.prototype.readData = function (def, buffer, offset) {
            if (def === undefined)
                throw new Error('missing definition for what we should be' + 'parsing');
            if (buffer === undefined)
                throw new Error('missing buffer for what we should be ' + 'parsing');
            if (offset === undefined)
                throw new Error('missing offset for what we should be ' + 'parsing');
            ctCheckReq(def, this.types);
            return this.readStruct(def, buffer, offset)['value'];
        };
        CTypeParser.prototype.writeArray = function (value, type, length, buffer, offset) {
            var ii, pt;
            var baseOffset = offset;
            if (!(value instanceof Array))
                throw new Error('asked to write an array, but value is not ' + 'an array');
            if (value.length != length)
                throw new Error('asked to write array of length ' + length + ' but that does not match value length: ' + value.length);
            pt = ctParseType(type);
            for (ii = 0; ii < length; ii++)
                offset += this.writeEntry(value[ii], pt, buffer, offset);
            return offset - baseOffset;
        };
        CTypeParser.prototype.writeEntry = function (value, type, buffer, offset) {
            var len, ret;
            if (type['len'] !== undefined) {
                len = parseInt(type['len'], 10);
                if (isNaN(len))
                    throw new Error('somehow got a non-numeric length');
                if (type['type'] == 'char')
                    ret = this.types['char[]']['write'](value, len, this.endian, buffer, offset);
                else
                    ret = this.writeArray(value, type['type'], len, buffer, offset);
            } else {
                if (type['type'] in deftypes)
                    ret = this.types[type['type']]['write'](value, this.endian, buffer, offset);
                else
                    ret = this.resolveTypedef(type['type'], 'write', buffer, offset, value);
            }
            return ret;
        };
        CTypeParser.prototype.writeStruct = function (value, def, buffer, offset) {
            var ii, entry, type, key;
            var baseOffset = offset;
            var vals = {};
            for (ii = 0; ii < def.length; ii++) {
                key = Object.keys(def[ii])[0];
                entry = def[ii][key];
                type = ctParseType(ctResolveArray(entry['type'], vals));
                if ('offset' in entry)
                    offset = baseOffset + entry['offset'];
                offset += this.writeEntry(value[ii], type, buffer, offset);
                vals[key] = value[ii];
            }
            return offset;
        };
        function getValues(def) {
            var ii, out, key;
            out = [];
            for (ii = 0; ii < def.length; ii++) {
                key = Object.keys(def[ii])[0];
                mod_assert.ok('value' in def[ii][key]);
                out.push(def[ii][key]['value']);
            }
            return out;
        }
        CTypeParser.prototype.writeData = function (def, buffer, offset, values) {
            var hv;
            if (def === undefined)
                throw new Error('missing definition for what we should be' + 'parsing');
            if (buffer === undefined)
                throw new Error('missing buffer for what we should be ' + 'parsing');
            if (offset === undefined)
                throw new Error('missing offset for what we should be ' + 'parsing');
            hv = values != null && values != undefined;
            if (hv) {
                if (!Array.isArray(values))
                    throw new Error('missing values for writing');
                ctCheckReq(def, this.types);
            } else {
                ctCheckReq(def, this.types, ['value']);
            }
            this.writeStruct(hv ? values : getValues(def), def, buffer, offset);
        };
        function toAbs64(val) {
            if (val === undefined)
                throw new Error('missing required arg: value');
            if (!Array.isArray(val))
                throw new Error('value must be an array');
            if (val.length != 2)
                throw new Error('value must be an array of length 2');
            if (val[0] >= 1048576)
                throw new Error('value would become approximated');
            return val[0] * Math.pow(2, 32) + val[1];
        }
        function toApprox64(val) {
            if (val === undefined)
                throw new Error('missing required arg: value');
            if (!Array.isArray(val))
                throw new Error('value must be an array');
            if (val.length != 2)
                throw new Error('value must be an array of length 2');
            return Math.pow(2, 32) * val[0] + val[1];
        }
        function parseCTF(json, conf) {
            var ctype = new CTypeParser(conf);
            mod_ctf.ctfParseJson(json, ctype);
            return ctype;
        }
        exports.Parser = CTypeParser;
        exports.toAbs64 = toAbs64;
        exports.toApprox64 = toApprox64;
        exports.parseCTF = parseCTF;
        exports.ruint8 = mod_ctio.ruint8;
        exports.ruint16 = mod_ctio.ruint16;
        exports.ruint32 = mod_ctio.ruint32;
        exports.ruint64 = mod_ctio.ruint64;
        exports.wuint8 = mod_ctio.wuint8;
        exports.wuint16 = mod_ctio.wuint16;
        exports.wuint32 = mod_ctio.wuint32;
        exports.wuint64 = mod_ctio.wuint64;
        exports.rsint8 = mod_ctio.rsint8;
        exports.rsint16 = mod_ctio.rsint16;
        exports.rsint32 = mod_ctio.rsint32;
        exports.rsint64 = mod_ctio.rsint64;
        exports.wsint8 = mod_ctio.wsint8;
        exports.wsint16 = mod_ctio.wsint16;
        exports.wsint32 = mod_ctio.wsint32;
        exports.wsint64 = mod_ctio.wsint64;
        exports.rfloat = mod_ctio.rfloat;
        exports.rdouble = mod_ctio.rdouble;
        exports.wfloat = mod_ctio.wfloat;
        exports.wdouble = mod_ctio.wdouble;
    },
    '1r': function (require, module, exports, global) {
        var mod_assert = null;
        var ASSERT = mod_assert.ok;
        var ctf_versions = ['1.0'];
        var ctf_entries = [
                'integer',
                'float',
                'typedef',
                'struct'
            ];
        var ctf_deftypes = [
                'int8_t',
                'uint8_t',
                'int16_t',
                'uint16_t',
                'int32_t',
                'uint32_t',
                'float',
                'double'
            ];
        function ctfParseInteger(entry, ctype) {
            var name, sign, len, type;
            name = entry['name'];
            if (!('signed' in entry['integer']))
                throw new Error('Malformed CTF JSON: integer missing ' + 'signed value');
            if (!('length' in entry['integer']))
                throw new Error('Malformed CTF JSON: integer missing ' + 'length value');
            sign = entry['integer']['signed'];
            len = entry['integer']['length'];
            type = null;
            if (sign && len == 1)
                type = 'int8_t';
            else if (len == 1)
                type = 'uint8_t';
            else if (sign && len == 2)
                type = 'int16_t';
            else if (len == 2)
                type = 'uint16_t';
            else if (sign && len == 4)
                type = 'int32_t';
            else if (len == 4)
                type = 'uint32_t';
            else if (sign && len == 8)
                type = 'int64_t';
            else if (len == 8)
                type = 'uint64_t';
            if (type === null)
                throw new Error('Malformed CTF JSON: integer has ' + 'unsupported length and sign - ' + len + '/' + sign);
            if (name == type)
                return;
            if (name == 'char') {
                ASSERT(type == 'int8_t');
                return;
            }
            ctype.typedef(name, type);
        }
        function ctfParseFloat(entry, ctype) {
            var name, len;
            name = entry['name'];
            if (!('length' in entry['float']))
                throw new Error('Malformed CTF JSON: float missing ' + 'length value');
            len = entry['float']['length'];
            if (len != 4 && len != 8)
                throw new Error('Malformed CTF JSON: float has invalid ' + 'length value');
            if (len == 4) {
                if (name == 'float')
                    return;
                ctype.typedef(name, 'float');
            } else if (len == 8) {
                if (name == 'double')
                    return;
                ctype.typedef(name, 'double');
            }
        }
        function ctfParseTypedef(entry, ctype) {
            var name, type, ii;
            name = entry['name'];
            if (typeof entry['typedef'] != 'string')
                throw new Error('Malformed CTF JSON: typedef value in not ' + 'a string');
            type = entry['typedef'];
            for (ii = 0; ii < ctf_deftypes.length; ii++) {
                if (name == ctf_deftypes[ii])
                    return;
            }
            ctype.typedef(name, type);
        }
        function ctfParseStruct(entry, ctype) {
            var name, type, ii, val, index, member, push;
            member = [];
            if (!Array.isArray(entry['struct']))
                throw new Error('Malformed CTF JSON: struct value is not ' + 'an array');
            for (ii = 0; ii < entry['struct'].length; ii++) {
                val = entry['struct'][ii];
                if (!('name' in val))
                    throw new Error('Malformed CTF JSON: struct member ' + 'missing name');
                if (!('type' in val))
                    throw new Error('Malformed CTF JSON: struct member ' + 'missing type');
                if (typeof val['name'] != 'string')
                    throw new Error('Malformed CTF JSON: struct member ' + 'name isn\'t a string');
                if (typeof val['type'] != 'string')
                    throw new Error('Malformed CTF JSON: struct member ' + 'type isn\'t a string');
                name = val['name'];
                type = val['type'];
                index = type.indexOf(' [');
                if (index != -1) {
                    type = type.substring(0, index) + type.substring(index + 1, type.length);
                }
                push = {};
                push[name] = { 'type': type };
                member.push(push);
            }
            name = entry['name'];
            ctype.typedef(name, member);
        }
        function ctfParseEntry(entry, ctype) {
            var ii, found;
            if (!('name' in entry))
                throw new Error('Malformed CTF JSON: entry missing "name" ' + 'section');
            for (ii = 0; ii < ctf_entries.length; ii++) {
                if (ctf_entries[ii] in entry)
                    found++;
            }
            if (found === 0)
                throw new Error('Malformed CTF JSON: found no entries');
            if (found >= 2)
                throw new Error('Malformed CTF JSON: found more than one ' + 'entry');
            if ('integer' in entry) {
                ctfParseInteger(entry, ctype);
                return;
            }
            if ('float' in entry) {
                ctfParseFloat(entry, ctype);
                return;
            }
            if ('typedef' in entry) {
                ctfParseTypedef(entry, ctype);
                return;
            }
            if ('struct' in entry) {
                ctfParseStruct(entry, ctype);
                return;
            }
            ASSERT(false, 'shouldn\'t reach here');
        }
        function ctfParseJson(json, ctype) {
            var version, ii;
            ASSERT(json);
            ASSERT(ctype);
            if (!('metadata' in json))
                throw new Error('Invalid CTF JSON: missing metadata section');
            if (!('ctf2json_version' in json['metadata']))
                throw new Error('Invalid CTF JSON: missing ctf2json_version');
            version = json['metadata']['ctf2json_version'];
            for (ii = 0; ii < ctf_versions.length; ii++) {
                if (ctf_versions[ii] == version)
                    break;
            }
            if (ii == ctf_versions.length)
                throw new Error('Unsuported ctf2json_version: ' + version);
            if (!('data' in json))
                throw new Error('Invalid CTF JSON: missing data section');
            if (!Array.isArray(json['data']))
                throw new Error('Malformed CTF JSON: data section is not ' + 'an array');
            for (ii = 0; ii < json['data'].length; ii++)
                ctfParseEntry(json['data'][ii], ctype);
        }
        exports.ctfParseJson = ctfParseJson;
    },
    '1s': function (require, module, exports, global) {
        var mod_assert = null;
        function ruint8(buffer, endian, offset) {
            if (endian === undefined)
                throw new Error('missing endian');
            if (buffer === undefined)
                throw new Error('missing buffer');
            if (offset === undefined)
                throw new Error('missing offset');
            if (offset >= buffer.length)
                throw new Error('Trying to read beyond buffer length');
            return buffer[offset];
        }
        function rgint16(buffer, endian, offset) {
            var val = 0;
            if (endian == 'big') {
                val = buffer[offset] << 8;
                val |= buffer[offset + 1];
            } else {
                val = buffer[offset];
                val |= buffer[offset + 1] << 8;
            }
            return val;
        }
        function ruint16(buffer, endian, offset) {
            if (endian === undefined)
                throw new Error('missing endian');
            if (buffer === undefined)
                throw new Error('missing buffer');
            if (offset === undefined)
                throw new Error('missing offset');
            if (offset + 1 >= buffer.length)
                throw new Error('Trying to read beyond buffer length');
            return rgint16(buffer, endian, offset);
        }
        function rgint32(buffer, endian, offset) {
            var val = 0;
            if (endian == 'big') {
                val = buffer[offset + 1] << 16;
                val |= buffer[offset + 2] << 8;
                val |= buffer[offset + 3];
                val = val + (buffer[offset] << 24 >>> 0);
            } else {
                val = buffer[offset + 2] << 16;
                val |= buffer[offset + 1] << 8;
                val |= buffer[offset];
                val = val + (buffer[offset + 3] << 24 >>> 0);
            }
            return val;
        }
        function ruint32(buffer, endian, offset) {
            if (endian === undefined)
                throw new Error('missing endian');
            if (buffer === undefined)
                throw new Error('missing buffer');
            if (offset === undefined)
                throw new Error('missing offset');
            if (offset + 3 >= buffer.length)
                throw new Error('Trying to read beyond buffer length');
            return rgint32(buffer, endian, offset);
        }
        function rgint64(buffer, endian, offset) {
            var val = new Array(2);
            if (endian == 'big') {
                val[0] = ruint32(buffer, endian, offset);
                val[1] = ruint32(buffer, endian, offset + 4);
            } else {
                val[0] = ruint32(buffer, endian, offset + 4);
                val[1] = ruint32(buffer, endian, offset);
            }
            return val;
        }
        function ruint64(buffer, endian, offset) {
            if (endian === undefined)
                throw new Error('missing endian');
            if (buffer === undefined)
                throw new Error('missing buffer');
            if (offset === undefined)
                throw new Error('missing offset');
            if (offset + 7 >= buffer.length)
                throw new Error('Trying to read beyond buffer length');
            return rgint64(buffer, endian, offset);
        }
        function rsint8(buffer, endian, offset) {
            var neg;
            if (endian === undefined)
                throw new Error('missing endian');
            if (buffer === undefined)
                throw new Error('missing buffer');
            if (offset === undefined)
                throw new Error('missing offset');
            if (offset >= buffer.length)
                throw new Error('Trying to read beyond buffer length');
            neg = buffer[offset] & 128;
            if (!neg)
                return buffer[offset];
            return (255 - buffer[offset] + 1) * -1;
        }
        function rsint16(buffer, endian, offset) {
            var neg, val;
            if (endian === undefined)
                throw new Error('missing endian');
            if (buffer === undefined)
                throw new Error('missing buffer');
            if (offset === undefined)
                throw new Error('missing offset');
            if (offset + 1 >= buffer.length)
                throw new Error('Trying to read beyond buffer length');
            val = rgint16(buffer, endian, offset);
            neg = val & 32768;
            if (!neg)
                return val;
            return (65535 - val + 1) * -1;
        }
        function rsint32(buffer, endian, offset) {
            var neg, val;
            if (endian === undefined)
                throw new Error('missing endian');
            if (buffer === undefined)
                throw new Error('missing buffer');
            if (offset === undefined)
                throw new Error('missing offset');
            if (offset + 3 >= buffer.length)
                throw new Error('Trying to read beyond buffer length');
            val = rgint32(buffer, endian, offset);
            neg = val & 2147483648;
            if (!neg)
                return val;
            return (4294967295 - val + 1) * -1;
        }
        function rsint64(buffer, endian, offset) {
            var neg, val;
            if (endian === undefined)
                throw new Error('missing endian');
            if (buffer === undefined)
                throw new Error('missing buffer');
            if (offset === undefined)
                throw new Error('missing offset');
            if (offset + 3 >= buffer.length)
                throw new Error('Trying to read beyond buffer length');
            val = rgint64(buffer, endian, offset);
            neg = val[0] & 2147483648;
            if (!neg)
                return val;
            val[0] = (4294967295 - val[0]) * -1;
            val[1] = (4294967295 - val[1] + 1) * -1;
            mod_assert.ok(val[1] <= 4294967296);
            if (val[1] == -4294967296) {
                val[1] = 0;
                val[0]--;
            }
            return val;
        }
        function rfloat(buffer, endian, offset) {
            var bytes = [];
            var sign, exponent, mantissa, val;
            var bias = 127;
            var maxexp = 255;
            if (endian === undefined)
                throw new Error('missing endian');
            if (buffer === undefined)
                throw new Error('missing buffer');
            if (offset === undefined)
                throw new Error('missing offset');
            if (offset + 3 >= buffer.length)
                throw new Error('Trying to read beyond buffer length');
            if (endian == 'big') {
                bytes[0] = buffer[offset];
                bytes[1] = buffer[offset + 1];
                bytes[2] = buffer[offset + 2];
                bytes[3] = buffer[offset + 3];
            } else {
                bytes[3] = buffer[offset];
                bytes[2] = buffer[offset + 1];
                bytes[1] = buffer[offset + 2];
                bytes[0] = buffer[offset + 3];
            }
            sign = bytes[0] & 128;
            exponent = (bytes[0] & 127) << 1;
            exponent |= (bytes[1] & 128) >>> 7;
            mantissa = (bytes[1] & 127) << 16;
            mantissa |= bytes[2] << 8;
            mantissa |= bytes[3];
            if (!sign && exponent == maxexp && mantissa === 0)
                return Number.POSITIVE_INFINITY;
            if (sign && exponent == maxexp && mantissa === 0)
                return Number.NEGATIVE_INFINITY;
            if (exponent == maxexp && mantissa !== 0)
                return Number.NaN;
            if (exponent === 0 && mantissa === 0)
                return 0;
            exponent -= bias;
            if (exponent == -bias) {
                exponent++;
                val = 0;
            } else {
                val = 1;
            }
            val = (val + mantissa * Math.pow(2, -23)) * Math.pow(2, exponent);
            if (sign)
                val *= -1;
            return val;
        }
        function rdouble(buffer, endian, offset) {
            var bytes = [];
            var sign, exponent, mantissa, val, lowmant;
            var bias = 1023;
            var maxexp = 2047;
            if (endian === undefined)
                throw new Error('missing endian');
            if (buffer === undefined)
                throw new Error('missing buffer');
            if (offset === undefined)
                throw new Error('missing offset');
            if (offset + 7 >= buffer.length)
                throw new Error('Trying to read beyond buffer length');
            if (endian == 'big') {
                bytes[0] = buffer[offset];
                bytes[1] = buffer[offset + 1];
                bytes[2] = buffer[offset + 2];
                bytes[3] = buffer[offset + 3];
                bytes[4] = buffer[offset + 4];
                bytes[5] = buffer[offset + 5];
                bytes[6] = buffer[offset + 6];
                bytes[7] = buffer[offset + 7];
            } else {
                bytes[7] = buffer[offset];
                bytes[6] = buffer[offset + 1];
                bytes[5] = buffer[offset + 2];
                bytes[4] = buffer[offset + 3];
                bytes[3] = buffer[offset + 4];
                bytes[2] = buffer[offset + 5];
                bytes[1] = buffer[offset + 6];
                bytes[0] = buffer[offset + 7];
            }
            sign = bytes[0] & 128;
            exponent = (bytes[0] & 127) << 4;
            exponent |= (bytes[1] & 240) >>> 4;
            lowmant = bytes[7];
            lowmant |= bytes[6] << 8;
            lowmant |= bytes[5] << 16;
            mantissa = bytes[4];
            mantissa |= bytes[3] << 8;
            mantissa |= bytes[2] << 16;
            mantissa |= (bytes[1] & 15) << 24;
            mantissa *= Math.pow(2, 24);
            mantissa += lowmant;
            if (!sign && exponent == maxexp && mantissa === 0)
                return Number.POSITIVE_INFINITY;
            if (sign && exponent == maxexp && mantissa === 0)
                return Number.NEGATIVE_INFINITY;
            if (exponent == maxexp && mantissa !== 0)
                return Number.NaN;
            if (exponent === 0 && mantissa === 0)
                return 0;
            exponent -= bias;
            if (exponent == -bias) {
                exponent++;
                val = 0;
            } else {
                val = 1;
            }
            val = (val + mantissa * Math.pow(2, -52)) * Math.pow(2, exponent);
            if (sign)
                val *= -1;
            return val;
        }
        function prepuint(value, max) {
            if (typeof value != 'number')
                throw new (Error('cannot write a non-number as a number'))();
            if (value < 0)
                throw new Error('specified a negative value for writing an ' + 'unsigned value');
            if (value > max)
                throw new Error('value is larger than maximum value for ' + 'type');
            if (Math.floor(value) !== value)
                throw new Error('value has a fractional component');
            return value;
        }
        function wuint8(value, endian, buffer, offset) {
            var val;
            if (value === undefined)
                throw new Error('missing value');
            if (endian === undefined)
                throw new Error('missing endian');
            if (buffer === undefined)
                throw new Error('missing buffer');
            if (offset === undefined)
                throw new Error('missing offset');
            if (offset >= buffer.length)
                throw new Error('Trying to read beyond buffer length');
            val = prepuint(value, 255);
            buffer[offset] = val;
        }
        function wgint16(val, endian, buffer, offset) {
            if (endian == 'big') {
                buffer[offset] = (val & 65280) >>> 8;
                buffer[offset + 1] = val & 255;
            } else {
                buffer[offset + 1] = (val & 65280) >>> 8;
                buffer[offset] = val & 255;
            }
        }
        function wuint16(value, endian, buffer, offset) {
            var val;
            if (value === undefined)
                throw new Error('missing value');
            if (endian === undefined)
                throw new Error('missing endian');
            if (buffer === undefined)
                throw new Error('missing buffer');
            if (offset === undefined)
                throw new Error('missing offset');
            if (offset + 1 >= buffer.length)
                throw new Error('Trying to read beyond buffer length');
            val = prepuint(value, 65535);
            wgint16(val, endian, buffer, offset);
        }
        function wgint32(val, endian, buffer, offset) {
            if (endian == 'big') {
                buffer[offset] = (val - (val & 16777215)) / Math.pow(2, 24);
                buffer[offset + 1] = val >>> 16 & 255;
                buffer[offset + 2] = val >>> 8 & 255;
                buffer[offset + 3] = val & 255;
            } else {
                buffer[offset + 3] = (val - (val & 16777215)) / Math.pow(2, 24);
                buffer[offset + 2] = val >>> 16 & 255;
                buffer[offset + 1] = val >>> 8 & 255;
                buffer[offset] = val & 255;
            }
        }
        function wuint32(value, endian, buffer, offset) {
            var val;
            if (value === undefined)
                throw new Error('missing value');
            if (endian === undefined)
                throw new Error('missing endian');
            if (buffer === undefined)
                throw new Error('missing buffer');
            if (offset === undefined)
                throw new Error('missing offset');
            if (offset + 3 >= buffer.length)
                throw new Error('Trying to read beyond buffer length');
            val = prepuint(value, 4294967295);
            wgint32(val, endian, buffer, offset);
        }
        function wgint64(value, endian, buffer, offset) {
            if (endian == 'big') {
                wgint32(value[0], endian, buffer, offset);
                wgint32(value[1], endian, buffer, offset + 4);
            } else {
                wgint32(value[0], endian, buffer, offset + 4);
                wgint32(value[1], endian, buffer, offset);
            }
        }
        function wuint64(value, endian, buffer, offset) {
            if (value === undefined)
                throw new Error('missing value');
            if (!(value instanceof Array))
                throw new Error('value must be an array');
            if (value.length != 2)
                throw new Error('value must be an array of length 2');
            if (endian === undefined)
                throw new Error('missing endian');
            if (buffer === undefined)
                throw new Error('missing buffer');
            if (offset === undefined)
                throw new Error('missing offset');
            if (offset + 7 >= buffer.length)
                throw new Error('Trying to read beyond buffer length');
            prepuint(value[0], 4294967295);
            prepuint(value[1], 4294967295);
            wgint64(value, endian, buffer, offset);
        }
        function prepsint(value, max, min) {
            if (typeof value != 'number')
                throw new (Error('cannot write a non-number as a number'))();
            if (value > max)
                throw new Error('value larger than maximum allowed value');
            if (value < min)
                throw new Error('value smaller than minimum allowed value');
            if (Math.floor(value) !== value)
                throw new Error('value has a fractional component');
            return value;
        }
        function wsint8(value, endian, buffer, offset) {
            var val;
            if (value === undefined)
                throw new Error('missing value');
            if (endian === undefined)
                throw new Error('missing endian');
            if (buffer === undefined)
                throw new Error('missing buffer');
            if (offset === undefined)
                throw new Error('missing offset');
            if (offset >= buffer.length)
                throw new Error('Trying to read beyond buffer length');
            val = prepsint(value, 127, -128);
            if (val >= 0)
                wuint8(val, endian, buffer, offset);
            else
                wuint8(255 + val + 1, endian, buffer, offset);
        }
        function wsint16(value, endian, buffer, offset) {
            var val;
            if (value === undefined)
                throw new Error('missing value');
            if (endian === undefined)
                throw new Error('missing endian');
            if (buffer === undefined)
                throw new Error('missing buffer');
            if (offset === undefined)
                throw new Error('missing offset');
            if (offset + 1 >= buffer.length)
                throw new Error('Trying to read beyond buffer length');
            val = prepsint(value, 32767, -32768);
            if (val >= 0)
                wgint16(val, endian, buffer, offset);
            else
                wgint16(65535 + val + 1, endian, buffer, offset);
        }
        function wsint32(value, endian, buffer, offset) {
            var val;
            if (value === undefined)
                throw new Error('missing value');
            if (endian === undefined)
                throw new Error('missing endian');
            if (buffer === undefined)
                throw new Error('missing buffer');
            if (offset === undefined)
                throw new Error('missing offset');
            if (offset + 3 >= buffer.length)
                throw new Error('Trying to read beyond buffer length');
            val = prepsint(value, 2147483647, -2147483648);
            if (val >= 0)
                wgint32(val, endian, buffer, offset);
            else
                wgint32(4294967295 + val + 1, endian, buffer, offset);
        }
        function wsint64(value, endian, buffer, offset) {
            var vzpos, vopos;
            var vals = new Array(2);
            if (value === undefined)
                throw new Error('missing value');
            if (!(value instanceof Array))
                throw new Error('value must be an array');
            if (value.length != 2)
                throw new Error('value must be an array of length 2');
            if (endian === undefined)
                throw new Error('missing endian');
            if (buffer === undefined)
                throw new Error('missing buffer');
            if (offset === undefined)
                throw new Error('missing offset');
            if (offset + 7 >= buffer.length)
                throw new Error('Trying to read beyond buffer length');
            vzpos = value[0] * Number.POSITIVE_INFINITY == Number.POSITIVE_INFINITY;
            vopos = value[1] * Number.POSITIVE_INFINITY == Number.POSITIVE_INFINITY;
            if (value[0] != 0 && value[1] != 0 && vzpos != vopos)
                throw new Error('Both entries in the array must have ' + 'the same sign');
            if (vzpos) {
                prepuint(value[0], 2147483647);
                prepuint(value[1], 4294967295);
            } else {
                prepsint(value[0], 0, -2147483648);
                prepsint(value[1], 0, -4294967295);
                if (value[0] == -2147483648 && value[1] != 0)
                    throw new Error('value smaller than minimum ' + 'allowed value');
            }
            if (value[0] < 0 || value[1] < 0) {
                vals[0] = 4294967295 - Math.abs(value[0]);
                vals[1] = 4294967296 - Math.abs(value[1]);
                if (vals[1] == 4294967296) {
                    vals[1] = 0;
                    vals[0]++;
                }
            } else {
                vals[0] = value[0];
                vals[1] = value[1];
            }
            wgint64(vals, endian, buffer, offset);
        }
        function log2(value) {
            return Math.log(value) / Math.log(2);
        }
        function intexp(value) {
            return Math.floor(log2(value));
        }
        function fracexp(value) {
            return Math.floor(log2(value));
        }
        function wfloat(value, endian, buffer, offset) {
            var sign, exponent, mantissa, ebits;
            var bytes = [];
            if (value === undefined)
                throw new Error('missing value');
            if (endian === undefined)
                throw new Error('missing endian');
            if (buffer === undefined)
                throw new Error('missing buffer');
            if (offset === undefined)
                throw new Error('missing offset');
            if (offset + 3 >= buffer.length)
                throw new Error('Trying to read beyond buffer length');
            if (isNaN(value)) {
                sign = 0;
                exponent = 255;
                mantissa = 23;
            } else if (value == Number.POSITIVE_INFINITY) {
                sign = 0;
                exponent = 255;
                mantissa = 0;
            } else if (value == Number.NEGATIVE_INFINITY) {
                sign = 1;
                exponent = 255;
                mantissa = 0;
            } else {
                if (value < 0) {
                    sign = 1;
                    value = Math.abs(value);
                } else {
                    sign = 0;
                }
                if (value < 1)
                    ebits = fracexp(value);
                else
                    ebits = intexp(value);
                if (ebits <= -127) {
                    exponent = 0;
                    mantissa = value * Math.pow(2, 149) & 8388607;
                } else {
                    exponent = 127 + ebits;
                    mantissa = value * Math.pow(2, 23 - ebits);
                    mantissa &= 8388607;
                }
            }
            bytes[0] = sign << 7 | (exponent & 254) >>> 1;
            bytes[1] = (exponent & 1) << 7 | (mantissa & 8323072) >>> 16;
            bytes[2] = (mantissa & 65280) >>> 8;
            bytes[3] = mantissa & 255;
            if (endian == 'big') {
                buffer[offset] = bytes[0];
                buffer[offset + 1] = bytes[1];
                buffer[offset + 2] = bytes[2];
                buffer[offset + 3] = bytes[3];
            } else {
                buffer[offset] = bytes[3];
                buffer[offset + 1] = bytes[2];
                buffer[offset + 2] = bytes[1];
                buffer[offset + 3] = bytes[0];
            }
        }
        function wdouble(value, endian, buffer, offset) {
            var sign, exponent, mantissa, ebits;
            var bytes = [];
            if (value === undefined)
                throw new Error('missing value');
            if (endian === undefined)
                throw new Error('missing endian');
            if (buffer === undefined)
                throw new Error('missing buffer');
            if (offset === undefined)
                throw new Error('missing offset');
            if (offset + 7 >= buffer.length)
                throw new Error('Trying to read beyond buffer length');
            if (isNaN(value)) {
                sign = 0;
                exponent = 2047;
                mantissa = 23;
            } else if (value == Number.POSITIVE_INFINITY) {
                sign = 0;
                exponent = 2047;
                mantissa = 0;
            } else if (value == Number.NEGATIVE_INFINITY) {
                sign = 1;
                exponent = 2047;
                mantissa = 0;
            } else {
                if (value < 0) {
                    sign = 1;
                    value = Math.abs(value);
                } else {
                    sign = 0;
                }
                if (value < 1)
                    ebits = fracexp(value);
                else
                    ebits = intexp(value);
                if (value <= 2.225073858507201e-308 || ebits <= -1023) {
                    exponent = 0;
                    mantissa = value * Math.pow(2, 1023) * Math.pow(2, 51);
                    mantissa %= Math.pow(2, 52);
                } else {
                    if (ebits > 1023)
                        ebits = 1023;
                    exponent = 1023 + ebits;
                    mantissa = value * Math.pow(2, -ebits);
                    mantissa *= Math.pow(2, 52);
                    mantissa %= Math.pow(2, 52);
                }
            }
            bytes[7] = mantissa & 255;
            bytes[6] = mantissa >>> 8 & 255;
            bytes[5] = mantissa >>> 16 & 255;
            mantissa = (mantissa - (mantissa & 16777215)) / Math.pow(2, 24);
            bytes[4] = mantissa & 255;
            bytes[3] = mantissa >>> 8 & 255;
            bytes[2] = mantissa >>> 16 & 255;
            bytes[1] = (exponent & 15) << 4 | mantissa >>> 24;
            bytes[0] = sign << 7 | (exponent & 2032) >>> 4;
            if (endian == 'big') {
                buffer[offset] = bytes[0];
                buffer[offset + 1] = bytes[1];
                buffer[offset + 2] = bytes[2];
                buffer[offset + 3] = bytes[3];
                buffer[offset + 4] = bytes[4];
                buffer[offset + 5] = bytes[5];
                buffer[offset + 6] = bytes[6];
                buffer[offset + 7] = bytes[7];
            } else {
                buffer[offset + 7] = bytes[0];
                buffer[offset + 6] = bytes[1];
                buffer[offset + 5] = bytes[2];
                buffer[offset + 4] = bytes[3];
                buffer[offset + 3] = bytes[4];
                buffer[offset + 2] = bytes[5];
                buffer[offset + 1] = bytes[6];
                buffer[offset] = bytes[7];
            }
        }
        exports.ruint8 = ruint8;
        exports.ruint16 = ruint16;
        exports.ruint32 = ruint32;
        exports.ruint64 = ruint64;
        exports.wuint8 = wuint8;
        exports.wuint16 = wuint16;
        exports.wuint32 = wuint32;
        exports.wuint64 = wuint64;
        exports.rsint8 = rsint8;
        exports.rsint16 = rsint16;
        exports.rsint32 = rsint32;
        exports.rsint64 = rsint64;
        exports.wsint8 = wsint8;
        exports.wsint16 = wsint16;
        exports.wsint32 = wsint32;
        exports.wsint64 = wsint64;
        exports.rfloat = rfloat;
        exports.rdouble = rdouble;
        exports.wfloat = wfloat;
        exports.wdouble = wdouble;
    },
    '1t': function (require, module, exports, global) {
        (function () {
            var _global = this;
            var _rng;
            if (typeof require == 'function') {
                try {
                    var _rb = null.randomBytes;
                    _rng = _rb && function () {
                        return _rb(16);
                    };
                } catch (e) {
                }
            }
            if (!_rng && _global.crypto && crypto.getRandomValues) {
                var _rnds8 = new Uint8Array(16);
                _rng = function whatwgRNG() {
                    crypto.getRandomValues(_rnds8);
                    return _rnds8;
                };
            }
            if (!_rng) {
                var _rnds = new Array(16);
                _rng = function () {
                    for (var i = 0, r; i < 16; i++) {
                        if ((i & 3) === 0)
                            r = Math.random() * 4294967296;
                        _rnds[i] = r >>> ((i & 3) << 3) & 255;
                    }
                    return _rnds;
                };
            }
            var BufferClass = typeof Buffer == 'function' ? Buffer : Array;
            var _byteToHex = [];
            var _hexToByte = {};
            for (var i = 0; i < 256; i++) {
                _byteToHex[i] = (i + 256).toString(16).substr(1);
                _hexToByte[_byteToHex[i]] = i;
            }
            function parse(s, buf, offset) {
                var i = buf && offset || 0, ii = 0;
                buf = buf || [];
                s.toLowerCase().replace(/[0-9a-f]{2}/g, function (oct) {
                    if (ii < 16) {
                        buf[i + ii++] = _hexToByte[oct];
                    }
                });
                while (ii < 16) {
                    buf[i + ii++] = 0;
                }
                return buf;
            }
            function unparse(buf, offset) {
                var i = offset || 0, bth = _byteToHex;
                return bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]] + '-' + bth[buf[i++]] + bth[buf[i++]] + '-' + bth[buf[i++]] + bth[buf[i++]] + '-' + bth[buf[i++]] + bth[buf[i++]] + '-' + bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]];
            }
            var _seedBytes = _rng();
            var _nodeId = [
                    _seedBytes[0] | 1,
                    _seedBytes[1],
                    _seedBytes[2],
                    _seedBytes[3],
                    _seedBytes[4],
                    _seedBytes[5]
                ];
            var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 16383;
            var _lastMSecs = 0, _lastNSecs = 0;
            function v1(options, buf, offset) {
                var i = buf && offset || 0;
                var b = buf || [];
                options = options || {};
                var clockseq = options.clockseq != null ? options.clockseq : _clockseq;
                var msecs = options.msecs != null ? options.msecs : new Date().getTime();
                var nsecs = options.nsecs != null ? options.nsecs : _lastNSecs + 1;
                var dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 10000;
                if (dt < 0 && options.clockseq == null) {
                    clockseq = clockseq + 1 & 16383;
                }
                if ((dt < 0 || msecs > _lastMSecs) && options.nsecs == null) {
                    nsecs = 0;
                }
                if (nsecs >= 10000) {
                    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
                }
                _lastMSecs = msecs;
                _lastNSecs = nsecs;
                _clockseq = clockseq;
                msecs += 12219292800000;
                var tl = ((msecs & 268435455) * 10000 + nsecs) % 4294967296;
                b[i++] = tl >>> 24 & 255;
                b[i++] = tl >>> 16 & 255;
                b[i++] = tl >>> 8 & 255;
                b[i++] = tl & 255;
                var tmh = msecs / 4294967296 * 10000 & 268435455;
                b[i++] = tmh >>> 8 & 255;
                b[i++] = tmh & 255;
                b[i++] = tmh >>> 24 & 15 | 16;
                b[i++] = tmh >>> 16 & 255;
                b[i++] = clockseq >>> 8 | 128;
                b[i++] = clockseq & 255;
                var node = options.node || _nodeId;
                for (var n = 0; n < 6; n++) {
                    b[i + n] = node[n];
                }
                return buf ? buf : unparse(b);
            }
            function v4(options, buf, offset) {
                var i = buf && offset || 0;
                if (typeof options == 'string') {
                    buf = options == 'binary' ? new BufferClass(16) : null;
                    options = null;
                }
                options = options || {};
                var rnds = options.random || (options.rng || _rng)();
                rnds[6] = rnds[6] & 15 | 64;
                rnds[8] = rnds[8] & 63 | 128;
                if (buf) {
                    for (var ii = 0; ii < 16; ii++) {
                        buf[i + ii] = rnds[ii];
                    }
                }
                return buf || unparse(rnds);
            }
            var uuid = v4;
            uuid.v1 = v1;
            uuid.v4 = v4;
            uuid.parse = parse;
            uuid.unparse = unparse;
            uuid.BufferClass = BufferClass;
            if (_global.define && define.amd) {
                define(function () {
                    return uuid;
                });
            } else if (typeof module != 'undefined' && module.exports) {
                module.exports = uuid;
            } else {
                var _previousRoot = _global.uuid;
                uuid.noConflict = function () {
                    _global.uuid = _previousRoot;
                    return uuid;
                };
                _global.uuid = uuid;
            }
        }());
    },
    '1u': function (require, module, exports, global) {
        var path = null;
        var fs = null;
        function Mime() {
            this.types = Object.create(null);
            this.extensions = Object.create(null);
        }
        Mime.prototype.define = function (map) {
            for (var type in map) {
                var exts = map[type];
                for (var i = 0; i < exts.length; i++) {
                    if (process.env.DEBUG_MIME && this.types[exts]) {
                        console.warn(this._loading.replace(/.*\//, ''), 'changes "' + exts[i] + '" extension type from ' + this.types[exts] + ' to ' + type);
                    }
                    this.types[exts[i]] = type;
                }
                if (!this.extensions[type]) {
                    this.extensions[type] = exts[0];
                }
            }
        };
        Mime.prototype.load = function (file) {
            this._loading = file;
            var map = {}, content = fs.readFileSync(file, 'ascii'), lines = content.split(/[\r\n]+/);
            lines.forEach(function (line) {
                var fields = line.replace(/\s*#.*|^\s*|\s*$/g, '').split(/\s+/);
                map[fields.shift()] = fields;
            });
            this.define(map);
            this._loading = null;
        };
        Mime.prototype.lookup = function (path, fallback) {
            var ext = path.replace(/.*[\.\/]/, '').toLowerCase();
            return this.types[ext] || fallback || this.default_type;
        };
        Mime.prototype.extension = function (mimeType) {
            return this.extensions[mimeType];
        };
        var mime = new Mime();
        mime.load(path.join(__dirname, 'types/mime.types'));
        mime.load(path.join(__dirname, 'types/node.types'));
        mime.default_type = mime.lookup('bin');
        mime.Mime = Mime;
        mime.charsets = {
            lookup: function (mimeType, fallback) {
                return /^text\//.test(mimeType) ? 'UTF-8' : fallback;
            }
        };
        module.exports = mime;
    },
    '1v': function (require, module, exports, global) {
        'use strict';
        var net = null, tls = null, http = null, https = null, events = null, assert = null, util = null;
        ;
        exports.httpOverHttp = httpOverHttp;
        exports.httpsOverHttp = httpsOverHttp;
        exports.httpOverHttps = httpOverHttps;
        exports.httpsOverHttps = httpsOverHttps;
        function httpOverHttp(options) {
            var agent = new TunnelingAgent(options);
            agent.request = http.request;
            return agent;
        }
        function httpsOverHttp(options) {
            var agent = new TunnelingAgent(options);
            agent.request = http.request;
            agent.createSocket = createSecureSocket;
            return agent;
        }
        function httpOverHttps(options) {
            var agent = new TunnelingAgent(options);
            agent.request = https.request;
            return agent;
        }
        function httpsOverHttps(options) {
            var agent = new TunnelingAgent(options);
            agent.request = https.request;
            agent.createSocket = createSecureSocket;
            return agent;
        }
        function TunnelingAgent(options) {
            var self = this;
            self.options = options || {};
            self.proxyOptions = self.options.proxy || {};
            self.maxSockets = self.options.maxSockets || http.Agent.defaultMaxSockets;
            self.requests = [];
            self.sockets = [];
            self.on('free', function onFree(socket, host, port) {
                for (var i = 0, len = self.requests.length; i < len; ++i) {
                    var pending = self.requests[i];
                    if (pending.host === host && pending.port === port) {
                        self.requests.splice(i, 1);
                        pending.request.onSocket(socket);
                        return;
                    }
                }
                socket.destroy();
                self.removeSocket(socket);
            });
        }
        util.inherits(TunnelingAgent, events.EventEmitter);
        TunnelingAgent.prototype.addRequest = function addRequest(req, host, port) {
            var self = this;
            if (self.sockets.length >= this.maxSockets) {
                self.requests.push({
                    host: host,
                    port: port,
                    request: req
                });
                return;
            }
            self.createSocket({
                host: host,
                port: port,
                request: req
            }, function (socket) {
                socket.on('free', onFree);
                socket.on('close', onCloseOrRemove);
                socket.on('agentRemove', onCloseOrRemove);
                req.onSocket(socket);
                function onFree() {
                    self.emit('free', socket, host, port);
                }
                function onCloseOrRemove(err) {
                    self.removeSocket();
                    socket.removeListener('free', onFree);
                    socket.removeListener('close', onCloseOrRemove);
                    socket.removeListener('agentRemove', onCloseOrRemove);
                }
            });
        };
        TunnelingAgent.prototype.createSocket = function createSocket(options, cb) {
            var self = this;
            var placeholder = {};
            self.sockets.push(placeholder);
            var connectOptions = mergeOptions({}, self.proxyOptions, {
                    method: 'CONNECT',
                    path: options.host + ':' + options.port,
                    agent: false
                });
            if (connectOptions.proxyAuth) {
                connectOptions.headers = connectOptions.headers || {};
                connectOptions.headers['Proxy-Authorization'] = 'Basic ' + new Buffer(connectOptions.proxyAuth).toString('base64');
            }
            debug('making CONNECT request');
            var connectReq = self.request(connectOptions);
            connectReq.useChunkedEncodingByDefault = false;
            connectReq.once('response', onResponse);
            connectReq.once('upgrade', onUpgrade);
            connectReq.once('connect', onConnect);
            connectReq.once('error', onError);
            connectReq.end();
            function onResponse(res) {
                res.upgrade = true;
            }
            function onUpgrade(res, socket, head) {
                process.nextTick(function () {
                    onConnect(res, socket, head);
                });
            }
            function onConnect(res, socket, head) {
                connectReq.removeAllListeners();
                socket.removeAllListeners();
                if (res.statusCode === 200) {
                    assert.equal(head.length, 0);
                    debug('tunneling connection has established');
                    self.sockets[self.sockets.indexOf(placeholder)] = socket;
                    cb(socket);
                } else {
                    debug('tunneling socket could not be established, statusCode=%d', res.statusCode);
                    var error = new Error('tunneling socket could not be established, ' + 'statusCode=' + res.statusCode);
                    error.code = 'ECONNRESET';
                    options.request.emit('error', error);
                    self.removeSocket(placeholder);
                }
            }
            function onError(cause) {
                connectReq.removeAllListeners();
                debug('tunneling socket could not be established, cause=%s\n', cause.message, cause.stack);
                var error = new Error('tunneling socket could not be established, ' + 'cause=' + cause.message);
                error.code = 'ECONNRESET';
                options.request.emit('error', error);
                self.removeSocket(placeholder);
            }
        };
        TunnelingAgent.prototype.removeSocket = function removeSocket(socket) {
            var pos = this.sockets.indexOf(socket);
            if (pos === -1)
                return;
            this.sockets.splice(pos, 1);
            var pending = this.requests.shift();
            if (pending) {
                this.createSocket(pending, function (socket) {
                    pending.request.onSocket(socket);
                });
            }
        };
        function createSecureSocket(options, cb) {
            var self = this;
            TunnelingAgent.prototype.createSocket.call(self, options, function (socket) {
                var secureSocket = tls.connect(0, mergeOptions({}, self.options, {
                        servername: options.host,
                        socket: socket
                    }));
                cb(secureSocket);
            });
        }
        function mergeOptions(target) {
            for (var i = 1, len = arguments.length; i < len; ++i) {
                var overrides = arguments[i];
                if (typeof overrides === 'object') {
                    var keys = Object.keys(overrides);
                    for (var j = 0, keyLen = keys.length; j < keyLen; ++j) {
                        var k = keys[j];
                        if (overrides[k] !== undefined) {
                            target[k] = overrides[k];
                        }
                    }
                }
            }
            return target;
        }
        var debug;
        if (process.env.NODE_DEBUG && /\btunnel\b/.test(process.env.NODE_DEBUG)) {
            debug = function () {
                var args = Array.prototype.slice.call(arguments);
                if (typeof args[0] === 'string') {
                    args[0] = 'TUNNEL: ' + args[0];
                } else {
                    args.unshift('TUNNEL:');
                }
                console.error.apply(console, args);
            };
        } else {
            debug = function () {
            };
        }
        exports.debug = debug;
    },
    '1w': function (require, module, exports, global) {
        module.exports = stringify;
        function getSerialize(fn) {
            var seen = [];
            return function (key, value) {
                var ret = value;
                if (typeof value === 'object' && value) {
                    if (seen.indexOf(value) !== -1)
                        ret = '[Circular]';
                    else
                        seen.push(value);
                }
                if (fn)
                    ret = fn(key, ret);
                return ret;
            };
        }
        function stringify(obj, fn, spaces) {
            return JSON.stringify(obj, getSerialize(fn), spaces);
        }
        stringify.getSerialize = getSerialize;
    },
    '1x': function (require, module, exports, global) {
        module.exports = ForeverAgent;
        ForeverAgent.SSL = ForeverAgentSSL;
        var util = null, Agent = null.Agent, net = null, tls = null, AgentSSL = null.Agent;
        function ForeverAgent(options) {
            var self = this;
            self.options = options || {};
            self.requests = {};
            self.sockets = {};
            self.freeSockets = {};
            self.maxSockets = self.options.maxSockets || Agent.defaultMaxSockets;
            self.minSockets = self.options.minSockets || ForeverAgent.defaultMinSockets;
            self.on('free', function (socket, host, port) {
                var name = host + ':' + port;
                if (self.requests[name] && self.requests[name].length) {
                    self.requests[name].shift().onSocket(socket);
                } else if (self.sockets[name].length < self.minSockets) {
                    if (!self.freeSockets[name])
                        self.freeSockets[name] = [];
                    self.freeSockets[name].push(socket);
                    function onIdleError() {
                        socket.destroy();
                    }
                    socket._onIdleError = onIdleError;
                    socket.on('error', onIdleError);
                } else {
                    socket.destroy();
                }
            });
        }
        util.inherits(ForeverAgent, Agent);
        ForeverAgent.defaultMinSockets = 5;
        ForeverAgent.prototype.createConnection = net.createConnection;
        ForeverAgent.prototype.addRequestNoreuse = Agent.prototype.addRequest;
        ForeverAgent.prototype.addRequest = function (req, host, port) {
            var name = host + ':' + port;
            if (this.freeSockets[name] && this.freeSockets[name].length > 0 && !req.useChunkedEncodingByDefault) {
                var idleSocket = this.freeSockets[name].pop();
                idleSocket.removeListener('error', idleSocket._onIdleError);
                delete idleSocket._onIdleError;
                req._reusedSocket = true;
                req.onSocket(idleSocket);
            } else {
                this.addRequestNoreuse(req, host, port);
            }
        };
        ForeverAgent.prototype.removeSocket = function (s, name, host, port) {
            if (this.sockets[name]) {
                var index = this.sockets[name].indexOf(s);
                if (index !== -1) {
                    this.sockets[name].splice(index, 1);
                }
            } else if (this.sockets[name] && this.sockets[name].length === 0) {
                delete this.sockets[name];
                delete this.requests[name];
            }
            if (this.freeSockets[name]) {
                var index = this.freeSockets[name].indexOf(s);
                if (index !== -1) {
                    this.freeSockets[name].splice(index, 1);
                    if (this.freeSockets[name].length === 0) {
                        delete this.freeSockets[name];
                    }
                }
            }
            if (this.requests[name] && this.requests[name].length) {
                this.createSocket(name, host, port).emit('free');
            }
        };
        function ForeverAgentSSL(options) {
            ForeverAgent.call(this, options);
        }
        util.inherits(ForeverAgentSSL, ForeverAgent);
        ForeverAgentSSL.prototype.createConnection = createConnectionSSL;
        ForeverAgentSSL.prototype.addRequestNoreuse = AgentSSL.prototype.addRequest;
        function createConnectionSSL(port, host, options) {
            options.port = port;
            options.host = host;
            return tls.connect(options);
        }
    },
    '1y': function (require, module, exports, global) {
        var CombinedStream = require('1z');
        var util = null;
        var path = null;
        var http = null;
        var https = null;
        var parseUrl = null.parse;
        var fs = null;
        var mime = require('1u');
        var async = require('21');
        module.exports = FormData;
        function FormData() {
            this._overheadLength = 0;
            this._valueLength = 0;
            this._lengthRetrievers = [];
            CombinedStream.call(this);
        }
        util.inherits(FormData, CombinedStream);
        FormData.LINE_BREAK = '\r\n';
        FormData.prototype.append = function (field, value, options) {
            options = options || {};
            var append = CombinedStream.prototype.append.bind(this);
            if (typeof value == 'number')
                value = '' + value;
            var header = this._multiPartHeader(field, value, options);
            var footer = this._multiPartFooter(field, value, options);
            append(header);
            append(value);
            append(footer);
            this._trackLength(header, value, options);
        };
        FormData.prototype._trackLength = function (header, value, options) {
            var valueLength = 0;
            if (options.knownLength != null) {
                valueLength += +options.knownLength;
            } else if (Buffer.isBuffer(value)) {
                valueLength = value.length;
            } else if (typeof value === 'string') {
                valueLength = Buffer.byteLength(value);
            }
            this._valueLength += valueLength;
            this._overheadLength += Buffer.byteLength(header) + +FormData.LINE_BREAK.length;
            if (!value || !value.path && !(value.readable && value.hasOwnProperty('httpVersion'))) {
                return;
            }
            this._lengthRetrievers.push(function (next) {
                if (options.knownLength != null) {
                    next(null, 0);
                } else if (value.hasOwnProperty('fd')) {
                    fs.stat(value.path, function (err, stat) {
                        if (err) {
                            next(err);
                            return;
                        }
                        next(null, stat.size);
                    });
                } else if (value.hasOwnProperty('httpVersion')) {
                    next(null, +value.headers['content-length']);
                } else if (value.hasOwnProperty('httpModule')) {
                    value.on('response', function (response) {
                        value.pause();
                        next(null, +response.headers['content-length']);
                    });
                    value.resume();
                } else {
                    next('Unknown stream');
                }
            });
        };
        FormData.prototype._multiPartHeader = function (field, value, options) {
            var boundary = this.getBoundary();
            var header = '';
            if (options.header != null) {
                header = options.header;
            } else {
                header += '--' + boundary + FormData.LINE_BREAK + 'Content-Disposition: form-data; name="' + field + '"';
                if (options.filename || value.path) {
                    header += '; filename="' + path.basename(options.filename || value.path) + '"' + FormData.LINE_BREAK + 'Content-Type: ' + (options.contentType || mime.lookup(options.filename || value.path));
                } else if (value.readable && value.hasOwnProperty('httpVersion')) {
                    header += '; filename="' + path.basename(value.client._httpMessage.path) + '"' + FormData.LINE_BREAK + 'Content-Type: ' + value.headers['content-type'];
                }
                header += FormData.LINE_BREAK + FormData.LINE_BREAK;
            }
            return header;
        };
        FormData.prototype._multiPartFooter = function (field, value, options) {
            return function (next) {
                var footer = FormData.LINE_BREAK;
                var lastPart = this._streams.length === 0;
                if (lastPart) {
                    footer += this._lastBoundary();
                }
                next(footer);
            }.bind(this);
        };
        FormData.prototype._lastBoundary = function () {
            return '--' + this.getBoundary() + '--';
        };
        FormData.prototype.getHeaders = function (userHeaders) {
            var formHeaders = { 'content-type': 'multipart/form-data; boundary=' + this.getBoundary() };
            for (var header in userHeaders) {
                formHeaders[header.toLowerCase()] = userHeaders[header];
            }
            return formHeaders;
        };
        FormData.prototype.getCustomHeaders = function (contentType) {
            contentType = contentType ? contentType : 'multipart/form-data';
            var formHeaders = {
                    'content-type': contentType + '; boundary=' + this.getBoundary(),
                    'content-length': this.getLengthSync()
                };
            return formHeaders;
        };
        FormData.prototype.getBoundary = function () {
            if (!this._boundary) {
                this._generateBoundary();
            }
            return this._boundary;
        };
        FormData.prototype._generateBoundary = function () {
            var boundary = '--------------------------';
            for (var i = 0; i < 24; i++) {
                boundary += Math.floor(Math.random() * 10).toString(16);
            }
            this._boundary = boundary;
        };
        FormData.prototype.getLengthSync = function () {
            var knownLength = this._overheadLength + this._valueLength;
            if (this._streams.length) {
                knownLength += this._lastBoundary().length;
            }
            return knownLength;
        };
        FormData.prototype.getLength = function (cb) {
            var knownLength = this._overheadLength + this._valueLength;
            if (this._streams.length) {
                knownLength += this._lastBoundary().length;
            }
            if (!this._lengthRetrievers.length) {
                process.nextTick(cb.bind(this, null, knownLength));
                return;
            }
            async.parallel(this._lengthRetrievers, function (err, values) {
                if (err) {
                    cb(err);
                    return;
                }
                values.forEach(function (length) {
                    knownLength += length;
                });
                cb(null, knownLength);
            });
        };
        FormData.prototype.submit = function (params, cb) {
            this.getLength(function (err, length) {
                var request, options, defaults = {
                        method: 'post',
                        port: 80,
                        headers: this.getHeaders({ 'Content-Length': length })
                    };
                if (typeof params == 'string') {
                    params = parseUrl(params);
                    options = populate({
                        port: params.port,
                        path: params.pathname,
                        host: params.hostname
                    }, defaults);
                } else {
                    options = populate(params, defaults);
                }
                if (params.protocol == 'https:') {
                    if (!params.port)
                        options.port = 443;
                    request = https.request(options);
                } else {
                    request = http.request(options);
                }
                this.pipe(request);
                if (cb) {
                    request.on('error', cb);
                    request.on('response', cb.bind(this, null));
                }
                return request;
            }.bind(this));
        };
        function populate(dst, src) {
            for (var prop in src) {
                if (!dst[prop])
                    dst[prop] = src[prop];
            }
            return dst;
        }
    },
    '1z': function (require, module, exports, global) {
        var util = null;
        var Stream = null.Stream;
        var DelayedStream = require('20');
        module.exports = CombinedStream;
        function CombinedStream() {
            this.writable = false;
            this.readable = true;
            this.dataSize = 0;
            this.maxDataSize = 2 * 1024 * 1024;
            this.pauseStreams = true;
            this._released = false;
            this._streams = [];
            this._currentStream = null;
        }
        util.inherits(CombinedStream, Stream);
        CombinedStream.create = function (options) {
            var combinedStream = new this();
            options = options || {};
            for (var option in options) {
                combinedStream[option] = options[option];
            }
            return combinedStream;
        };
        CombinedStream.isStreamLike = function (stream) {
            return typeof stream !== 'function' && typeof stream !== 'string' && typeof stream !== 'boolean' && typeof stream !== 'number' && !Buffer.isBuffer(stream);
        };
        CombinedStream.prototype.append = function (stream) {
            var isStreamLike = CombinedStream.isStreamLike(stream);
            if (isStreamLike) {
                if (!(stream instanceof DelayedStream)) {
                    stream.on('data', this._checkDataSize.bind(this));
                    stream = DelayedStream.create(stream, {
                        maxDataSize: Infinity,
                        pauseStream: this.pauseStreams
                    });
                }
                this._handleErrors(stream);
                if (this.pauseStreams) {
                    stream.pause();
                }
            }
            this._streams.push(stream);
            return this;
        };
        CombinedStream.prototype.pipe = function (dest, options) {
            Stream.prototype.pipe.call(this, dest, options);
            this.resume();
        };
        CombinedStream.prototype._getNext = function () {
            this._currentStream = null;
            var stream = this._streams.shift();
            if (typeof stream == 'undefined') {
                this.end();
                return;
            }
            if (typeof stream !== 'function') {
                this._pipeNext(stream);
                return;
            }
            var getStream = stream;
            getStream(function (stream) {
                var isStreamLike = CombinedStream.isStreamLike(stream);
                if (isStreamLike) {
                    stream.on('data', this._checkDataSize.bind(this));
                    this._handleErrors(stream);
                }
                this._pipeNext(stream);
            }.bind(this));
        };
        CombinedStream.prototype._pipeNext = function (stream) {
            this._currentStream = stream;
            var isStreamLike = CombinedStream.isStreamLike(stream);
            if (isStreamLike) {
                stream.on('end', this._getNext.bind(this));
                stream.pipe(this, { end: false });
                return;
            }
            var value = stream;
            this.write(value);
            this._getNext();
        };
        CombinedStream.prototype._handleErrors = function (stream) {
            var self = this;
            stream.on('error', function (err) {
                self._emitError(err);
            });
        };
        CombinedStream.prototype.write = function (data) {
            this.emit('data', data);
        };
        CombinedStream.prototype.pause = function () {
            if (!this.pauseStreams) {
                return;
            }
            this.emit('pause');
        };
        CombinedStream.prototype.resume = function () {
            if (!this._released) {
                this._released = true;
                this.writable = true;
                this._getNext();
            }
            this.emit('resume');
        };
        CombinedStream.prototype.end = function () {
            this._reset();
            this.emit('end');
        };
        CombinedStream.prototype.destroy = function () {
            this._reset();
            this.emit('close');
        };
        CombinedStream.prototype._reset = function () {
            this.writable = false;
            this._streams = [];
            this._currentStream = null;
        };
        CombinedStream.prototype._checkDataSize = function () {
            this._updateDataSize();
            if (this.dataSize <= this.maxDataSize) {
                return;
            }
            var message = 'DelayedStream#maxDataSize of ' + this.maxDataSize + ' bytes exceeded.';
            this._emitError(new Error(message));
        };
        CombinedStream.prototype._updateDataSize = function () {
            this.dataSize = 0;
            var self = this;
            this._streams.forEach(function (stream) {
                if (!stream.dataSize) {
                    return;
                }
                self.dataSize += stream.dataSize;
            });
            if (this._currentStream && this._currentStream.dataSize) {
                this.dataSize += this._currentStream.dataSize;
            }
        };
        CombinedStream.prototype._emitError = function (err) {
            this._reset();
            this.emit('error', err);
        };
    },
    '20': function (require, module, exports, global) {
        var Stream = null.Stream;
        var util = null;
        module.exports = DelayedStream;
        function DelayedStream() {
            this.source = null;
            this.dataSize = 0;
            this.maxDataSize = 1024 * 1024;
            this.pauseStream = true;
            this._maxDataSizeExceeded = false;
            this._released = false;
            this._bufferedEvents = [];
        }
        util.inherits(DelayedStream, Stream);
        DelayedStream.create = function (source, options) {
            var delayedStream = new this();
            options = options || {};
            for (var option in options) {
                delayedStream[option] = options[option];
            }
            delayedStream.source = source;
            var realEmit = source.emit;
            source.emit = function () {
                delayedStream._handleEmit(arguments);
                return realEmit.apply(source, arguments);
            };
            source.on('error', function () {
            });
            if (delayedStream.pauseStream) {
                source.pause();
            }
            return delayedStream;
        };
        DelayedStream.prototype.__defineGetter__('readable', function () {
            return this.source.readable;
        });
        DelayedStream.prototype.resume = function () {
            if (!this._released) {
                this.release();
            }
            this.source.resume();
        };
        DelayedStream.prototype.pause = function () {
            this.source.pause();
        };
        DelayedStream.prototype.release = function () {
            this._released = true;
            this._bufferedEvents.forEach(function (args) {
                this.emit.apply(this, args);
            }.bind(this));
            this._bufferedEvents = [];
        };
        DelayedStream.prototype.pipe = function () {
            var r = Stream.prototype.pipe.apply(this, arguments);
            this.resume();
            return r;
        };
        DelayedStream.prototype._handleEmit = function (args) {
            if (this._released) {
                this.emit.apply(this, args);
                return;
            }
            if (args[0] === 'data') {
                this.dataSize += args[1].length;
                this._checkIfMaxDataSizeExceeded();
            }
            this._bufferedEvents.push(args);
        };
        DelayedStream.prototype._checkIfMaxDataSizeExceeded = function () {
            if (this._maxDataSizeExceeded) {
                return;
            }
            if (this.dataSize <= this.maxDataSize) {
                return;
            }
            this._maxDataSizeExceeded = true;
            var message = 'DelayedStream#maxDataSize of ' + this.maxDataSize + ' bytes exceeded.';
            this.emit('error', new Error(message));
        };
    },
    '21': function (require, module, exports, global) {
        (function () {
            var async = {};
            var root, previous_async;
            root = this;
            if (root != null) {
                previous_async = root.async;
            }
            async.noConflict = function () {
                root.async = previous_async;
                return async;
            };
            function only_once(fn) {
                var called = false;
                return function () {
                    if (called)
                        throw new Error('Callback was already called.');
                    called = true;
                    fn.apply(root, arguments);
                };
            }
            var _each = function (arr, iterator) {
                if (arr.forEach) {
                    return arr.forEach(iterator);
                }
                for (var i = 0; i < arr.length; i += 1) {
                    iterator(arr[i], i, arr);
                }
            };
            var _map = function (arr, iterator) {
                if (arr.map) {
                    return arr.map(iterator);
                }
                var results = [];
                _each(arr, function (x, i, a) {
                    results.push(iterator(x, i, a));
                });
                return results;
            };
            var _reduce = function (arr, iterator, memo) {
                if (arr.reduce) {
                    return arr.reduce(iterator, memo);
                }
                _each(arr, function (x, i, a) {
                    memo = iterator(memo, x, i, a);
                });
                return memo;
            };
            var _keys = function (obj) {
                if (Object.keys) {
                    return Object.keys(obj);
                }
                var keys = [];
                for (var k in obj) {
                    if (obj.hasOwnProperty(k)) {
                        keys.push(k);
                    }
                }
                return keys;
            };
            if (typeof process === 'undefined' || !process.nextTick) {
                if (typeof setImmediate === 'function') {
                    async.nextTick = function (fn) {
                        setImmediate(fn);
                    };
                    async.setImmediate = async.nextTick;
                } else {
                    async.nextTick = function (fn) {
                        setTimeout(fn, 0);
                    };
                    async.setImmediate = async.nextTick;
                }
            } else {
                async.nextTick = process.nextTick;
                if (typeof setImmediate !== 'undefined') {
                    async.setImmediate = setImmediate;
                } else {
                    async.setImmediate = async.nextTick;
                }
            }
            async.each = function (arr, iterator, callback) {
                callback = callback || function () {
                };
                if (!arr.length) {
                    return callback();
                }
                var completed = 0;
                _each(arr, function (x) {
                    iterator(x, only_once(function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {
                            };
                        } else {
                            completed += 1;
                            if (completed >= arr.length) {
                                callback(null);
                            }
                        }
                    }));
                });
            };
            async.forEach = async.each;
            async.eachSeries = function (arr, iterator, callback) {
                callback = callback || function () {
                };
                if (!arr.length) {
                    return callback();
                }
                var completed = 0;
                var iterate = function () {
                    iterator(arr[completed], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {
                            };
                        } else {
                            completed += 1;
                            if (completed >= arr.length) {
                                callback(null);
                            } else {
                                iterate();
                            }
                        }
                    });
                };
                iterate();
            };
            async.forEachSeries = async.eachSeries;
            async.eachLimit = function (arr, limit, iterator, callback) {
                var fn = _eachLimit(limit);
                fn.apply(null, [
                    arr,
                    iterator,
                    callback
                ]);
            };
            async.forEachLimit = async.eachLimit;
            var _eachLimit = function (limit) {
                return function (arr, iterator, callback) {
                    callback = callback || function () {
                    };
                    if (!arr.length || limit <= 0) {
                        return callback();
                    }
                    var completed = 0;
                    var started = 0;
                    var running = 0;
                    (function replenish() {
                        if (completed >= arr.length) {
                            return callback();
                        }
                        while (running < limit && started < arr.length) {
                            started += 1;
                            running += 1;
                            iterator(arr[started - 1], function (err) {
                                if (err) {
                                    callback(err);
                                    callback = function () {
                                    };
                                } else {
                                    completed += 1;
                                    running -= 1;
                                    if (completed >= arr.length) {
                                        callback();
                                    } else {
                                        replenish();
                                    }
                                }
                            });
                        }
                    }());
                };
            };
            var doParallel = function (fn) {
                return function () {
                    var args = Array.prototype.slice.call(arguments);
                    return fn.apply(null, [async.each].concat(args));
                };
            };
            var doParallelLimit = function (limit, fn) {
                return function () {
                    var args = Array.prototype.slice.call(arguments);
                    return fn.apply(null, [_eachLimit(limit)].concat(args));
                };
            };
            var doSeries = function (fn) {
                return function () {
                    var args = Array.prototype.slice.call(arguments);
                    return fn.apply(null, [async.eachSeries].concat(args));
                };
            };
            var _asyncMap = function (eachfn, arr, iterator, callback) {
                var results = [];
                arr = _map(arr, function (x, i) {
                    return {
                        index: i,
                        value: x
                    };
                });
                eachfn(arr, function (x, callback) {
                    iterator(x.value, function (err, v) {
                        results[x.index] = v;
                        callback(err);
                    });
                }, function (err) {
                    callback(err, results);
                });
            };
            async.map = doParallel(_asyncMap);
            async.mapSeries = doSeries(_asyncMap);
            async.mapLimit = function (arr, limit, iterator, callback) {
                return _mapLimit(limit)(arr, iterator, callback);
            };
            var _mapLimit = function (limit) {
                return doParallelLimit(limit, _asyncMap);
            };
            async.reduce = function (arr, memo, iterator, callback) {
                async.eachSeries(arr, function (x, callback) {
                    iterator(memo, x, function (err, v) {
                        memo = v;
                        callback(err);
                    });
                }, function (err) {
                    callback(err, memo);
                });
            };
            async.inject = async.reduce;
            async.foldl = async.reduce;
            async.reduceRight = function (arr, memo, iterator, callback) {
                var reversed = _map(arr, function (x) {
                        return x;
                    }).reverse();
                async.reduce(reversed, memo, iterator, callback);
            };
            async.foldr = async.reduceRight;
            var _filter = function (eachfn, arr, iterator, callback) {
                var results = [];
                arr = _map(arr, function (x, i) {
                    return {
                        index: i,
                        value: x
                    };
                });
                eachfn(arr, function (x, callback) {
                    iterator(x.value, function (v) {
                        if (v) {
                            results.push(x);
                        }
                        callback();
                    });
                }, function (err) {
                    callback(_map(results.sort(function (a, b) {
                        return a.index - b.index;
                    }), function (x) {
                        return x.value;
                    }));
                });
            };
            async.filter = doParallel(_filter);
            async.filterSeries = doSeries(_filter);
            async.select = async.filter;
            async.selectSeries = async.filterSeries;
            var _reject = function (eachfn, arr, iterator, callback) {
                var results = [];
                arr = _map(arr, function (x, i) {
                    return {
                        index: i,
                        value: x
                    };
                });
                eachfn(arr, function (x, callback) {
                    iterator(x.value, function (v) {
                        if (!v) {
                            results.push(x);
                        }
                        callback();
                    });
                }, function (err) {
                    callback(_map(results.sort(function (a, b) {
                        return a.index - b.index;
                    }), function (x) {
                        return x.value;
                    }));
                });
            };
            async.reject = doParallel(_reject);
            async.rejectSeries = doSeries(_reject);
            var _detect = function (eachfn, arr, iterator, main_callback) {
                eachfn(arr, function (x, callback) {
                    iterator(x, function (result) {
                        if (result) {
                            main_callback(x);
                            main_callback = function () {
                            };
                        } else {
                            callback();
                        }
                    });
                }, function (err) {
                    main_callback();
                });
            };
            async.detect = doParallel(_detect);
            async.detectSeries = doSeries(_detect);
            async.some = function (arr, iterator, main_callback) {
                async.each(arr, function (x, callback) {
                    iterator(x, function (v) {
                        if (v) {
                            main_callback(true);
                            main_callback = function () {
                            };
                        }
                        callback();
                    });
                }, function (err) {
                    main_callback(false);
                });
            };
            async.any = async.some;
            async.every = function (arr, iterator, main_callback) {
                async.each(arr, function (x, callback) {
                    iterator(x, function (v) {
                        if (!v) {
                            main_callback(false);
                            main_callback = function () {
                            };
                        }
                        callback();
                    });
                }, function (err) {
                    main_callback(true);
                });
            };
            async.all = async.every;
            async.sortBy = function (arr, iterator, callback) {
                async.map(arr, function (x, callback) {
                    iterator(x, function (err, criteria) {
                        if (err) {
                            callback(err);
                        } else {
                            callback(null, {
                                value: x,
                                criteria: criteria
                            });
                        }
                    });
                }, function (err, results) {
                    if (err) {
                        return callback(err);
                    } else {
                        var fn = function (left, right) {
                            var a = left.criteria, b = right.criteria;
                            return a < b ? -1 : a > b ? 1 : 0;
                        };
                        callback(null, _map(results.sort(fn), function (x) {
                            return x.value;
                        }));
                    }
                });
            };
            async.auto = function (tasks, callback) {
                callback = callback || function () {
                };
                var keys = _keys(tasks);
                if (!keys.length) {
                    return callback(null);
                }
                var results = {};
                var listeners = [];
                var addListener = function (fn) {
                    listeners.unshift(fn);
                };
                var removeListener = function (fn) {
                    for (var i = 0; i < listeners.length; i += 1) {
                        if (listeners[i] === fn) {
                            listeners.splice(i, 1);
                            return;
                        }
                    }
                };
                var taskComplete = function () {
                    _each(listeners.slice(0), function (fn) {
                        fn();
                    });
                };
                addListener(function () {
                    if (_keys(results).length === keys.length) {
                        callback(null, results);
                        callback = function () {
                        };
                    }
                });
                _each(keys, function (k) {
                    var task = tasks[k] instanceof Function ? [tasks[k]] : tasks[k];
                    var taskCallback = function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        if (err) {
                            var safeResults = {};
                            _each(_keys(results), function (rkey) {
                                safeResults[rkey] = results[rkey];
                            });
                            safeResults[k] = args;
                            callback(err, safeResults);
                            callback = function () {
                            };
                        } else {
                            results[k] = args;
                            async.setImmediate(taskComplete);
                        }
                    };
                    var requires = task.slice(0, Math.abs(task.length - 1)) || [];
                    var ready = function () {
                        return _reduce(requires, function (a, x) {
                            return a && results.hasOwnProperty(x);
                        }, true) && !results.hasOwnProperty(k);
                    };
                    if (ready()) {
                        task[task.length - 1](taskCallback, results);
                    } else {
                        var listener = function () {
                            if (ready()) {
                                removeListener(listener);
                                task[task.length - 1](taskCallback, results);
                            }
                        };
                        addListener(listener);
                    }
                });
            };
            async.waterfall = function (tasks, callback) {
                callback = callback || function () {
                };
                if (tasks.constructor !== Array) {
                    var err = new Error('First argument to waterfall must be an array of functions');
                    return callback(err);
                }
                if (!tasks.length) {
                    return callback();
                }
                var wrapIterator = function (iterator) {
                    return function (err) {
                        if (err) {
                            callback.apply(null, arguments);
                            callback = function () {
                            };
                        } else {
                            var args = Array.prototype.slice.call(arguments, 1);
                            var next = iterator.next();
                            if (next) {
                                args.push(wrapIterator(next));
                            } else {
                                args.push(callback);
                            }
                            async.setImmediate(function () {
                                iterator.apply(null, args);
                            });
                        }
                    };
                };
                wrapIterator(async.iterator(tasks))();
            };
            var _parallel = function (eachfn, tasks, callback) {
                callback = callback || function () {
                };
                if (tasks.constructor === Array) {
                    eachfn.map(tasks, function (fn, callback) {
                        if (fn) {
                            fn(function (err) {
                                var args = Array.prototype.slice.call(arguments, 1);
                                if (args.length <= 1) {
                                    args = args[0];
                                }
                                callback.call(null, err, args);
                            });
                        }
                    }, callback);
                } else {
                    var results = {};
                    eachfn.each(_keys(tasks), function (k, callback) {
                        tasks[k](function (err) {
                            var args = Array.prototype.slice.call(arguments, 1);
                            if (args.length <= 1) {
                                args = args[0];
                            }
                            results[k] = args;
                            callback(err);
                        });
                    }, function (err) {
                        callback(err, results);
                    });
                }
            };
            async.parallel = function (tasks, callback) {
                _parallel({
                    map: async.map,
                    each: async.each
                }, tasks, callback);
            };
            async.parallelLimit = function (tasks, limit, callback) {
                _parallel({
                    map: _mapLimit(limit),
                    each: _eachLimit(limit)
                }, tasks, callback);
            };
            async.series = function (tasks, callback) {
                callback = callback || function () {
                };
                if (tasks.constructor === Array) {
                    async.mapSeries(tasks, function (fn, callback) {
                        if (fn) {
                            fn(function (err) {
                                var args = Array.prototype.slice.call(arguments, 1);
                                if (args.length <= 1) {
                                    args = args[0];
                                }
                                callback.call(null, err, args);
                            });
                        }
                    }, callback);
                } else {
                    var results = {};
                    async.eachSeries(_keys(tasks), function (k, callback) {
                        tasks[k](function (err) {
                            var args = Array.prototype.slice.call(arguments, 1);
                            if (args.length <= 1) {
                                args = args[0];
                            }
                            results[k] = args;
                            callback(err);
                        });
                    }, function (err) {
                        callback(err, results);
                    });
                }
            };
            async.iterator = function (tasks) {
                var makeCallback = function (index) {
                    var fn = function () {
                        if (tasks.length) {
                            tasks[index].apply(null, arguments);
                        }
                        return fn.next();
                    };
                    fn.next = function () {
                        return index < tasks.length - 1 ? makeCallback(index + 1) : null;
                    };
                    return fn;
                };
                return makeCallback(0);
            };
            async.apply = function (fn) {
                var args = Array.prototype.slice.call(arguments, 1);
                return function () {
                    return fn.apply(null, args.concat(Array.prototype.slice.call(arguments)));
                };
            };
            var _concat = function (eachfn, arr, fn, callback) {
                var r = [];
                eachfn(arr, function (x, cb) {
                    fn(x, function (err, y) {
                        r = r.concat(y || []);
                        cb(err);
                    });
                }, function (err) {
                    callback(err, r);
                });
            };
            async.concat = doParallel(_concat);
            async.concatSeries = doSeries(_concat);
            async.whilst = function (test, iterator, callback) {
                if (test()) {
                    iterator(function (err) {
                        if (err) {
                            return callback(err);
                        }
                        async.whilst(test, iterator, callback);
                    });
                } else {
                    callback();
                }
            };
            async.doWhilst = function (iterator, test, callback) {
                iterator(function (err) {
                    if (err) {
                        return callback(err);
                    }
                    if (test()) {
                        async.doWhilst(iterator, test, callback);
                    } else {
                        callback();
                    }
                });
            };
            async.until = function (test, iterator, callback) {
                if (!test()) {
                    iterator(function (err) {
                        if (err) {
                            return callback(err);
                        }
                        async.until(test, iterator, callback);
                    });
                } else {
                    callback();
                }
            };
            async.doUntil = function (iterator, test, callback) {
                iterator(function (err) {
                    if (err) {
                        return callback(err);
                    }
                    if (!test()) {
                        async.doUntil(iterator, test, callback);
                    } else {
                        callback();
                    }
                });
            };
            async.queue = function (worker, concurrency) {
                if (concurrency === undefined) {
                    concurrency = 1;
                }
                function _insert(q, data, pos, callback) {
                    if (data.constructor !== Array) {
                        data = [data];
                    }
                    _each(data, function (task) {
                        var item = {
                                data: task,
                                callback: typeof callback === 'function' ? callback : null
                            };
                        if (pos) {
                            q.tasks.unshift(item);
                        } else {
                            q.tasks.push(item);
                        }
                        if (q.saturated && q.tasks.length === concurrency) {
                            q.saturated();
                        }
                        async.setImmediate(q.process);
                    });
                }
                var workers = 0;
                var q = {
                        tasks: [],
                        concurrency: concurrency,
                        saturated: null,
                        empty: null,
                        drain: null,
                        push: function (data, callback) {
                            _insert(q, data, false, callback);
                        },
                        unshift: function (data, callback) {
                            _insert(q, data, true, callback);
                        },
                        process: function () {
                            if (workers < q.concurrency && q.tasks.length) {
                                var task = q.tasks.shift();
                                if (q.empty && q.tasks.length === 0) {
                                    q.empty();
                                }
                                workers += 1;
                                var next = function () {
                                    workers -= 1;
                                    if (task.callback) {
                                        task.callback.apply(task, arguments);
                                    }
                                    if (q.drain && q.tasks.length + workers === 0) {
                                        q.drain();
                                    }
                                    q.process();
                                };
                                var cb = only_once(next);
                                worker(task.data, cb);
                            }
                        },
                        length: function () {
                            return q.tasks.length;
                        },
                        running: function () {
                            return workers;
                        }
                    };
                return q;
            };
            async.cargo = function (worker, payload) {
                var working = false, tasks = [];
                var cargo = {
                        tasks: tasks,
                        payload: payload,
                        saturated: null,
                        empty: null,
                        drain: null,
                        push: function (data, callback) {
                            if (data.constructor !== Array) {
                                data = [data];
                            }
                            _each(data, function (task) {
                                tasks.push({
                                    data: task,
                                    callback: typeof callback === 'function' ? callback : null
                                });
                                if (cargo.saturated && tasks.length === payload) {
                                    cargo.saturated();
                                }
                            });
                            async.setImmediate(cargo.process);
                        },
                        process: function process() {
                            if (working)
                                return;
                            if (tasks.length === 0) {
                                if (cargo.drain)
                                    cargo.drain();
                                return;
                            }
                            var ts = typeof payload === 'number' ? tasks.splice(0, payload) : tasks.splice(0);
                            var ds = _map(ts, function (task) {
                                    return task.data;
                                });
                            if (cargo.empty)
                                cargo.empty();
                            working = true;
                            worker(ds, function () {
                                working = false;
                                var args = arguments;
                                _each(ts, function (data) {
                                    if (data.callback) {
                                        data.callback.apply(null, args);
                                    }
                                });
                                process();
                            });
                        },
                        length: function () {
                            return tasks.length;
                        },
                        running: function () {
                            return working;
                        }
                    };
                return cargo;
            };
            var _console_fn = function (name) {
                return function (fn) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    fn.apply(null, args.concat([function (err) {
                            var args = Array.prototype.slice.call(arguments, 1);
                            if (typeof console !== 'undefined') {
                                if (err) {
                                    if (console.error) {
                                        console.error(err);
                                    }
                                } else if (console[name]) {
                                    _each(args, function (x) {
                                        console[name](x);
                                    });
                                }
                            }
                        }]));
                };
            };
            async.log = _console_fn('log');
            async.dir = _console_fn('dir');
            async.memoize = function (fn, hasher) {
                var memo = {};
                var queues = {};
                hasher = hasher || function (x) {
                    return x;
                };
                var memoized = function () {
                    var args = Array.prototype.slice.call(arguments);
                    var callback = args.pop();
                    var key = hasher.apply(null, args);
                    if (key in memo) {
                        callback.apply(null, memo[key]);
                    } else if (key in queues) {
                        queues[key].push(callback);
                    } else {
                        queues[key] = [callback];
                        fn.apply(null, args.concat([function () {
                                memo[key] = arguments;
                                var q = queues[key];
                                delete queues[key];
                                for (var i = 0, l = q.length; i < l; i++) {
                                    q[i].apply(null, arguments);
                                }
                            }]));
                    }
                };
                memoized.memo = memo;
                memoized.unmemoized = fn;
                return memoized;
            };
            async.unmemoize = function (fn) {
                return function () {
                    return (fn.unmemoized || fn).apply(null, arguments);
                };
            };
            async.times = function (count, iterator, callback) {
                var counter = [];
                for (var i = 0; i < count; i++) {
                    counter.push(i);
                }
                return async.map(counter, iterator, callback);
            };
            async.timesSeries = function (count, iterator, callback) {
                var counter = [];
                for (var i = 0; i < count; i++) {
                    counter.push(i);
                }
                return async.mapSeries(counter, iterator, callback);
            };
            async.compose = function () {
                var fns = Array.prototype.reverse.call(arguments);
                return function () {
                    var that = this;
                    var args = Array.prototype.slice.call(arguments);
                    var callback = args.pop();
                    async.reduce(fns, args, function (newargs, fn, cb) {
                        fn.apply(that, newargs.concat([function () {
                                var err = arguments[0];
                                var nextargs = Array.prototype.slice.call(arguments, 1);
                                cb(err, nextargs);
                            }]));
                    }, function (err, results) {
                        callback.apply(that, [err].concat(results));
                    });
                };
            };
            var _applyEach = function (eachfn, fns) {
                var go = function () {
                    var that = this;
                    var args = Array.prototype.slice.call(arguments);
                    var callback = args.pop();
                    return eachfn(fns, function (fn, cb) {
                        fn.apply(that, args.concat([cb]));
                    }, callback);
                };
                if (arguments.length > 2) {
                    var args = Array.prototype.slice.call(arguments, 2);
                    return go.apply(this, args);
                } else {
                    return go;
                }
            };
            async.applyEach = doParallel(_applyEach);
            async.applyEachSeries = doSeries(_applyEach);
            async.forever = function (fn, callback) {
                function next(err) {
                    if (err) {
                        if (callback) {
                            return callback(err);
                        }
                        throw err;
                    }
                    fn(next);
                }
                next();
            };
            if (typeof define !== 'undefined' && define.amd) {
                define([], function () {
                    return async;
                });
            } else if (typeof module !== 'undefined' && module.exports) {
                module.exports = async;
            } else {
                root.async = async;
            }
        }());
    },
    '22': function (require, module, exports, global) {
        var url = null;
        var Cookie = exports = module.exports = function Cookie(str, req) {
                this.str = str;
                str.split(/ *; */).reduce(function (obj, pair) {
                    var p = pair.indexOf('=');
                    var key = p > 0 ? pair.substring(0, p).trim() : pair.trim();
                    var lowerCasedKey = key.toLowerCase();
                    var value = p > 0 ? pair.substring(p + 1).trim() : true;
                    if (!obj.name) {
                        obj.name = key;
                        obj.value = value;
                    } else if (lowerCasedKey === 'httponly') {
                        obj.httpOnly = value;
                    } else {
                        obj[lowerCasedKey] = value;
                    }
                    return obj;
                }, this);
                this.expires = this.expires ? new Date(this.expires) : Infinity;
                this.path = this.path ? this.path.trim() : req ? url.parse(req.url).pathname : '/';
            };
        Cookie.prototype.toString = function () {
            return this.str;
        };
        module.exports.Jar = require('23');
    },
    '23': function (require, module, exports, global) {
        var url = null;
        var CookieJar = exports = module.exports = function CookieJar() {
                this.cookies = [];
            };
        CookieJar.prototype.add = function (cookie) {
            this.cookies = this.cookies.filter(function (c) {
                return !(c.name == cookie.name && c.path == cookie.path);
            });
            this.cookies.push(cookie);
        };
        CookieJar.prototype.get = function (req) {
            var path = url.parse(req.url).pathname, now = new Date(), specificity = {};
            return this.cookies.filter(function (cookie) {
                if (0 == path.indexOf(cookie.path) && now < cookie.expires && cookie.path.length > (specificity[cookie.name] || 0))
                    return specificity[cookie.name] = cookie.path.length;
            });
        };
        CookieJar.prototype.cookieString = function (req) {
            var cookies = this.get(req);
            if (cookies.length) {
                return cookies.map(function (cookie) {
                    return cookie.name + '=' + cookie.value;
                }).join('; ');
            }
        };
    },
    '24': function (require, module, exports, global) {
        var Interpreter = require('25');
        module.exports = Interpreter;
    },
    '25': function (require, module, exports, global) {
        var Walker = require('26');
        var parser = require('2');
        var tree = require('8');
        var symtab = require('g');
        var state = require('27');
        var Event = require('28');
        var promise = require('e');
        var path = require('6');
        var u = require('4');
        var io = require('i');
        var options = require('f');
        var binop = require('d');
        var functions = require('29');
        var color = require('9');
        var colorify = require('b');
        var error = require('a');
        function Interpreter(options) {
            this.options = options;
        }
        ;
        var _ = Interpreter.prototype = new Walker();
        var walk = _._walk;
        state.mixTo(_);
        options.mixTo(_);
        Event.mixTo(_);
        _._walk = function (ast) {
            var res = walk.apply(this, arguments);
            if (!ast || !ast.type)
                return res;
            var name = ast.type.toLowerCase();
            this.trigger(name, res || ast);
            return res;
        };
        var errors = { 'RETURN': u.uid() };
        var states = { 'DECLARATION': u.uid() };
        _.ierror = new Error();
        _.interpret = function (ast) {
            this.ast = ast;
            this.scope = this.globalScope = new symtab.Scope();
            this.istack = [];
            this._globalImports = [];
            this.rulesets = [];
            this.medias = [];
            this.indent = 0;
            if (!this._handles) {
                this._walk = walk;
            }
            return this.walk(ast);
        };
        _.walk_default = function (ast) {
            return ast;
        };
        _.walk_stylesheet = function (ast) {
            var plist = ast.list, item;
            ast.list = [];
            for (ast.index = 0; !!plist[ast.index]; ast.index++) {
                if (item = this.walk(plist[ast.index])) {
                    u.merge(ast.list, item);
                }
            }
            return ast;
        };
        _.walk_directive = function (ast) {
            ast.value = this.walk(ast.value);
            if (ast.block)
                ast.block = this.walk(ast.block);
            return ast;
        };
        _.walk_keyframes = function (ast) {
            ast.name = this.walk(ast.name);
            ast.block = this.walk(ast.block);
            return ast;
        };
        _.walk_keyframe = function (ast) {
            ast.steps = this.walk(ast.steps);
            ast.block = this.walk(ast.block);
            return ast;
        };
        _.walk_ruleset = function (ast) {
            this.rulesets.push(ast);
            var rawSelector = this.walk(ast.selector), values = ast.values, res = [];
            this.rulesets.pop();
            var self = this;
            rawSelector.list.forEach(function (complex) {
                self.define(complex.string, ast);
            });
            if (ast.abstract) {
                rawSelector.list = [];
            }
            if (!values) {
                ast.selector = rawSelector;
                ast.parent = this.rulesets[this.rulesets.length - 1];
            }
            ast.lineno = rawSelector.lineno;
            ast.filename = this.get('filename');
            if (values) {
                for (var i = 0, len = values.length; i < len; i++) {
                    this.define('$i', {
                        type: 'DIMENSION',
                        value: i
                    });
                    this.define('$item', values[i]);
                    var block = ast.block.clone();
                    var selector = tree.selectorlist([rawSelector.list[i]], ast.lineno);
                    var ruleset = new tree.RuleSet(selector, block);
                    res.push(this.walk(ruleset));
                }
            } else {
                this.down(ast);
                var block = this.walk(ast.block);
                this.up(ast);
                res = block.exclude();
                ast.block = block;
                if (res.length) {
                    res.unshift(ast);
                }
            }
            return res.length ? res : ast;
        };
        _.walk_selectorlist = function (ast) {
            var list = ast.list, len = list.length, self = this, res = [];
            if (len === 1) {
                this.enter('ACCEPT_LIST');
            }
            list = this.walk(list);
            if (Array.isArray(list[0])) {
                list = list[0];
            }
            ast.list = list;
            this.leave('ACCEPT_LIST');
            return ast;
        };
        _.walk_complexselector = function (ast) {
            var ruleset = this.rulesets[this.rulesets.length - 1];
            var interpolations = ast.interpolations, i, len = interpolations.length, valuesList;
            var values = [];
            for (i = 0; i < len; i++) {
                var value = this.walk(interpolations[i]);
                if (value.type === 'valueslist') {
                    if (ruleset.values || !this.state('ACCEPT_LIST')) {
                        this.error('con"t has more than 2 interpolations in ComplexSelector', ast);
                    } else {
                        ruleset.values = value.list;
                        values.push(null);
                    }
                } else {
                    values.push(tree.toStr(value));
                }
            }
            ast.string = ast.string.replace(/#\{(\d+)}/g, function (all, index) {
                var value = values[parseInt(index)];
                if (typeof value === 'string') {
                    return value;
                } else {
                    return '#{interpolation}';
                }
            });
            if (valuesList = ruleset.values) {
                var res = [], toStr = tree.toStr;
                for (var j = 0, jlen = valuesList.length; j < jlen; j++) {
                    var value = valuesList[j];
                    var string = ast.string.replace(/#\{interpolation}/, function () {
                            return toStr(value);
                        });
                    res.push(new tree.ComplexSelector(string));
                }
                return res;
            }
            return ast;
        };
        _.walk_operator = function (ast) {
            var op = ast.op;
            var left = this.walk(ast.left);
            var right = op == '&&' || op == '||' ? ast.right : this.walk(ast.right);
            if (tree.isRelationOp(op)) {
                return binop.relation.call(this, left, right, op);
            } else {
                return binop[op].call(this, left, right);
            }
        };
        _.walk_assign = function (ast) {
            if (!ast.override) {
                var ref = this.resolve(ast.name);
                if (ref && ref.type !== 'NULL')
                    return;
            }
            this.define(ast.name, this.walk(ast.value));
        };
        _.walk_var = function (ast) {
            var symbol = this.resolve(ast.value);
            if (symbol) {
                symbol = symbol;
                symbol.lineno = ast.lineno;
                return symbol;
            } else {
                this.error('Undefined variable: ' + ast.value, ast);
            }
        };
        _.walk_url = function (ast) {
            var self = this, symbol;
            ast.value = ast.value.replace(/#\{(\$\w+)}/g, function (all, name) {
                if (symbol = self.resolve(name)) {
                    return tree.toStr(symbol);
                } else {
                    self.error('Undefined ' + name + ' in interpolation', ast);
                }
            });
            return ast;
        };
        _.walk_unary = function (ast) {
            var value = this.walk(ast.value), op = ast.op;
            switch (op) {
            case '+':
            case '-':
                if (value.type !== 'DIMENSION') {
                    this.error(op + ' Unary operator only accept DIMENSION bug got ' + value.type, ast.lineno);
                }
                var rvalue = op === '-' && -value.value;
                var node = tree.token('DIMENSION', rvalue, ast.lineno);
                node.unit = value.unit;
                return node;
            case '!':
                var test = tree.toBoolean(value);
                if (test === undefined) {
                    this.error('! Unary operator dont support valueType: ' + value.type, ast.lineno);
                }
                return {
                    type: 'BOOLEAN',
                    value: !test,
                    lineno: ast.lineno
                };
            default:
                this.error('Unsupprt Unary operator ' + op, ast.lineno);
            }
        };
        _.walk_text = function (ast) {
            var chs = color.maps[ast.value];
            if (chs) {
                return new color(chs);
            } else {
                return ast;
            }
        };
        _.walk_string = function (ast) {
            var self = this, symbol;
            ast.value = ast.value.replace(/#\{(\$\w+)}/g, function (all, name) {
                if (symbol = self.resolve(name)) {
                    return tree.toStr(symbol);
                } else {
                    self.error('not defined String interpolation', ast);
                }
            });
            return ast;
        };
        _.walk_debug = function (ast) {
            var value = this.walk(ast.value);
            console.log(colorify('DEBUG', 'yellow') + ' ' + tree.toStr(value) + '  (' + colorify(value.type, 'green') + ')' + '\n');
        };
        _.walk_if = function (ast) {
            var test = this.walk(ast.test);
            if (tree.toBoolean(test)) {
                return this.walk(ast.block);
            } else {
                return this.walk(ast.alt);
            }
        };
        _.walk_for = function (ast) {
            var list = this.walk(ast.list), index = ast.index, isIn = ast.isIn, by = this.walk(ast.by), element = ast.element, block, iscope, len, res = [], item, key, value;
            by = by && by.value ? Math.round(by.value) : 1;
            if (!list.list) {
                list = [list];
            } else {
                list = list.list;
            }
            var len = list.length, i = by < 0 ? len - 1 : 0;
            for (; i < len && i >= 0; i += by) {
                item = list[i];
                if (isIn) {
                    if (item.type !== 'values') {
                        this.error('list in @for in statement must confirm the all elem is values type', ast.list.lineno);
                    }
                    value = item.list[1];
                    key = item.list[0];
                } else {
                    value = item;
                    if (index)
                        key = tree.token('DIMENSION', i, ast.list.lineno);
                }
                this.define(element, value);
                if (index)
                    this.define(index, key);
                block = this.walk(ast.block.clone());
                res = res.concat(block.list);
            }
            return res;
        };
        _.walk_call = function (ast) {
            var func = this.resolve(ast.name), iscope, params, named, args = this.walk(ast.args);
            if (!func || func.type !== 'func') {
                if (func = functions[ast.name]) {
                    this.lineno = ast.lineno;
                    var value = tree.convert(func.apply(this, args));
                    value.lineno = ast.lineno;
                    this.lineno = null;
                    return value;
                } else {
                    if (ast.name.charAt(0) === '$')
                        this.error('undefined function: ' + ast.name, ast);
                    else {
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
            if (named = ast.named) {
                for (var i in named) {
                    var nindex = named[i];
                    if (args[nindex]) {
                        this.define(i, args[nindex]);
                        args.splice(nindex, 1);
                    }
                }
                params = params.filter(function (item) {
                    return named[item.name] == null;
                });
            }
            for (var i = 0, offset = 0, len = params.length; i < len; i++) {
                var param = params[i], pname = param.name;
                if (param.rest) {
                    var remained = len - 1 - i, restArgsLen = args.length - i - remained;
                    restArgsLen = restArgsLen > 0 ? restArgsLen : 1;
                    var restArgs = args.slice(i, i + restArgsLen);
                    var passArg = tree.valueslist(restArgs, ast.lineno);
                    this.define(param.name, passArg);
                    if (restArgsLen > 1) {
                        offset += restArgsLen - 1;
                    }
                } else {
                    var value = args[i + offset] || param.default;
                    if (value)
                        this.define(param.name, value);
                    else
                        this.define(param.name, tree.null(args.lineno));
                }
            }
            this.define('$arguments', new tree.ValuesList(args));
            try {
                this.set('filename', func.filename);
                var block = this.walk(func.block.clone());
            } catch (err) {
                if (err.code === errors.RETURN) {
                    var value = tree.convert(err.value);
                    this.up();
                    this.scope = prev;
                    this.set('filename', pref);
                    return value;
                } else {
                    throw err;
                }
            }
            this.up();
            this.scope = prev;
            this.set('filename', pref);
            return block;
        };
        _.walk_return = function (ast) {
            var isFunc = ast.value && ast.value.type == 'func';
            _.ierror.code = errors.RETURN;
            _.ierror.value = this.walk(ast.value);
            if (isFunc) {
                this.define('_anonymous_' + u.uid(), _.ierror.value);
            }
            throw _.ierror;
        };
        _.walk_func = function (ast) {
            ast.params = this.walk(ast.params);
            if (!ast.scope)
                ast.scope = this.scope;
            ast.filename = this.get('filename');
            return ast;
        };
        _.walk_param = function (ast) {
            if (ast.default) {
                ast.default = this.walk(ast.default);
            }
            return ast;
        };
        _.walk_module = function (ast) {
            var block = this.walk(ast.block);
        };
        _.walk_extend = function (ast) {
            var ruleset = this.rulesets[this.rulesets.length - 1];
            if (!ruleset)
                this.error('can not use @extend outside ruleset', ast);
            var selector = this.walk(ast.selector);
            var self = this;
            selector.list.forEach(function (item) {
                var extend = self.resolve(item.string);
                if (extend) {
                    extend.addRef(ruleset);
                }
            });
        };
        _.walk_import = function (ast) {
            this.walk(ast.url);
            var url = ast.url;
            if (ast.stylesheet) {
                var queryList = ast.queryList;
                var stylesheet = ast.stylesheet;
                if (queryList.length) {
                    var media = new tree.Media(queryList, stylesheet);
                    return this.walk(media);
                } else {
                    if (~this._globalImports.indexOf(ast.filename) && this.scope === this.globalScope) {
                        u.log(colorify('WARNING:', 'yellow') + '(' + ast.filename + ') is import twice, mcss forbid default');
                        return;
                    } else {
                        this._globalImports.push(ast.filename);
                    }
                    var pre = this.get('filename');
                    this.set('filename', ast.filename);
                    var list = this.walk(stylesheet).list;
                    this.set('filename', pre);
                    return list;
                }
            } else {
                return ast;
            }
        };
        _.walk_media = function (ast) {
            ast.queryList = this.walk(ast.queryList);
            var rulesets = this.rulesets, ruleset, newRuleset;
            this.concatMedia(ast);
            this.down(null, ast);
            this.walk(ast.block);
            this.up(null, ast);
            var res = ast.block.exclude(true);
            if (res.length) {
                if (Array.isArray(res[0])) {
                    var declarations = res.shift();
                    if (declarations.length && rulesets.length) {
                        ruleset = rulesets[rulesets.length - 1];
                        newRuleset = new tree.RuleSet(ruleset.selector, new tree.Block(declarations));
                        newRuleset.parent = ruleset.parent;
                        newRuleset.lineno = declarations[0].value.lineno || declarations[0].property.lineno;
                        ast.block.list.unshift(newRuleset);
                    }
                }
                res.unshift(ast);
            }
            return res.length ? res : ast;
        };
        _.walk_mediaquery = function (ast) {
            ast.expressions = this.walk(ast.expressions);
            return ast;
        };
        _.walk_mediaexpression = function (ast) {
            ast.feature = this.walk(ast.feature);
            ast.value = this.walk(ast.value);
            return ast;
        };
        _.walk_block = function (ast) {
            var list = ast.list;
            var res = [], r;
            for (var i = 0, len = list.length; i < list.length; i++) {
                if (list[i] && (r = this.walk(list[i]))) {
                    u.merge(res, r);
                }
            }
            ast.list = res;
            return ast;
        };
        _.walk_declaration = function (ast) {
            this.enter('DECLARATION');
            ast.property = this.walk(ast.property);
            ast.value = this.walk(ast.value);
            this.leave('DECLARATION');
            return ast;
        };
        _.walk_compoundident = function (ast) {
            var text = '', self = this;
            this.walk(ast.list).forEach(function (item) {
                text += typeof item === 'string' ? item : tree.toStr(self.walk(item));
            });
            return {
                type: 'TEXT',
                value: text,
                lineno: ast.lineno
            };
        };
        _.walk_valueslist = function (ast) {
            ast.list = this.walk(ast.list);
            return ast;
        };
        _.walk_values = function (ast) {
            ast.list = this.walk(ast.list);
            return ast;
        };
        _.walk_range = function (ast) {
            var start = this.walk(ast.start), end = this.walk(ast.end), lineno = ast.lineno;
            if (start.type !== 'DIMENSION' || end.type !== 'DIMENSION') {
                this.error('range"s start and end must be all DIMENSION type');
            }
            var svalue = Math.round(start.value), evalue = Math.round(end.value), list = [];
            for (; svalue <= evalue; svalue++) {
                list.push(tree.token('DIMENSION', svalue, ast.lineno));
            }
            return tree.valueslist(list, ast.lineno);
        };
        _.down = function (ruleset, media) {
            if (ruleset)
                this.rulesets.push(ruleset);
            if (media)
                this.medias.push(media);
            this.scope = new symtab.Scope(this.scope);
        };
        _.up = function (ruleset, media) {
            if (ruleset)
                this.rulesets.pop();
            if (media)
                this.medias.pop();
            this.scope = this.scope.getOuterScope();
        };
        _.concatMedia = function (media) {
            var ss = this.medias;
            if (!ss.length)
                return media;
            var slist = ss[ss.length - 1].queryList, mlist = media.queryList, queryList = [];
            var s, m, slen = slist.length, mlen = mlist.length, mm, sm, nm;
            for (m = 0; m < mlen; m++) {
                mm = mlist[m];
                for (s = 0; s < slen; s++) {
                    sm = slist[s];
                    nm = new tree.MediaQuery();
                    if (sm.mediaType && mm.mediaType) {
                        var noConcat = true;
                        break;
                    } else {
                        nm.mediaType = mm.mediaType || sm.mediaType;
                        nm.expressions = sm.expressions.concat(mm.expressions);
                        queryList.push(nm);
                    }
                }
            }
            if (!noConcat) {
                media.queryList = queryList;
            }
            return media;
        };
        _.push = function (scope) {
            this.istack.push(scope);
        };
        _.pop = function () {
            this.istack.pop();
        };
        _.peek = function () {
            var len;
            if (len = this.istack.length)
                return this.istack[len - 1];
        };
        _.getScope = function () {
            return this.peek() || this.scope;
        };
        _.define = function (id, symbol) {
            this.scope.define(id, symbol);
        };
        _.resolve = function (id) {
            var scope, symbol;
            if ((scope = this.peek()) && (symbol = scope.resolve(id))) {
                return symbol;
            }
            return this.scope.resolve(id);
        };
        _.expect = function (ast, type) {
            if (!(this._inspect(ast) === type)) {
                this.error('interpreter error! expect node: "' + type + '" got: "' + ast.type + '"', ast);
            }
        };
        _.error = function (msg, ll) {
            if (ll) {
                var lineno = ll.lineno || ll;
            } else {
                lineno = this.lineno;
            }
            throw new error.McssError(msg, lineno, this.options);
        };
        module.exports = Interpreter;
    },
    '26': function (require, module, exports, global) {
        var _ = require('4');
        var Walker = function () {
        };
        Walker.prototype = {
            constructor: Walker,
            walk: function (node) {
                if (Array.isArray(node)) {
                    return this._walkArray(node);
                } else {
                    return this._walk(node);
                }
            },
            walk_defaut: function (node) {
                if (node.list || node.body) {
                    return this.walk(node.list || node.body);
                } else if (node.type && this.walk_token) {
                    return this.walk_token(node);
                } else {
                    _.warn('no "' + this._inspect(node) + '" walk defined');
                }
            },
            _walkArray: function (nodes) {
                var self = this;
                var res = [];
                nodes.forEach(function (node) {
                    if (node)
                        res.push(self._walk(node));
                });
                return res;
            },
            _walk: function (node) {
                var sign = this._inspect(node), name = 'walk_' + sign;
                if (this[name])
                    return this[name](node);
                else
                    return this.walk_default(node);
            },
            _inspect: function (node) {
                if (!node)
                    return null;
                return node.type ? node.type.toLowerCase() : null;
            },
            error: function (e) {
                throw e;
            }
        };
        module.exports = Walker;
    },
    '27': function (require, module, exports, global) {
        function ex(o1, o2, override) {
            for (var i in o2)
                if (o1[i] == null || override) {
                    o1[i] = o2[i];
                }
        }
        ;
        var API = {
                state: function (state) {
                    var _states = this._states || (this._states = []);
                    return _states.some(function (item) {
                        return item === state;
                    });
                },
                enter: function (state) {
                    var _states = this._states || (this._states = []);
                    _states.push(state);
                },
                leave: function (state) {
                    var _states = this._states || (this._states = []);
                    if (!state || state === _states[_states.length - 1])
                        _states.pop();
                }
            };
        exports.mixTo = function (obj) {
            obj = typeof obj == 'function' ? obj.prototype : obj;
            ex(obj, API);
        };
    },
    '28': function (require, module, exports, global) {
        var slice = [].slice, ex = function (o1, o2, override) {
                for (var i in o2)
                    if (o1[i] == null || override) {
                        o1[i] = o2[i];
                    }
            };
        var API = {
                on: function (event, fn) {
                    if (typeof event === 'object') {
                        for (var i in event) {
                            this.on(i, event[i]);
                        }
                    } else {
                        var handles = this._handles || (this._handles = {}), calls = handles[event] || (handles[event] = []);
                        calls.push(fn);
                    }
                    return this;
                },
                off: function (event, fn) {
                    if (event)
                        this._handles = [];
                    if (!this._handles)
                        return;
                    var handles = this._handles, calls;
                    if (calls = handles[event]) {
                        if (!fn) {
                            handles[event] = [];
                            return this;
                        }
                        for (var i = 0, len = calls.length; i < len; i++) {
                            if (fn === calls[i]) {
                                calls.splice(i, 1);
                                return this;
                            }
                        }
                    }
                    return this;
                },
                trigger: function (event) {
                    var args = slice.call(arguments, 1), handles = this._handles, calls;
                    if (!handles || !(calls = handles[event]))
                        return this;
                    for (var i = 0, len = calls.length; i < len; i++) {
                        calls[i].apply(this, args);
                    }
                    return this;
                },
                hasEvent: function (event) {
                    var handles = this._handles;
                    return handles && (calls = handles[event]) && calls.length;
                }
            };
        function Event(handles) {
            if (arguments.length)
                this.on.apply(this, arguments);
        }
        ;
        ex(Event.prototype, API);
        Event.mixTo = function (obj) {
            obj = typeof obj == 'function' ? obj.prototype : obj;
            ex(obj, API);
        };
        module.exports = Event;
    },
    '29': function (require, module, exports, global) {
        var fs = null;
        var path = null;
        var tree = require('8');
        var u = require('4');
        var tk = require('3');
        var Color = tree.Color;
        var _ = module.exports = {
                rgba: function (r, g, b, a) {
                    if (r.type === 'color') {
                        return new Color(r, g && g.value);
                    } else {
                        return new Color([
                            r.value,
                            g.value,
                            b.value
                        ], a && a.value);
                    }
                }.__accept([
                    'DIMENSION color',
                    'DIMENSION',
                    'DIMENSION',
                    'DIMENSION'
                ]),
                rgb: function () {
                    return _.rgba.apply(this, arguments);
                },
                hsla: function (h, s, l, a) {
                    if (arguments.length < 3)
                        this.error('hsla need at least 3 arguments got:' + arguments.length);
                    if (s.unit !== '%' || l.unit !== '%')
                        this.error('hsl param saturation and light all only accpet percent');
                    if (a && a.unit === '%')
                        a.value /= 100;
                    var node = Color.hsl([
                            h.value,
                            s.value,
                            l.value
                        ], a && a.value);
                    return node;
                }.__accept([
                    'DIMENSION',
                    'DIMENSION',
                    'DIMENSION',
                    'DIMENSION'
                ]),
                hsl: function () {
                    return _.hsla.apply(this, arguments);
                },
                mix: function (c1, c2, weight) {
                    if (weight && weight.unit !== '%')
                        this.error('weight param must be a percent');
                    var a = c1.alpha - c2.alpha, p = (weight && weight.value || 50) / 100, w = p * 2 - 1, w1 = ((w * a == -1 ? w : (w + a) / (1 + w * a)) + 1) / 2, w2 = 1 - w1, alpha = c1.alpha * p + c2.alpha * (1 - p), channels = [
                            c1[0] * w1 + c2[0] * w2,
                            c1[1] * w1 + c2[1] * w2,
                            c1[2] * w1 + c2[2] * w2
                        ];
                    return new Color(channels, alpha, c1.lineno);
                }.__accept([
                    'color',
                    'color',
                    'DIMENSION'
                ]),
                define: function (name, value, global) {
                    name = name.value;
                    if (!name || !value)
                        this.error('invalid passed param in define');
                    var scope = tree.toBoolean(global) ? this.globalScope : this.scope;
                    scope.define(name, value);
                }.__accept(['TEXT STRING']),
                apply: function (func, args) {
                    if (!func)
                        this.error('function "apply" atleast need one prams');
                    if (!func.name)
                        this.define('null', func);
                    var call = tree.call(func.name || 'null', args && args.list || []);
                    return this.walk(call);
                }.__accept([
                    'func',
                    'valueslist values'
                ]),
                typeof: function (node) {
                    return node.type.toLowerCase();
                },
                js: function (string) {
                    try {
                        return eval('(' + string.value + ')');
                    } catch (e) {
                        this.error(e.message);
                    }
                }.__accept(['STRING']),
                join: function (list, separator) {
                    separator = separator ? separator.value : '-';
                    return tree.token('TEXT', list.list.map(tree.toStr).join(separator), list.lineno);
                }.__accept([
                    'valueslist values',
                    'TEXT STRING'
                ]),
                t: function (node) {
                    var text = tree.toStr(node);
                    if (text == null)
                        text = '';
                    return tree.token('TEXT', text, node.lineno);
                },
                error: function (message) {
                    this.error(message.value);
                }.__accept(['STRING']),
                index: function (list, index) {
                    var elem;
                    if (!index || index.type !== 'DIMENSION') {
                        this.error('invalid param:index passed to args()');
                    }
                    if (elem = list.list[index.value]) {
                        return elem;
                    } else {
                        return tree.null();
                    }
                }.__accept([
                    'valueslist values',
                    'DIMENSION'
                ]),
                values: function (value) {
                    return tree.values(value && [value]);
                },
                valueslist: function (value) {
                    return tree.valueslist(value && [value]);
                },
                flattern: function () {
                },
                slice: function (list, start, end) {
                    var clist = list.list.slice(start && start.value || 0, end && end.value || list.list.length);
                    return tree[list.type](clist);
                }.__accept([
                    'valueslist values',
                    'DIMENSION',
                    'DIMENSION'
                ]),
                args: function (index) {
                    var args = this.resolve('$arguments');
                    if (!args) {
                        this.error('the args() must be called in function block');
                    }
                    return _.index.call(this, args, index);
                },
                len: function (list) {
                    return tree.token('DIMENSION', list.list.length, list.lineno);
                }.__accept(['values valueslist']),
                'is-list': function (list) {
                    return !!(list && list.list);
                },
                'data-uri': function (string) {
                    var value = string.value, url = {
                            type: 'URL',
                            value: value
                        };
                    if (!fs)
                        return url;
                    else {
                        var fullname = path.resolve(path.dirname(this.get('filename')), value);
                        var base64 = converToBase64(fullname);
                        if (!base64)
                            return url;
                        url.value = base64;
                        return url;
                    }
                }.__accept(['STRING'])
            };
        _.list = function (list, index, value) {
        }.__accept(['values valueslist']);
        [
            'push',
            'unshift',
            'pop',
            'shift',
            'indexOf'
        ].forEach(function (name) {
            _[name] = function (list, item) {
                var type = list.type;
                if (type !== 'valueslist' && type !== 'values') {
                    this.error(name + ' first param only accpet values or valueslist');
                }
                list.list[name](item);
            };
        });
        _['-adjust'] = function (color, prop, weight, absolute) {
            var p = prop.value, key = channelsMap[p];
            var isAbsolute = tree.toBoolean(absolute);
            if (isRGBA(p)) {
                if (!weight)
                    return color[key];
                if (p === 'a' && weight.unit === '%') {
                    weight.unit = null;
                    weight.value /= 100;
                }
                if (weight.unit)
                    this.error('rgba adjust only accpet NUMBER');
                var clone = color.clone();
                if (isAbsolute) {
                    clone[key] = weight.value;
                } else {
                    clone[key] += weight.value;
                }
                Color.limit(clone);
                return clone;
            }
            if (isHSL(p)) {
                var hsl = color.toHSL();
                if (!weight) {
                    switch (p) {
                    case 'saturation':
                    case 'lightness':
                        return {
                            type: 'DIMENSION',
                            value: hsl[key],
                            unit: '%'
                        };
                    }
                    return hsl[key];
                }
                if (isAbsolute) {
                    hsl[key] = weight.value;
                } else {
                    hsl[key] += weight.value;
                }
                var node = Color.hsl(hsl, color.alpha);
                node.lineno = color.lineno;
                return node;
            }
            this.error('invalid adjust property ' + p + ' ' + color.lineno);
        }.__accept([
            'color',
            'STRING',
            'DIMENSION'
        ]);
        var RGBA_STR = 'red green blue alpha';
        var HSL_STR = 'hue saturation lightness';
        var isRGBA = u.makePredicate(RGBA_STR);
        var isHSL = u.makePredicate(HSL_STR);
        var channelsMap = {
                'hue': 0,
                'saturation': 1,
                'lightness': 2,
                'red': 0,
                'green': 1,
                'blue': 2,
                'alpha': 'alpha'
            };
        _.argb = function (color) {
            return color.toCSS(true);
        };
        ;
        (RGBA_STR + ' ' + HSL_STR).split(' ').forEach(function (name) {
            var text = tk.createToken('STRING', name);
            _[name.charAt(0) + '-adjust'] = _[name] = function (color, amount, absolute) {
                return _['-adjust'].call(this, color, text, amount, absolute);
            };
        });
        _.fade = _.alpha;
        delete _.alpha;
        ;
        [
            'floor',
            'ceil',
            'round',
            'abs',
            'max',
            'min'
        ].forEach(function (name) {
            _[name] = function (d) {
                if (arguments.length < 1)
                    this.error('at least pass one argument');
                var clone = tree.cloneNode(d);
                var args = u.slice(arguments).map(function (item) {
                        return item.value;
                    });
                clone.value = Math[name].apply(Math, args);
                return clone;
            }.__accept(['DIMENSION']);
        });
        var mediatypes = {
                '.eot': 'application/vnd.ms-fontobject',
                '.gif': 'image/gif',
                '.ico': 'image/vnd.microsoft.icon',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.otf': 'application/x-font-opentype',
                '.png': 'image/png',
                '.svg': 'image/svg+xml',
                '.ttf': 'application/x-font-ttf',
                '.webp': 'image/webp',
                '.woff': 'application/x-font-woff'
            };
        function converToBase64(imagePath) {
            imagePath = imagePath.replace(/[?#].*/g, '');
            var extname = path.extname(imagePath), stat, img;
            try {
                stat = fs.statSync(imagePath);
                if (stat.size > 1024 * 6) {
                    return false;
                }
                img = fs.readFileSync(imagePath, 'base64');
                return 'data:' + mediatypes[extname] + ';base64,' + img;
            } catch (e) {
                return false;
            }
        }
    },
    '2a': function (require, module, exports, global) {
        var Translator = require('2b');
        module.exports = Translator;
    },
    '2b': function (require, module, exports, global) {
        var Walker = require('26');
        var tree = require('8');
        var error = require('a');
        var u = require('4');
        var options = require('f');
        var path = null;
        var buffer = require('2c');
        function Translator(options) {
            this.options = options || {};
        }
        var _ = Translator.prototype = new Walker();
        var walk = _.walk;
        options.mixTo(_);
        var formats = {
                COMMON: 1,
                COMPRESS: 2,
                ONELINE: 3
            };
        _.translate = function (ast) {
            this.ast = ast;
            this.buffer = buffer(this.options);
            this.level = 0;
            this.indent = this.get('indent') || '\t';
            this.newline = this.get('format') > 1 ? '' : '\n';
            this.walk_stylesheet(ast, true);
            var text = this.buffer.toString();
            if (path && this.options.sourceMap && this.options.dest) {
                var base64 = new Buffer(this.buffer.getMap()).toString('base64');
                text += '/*@ sourceMappingURL= ' + path.basename(this.get('dest'), '.css') + '.css.map */';
                u.writeFile(this.get('dest') + '.map', this.buffer.getMap(), function (err) {
                    if (err)
                        console.error('sourcemap wirte fail');
                });
            }
            return text;
        };
        _.walk_stylesheet = function (ast, blank) {
            this.walk_block(ast, blank);
        };
        _.walk_ruleset = function (ast) {
            var buffer = this.buffer;
            var slist = ast.getSelectors(), plist, parent = ast.parent;
            if (!slist || !slist.length)
                return false;
            while (parent) {
                if (parent.getSelectors().length == 0)
                    return false;
                parent = parent.parent;
            }
            if (typeof ast.lineno === 'number' && ast.filename) {
                buffer.addMap({
                    line: ast.lineno - 1,
                    source: ast.filename
                });
            }
            if (!ast.block.list.length)
                return false;
            buffer.add(this.walk(ast.selector.list).join(','));
            this.walk(ast.block);
        };
        _.walk_selectorlist = function (ast) {
            return this.walk(ast.list).join(',' + this.newline);
        };
        _.walk_complexselector = function (ast) {
            return ast.string;
        };
        _.walk_block = function (ast, blank) {
            this.level++;
            var indent = this.indents();
            var buffer = this.buffer;
            var res = [];
            if (!blank)
                buffer.add('{');
            var list = ast.list;
            if (!blank)
                buffer.add(this.newline + indent);
            for (var i = 0, len = list.length; i < len; i++) {
                var item = this.walk(list[i]);
                if (item !== false) {
                    if (list[i].type !== 'declaration' && this.has('format', 3) && item !== '') {
                        buffer.add('\n');
                    }
                    if (i !== len - 1 && item !== '') {
                        buffer.add(this.newline + indent);
                    }
                }
            }
            this.level--;
            if (!blank) {
                buffer.add(this.newline + this.indents() + '}');
            }
        };
        _.walk_valueslist = function (ast) {
            var text = this.walk(ast.list).join(',');
            return text;
        };
        _.walk_values = function (ast) {
            var text = this.walk(ast.list).join(' ');
            text = text.replace(/ \/ /g, '/');
            return text;
        };
        _.walk_import = function (ast) {
            var outport = [
                    '@import ',
                    this.walk_url(ast.url)
                ];
            if (ast.queryList && ast.queryList.length) {
                outport.push(this.walk(ast.queryList).join(','));
            }
            this.buffer.add(outport.join(' ') + ';');
        };
        _.walk_media = function (ast) {
            var str = '@media ';
            str += this.walk(ast.queryList).join(',');
            this.buffer.add(str);
            this.walk_block(ast.block);
        };
        _.walk_mediaquery = function (ast) {
            var outport = this.walk(ast.expressions);
            if (ast.mediaType)
                outport.unshift(ast.mediaType);
            return outport.join(' and ');
        };
        _.walk_mediaexpression = function (ast) {
            var str = '';
            str += this.walk(ast.feature);
            if (ast.value)
                str += ': ' + this.walk(ast.value);
            return '(' + str + ')';
        };
        _.walk_keyframes = function (ast) {
            var prefix = this.get('prefix'), buffer = this.buffer, store;
            var str = '@' + ast.fullname + ' ' + this.walk(ast.name);
            buffer.add(str);
            this.walk(ast.block);
        };
        var stepmap = {
                from: '0%',
                to: '100%'
            };
        _.walk_keyframe = function (ast) {
            var self = this;
            var steps = ast.steps.map(function (item) {
                    var step;
                    if (item.type === 'TEXT') {
                        step = stepmap[item.value.toLowerCase()];
                        if (step)
                            return step;
                    }
                    if (item.type === 'DIMENSION') {
                        if (item.unit == '%')
                            return tree.toStr(item);
                    }
                    self.error('@keyframe step only accept [from | to | <percentage>]', item.lineno);
                });
            this.buffer.add(this.newline + this.indents() + steps.join(','));
            this.walk(ast.block);
        };
        _.walk_declaration = function (ast) {
            var text = this.walk(ast.property);
            var value = this.walk(ast.value);
            var str = text + ':' + value + (ast.important ? ' !important' : '');
            this.buffer.add(str + ';');
        };
        _.walk_string = function (ast) {
            return '"' + ast.value + '"';
        };
        _['walk_='] = function (ast) {
            return '=';
        };
        _['walk_/'] = function (ast) {
            return '/';
        };
        _.walk_unknown = function (ast) {
            return ast.name;
        };
        _.walk_url = function (ast) {
            return 'url("' + ast.value + '")';
        };
        _.walk_color = function (ast) {
            return ast.toCSS();
        };
        _.walk_directive = function (ast) {
            var str = '@' + ast.fullname + ' ';
            if (ast.value) {
                str += this.walk(ast.value);
            }
            this.buffer.add(str);
            if (ast.block) {
                this.walk(ast.block);
            } else {
                this.buffer.add(';');
            }
        };
        _.walk_call = function (ast) {
            return ast.name + '(' + this.walk(ast.args).join(',') + ')';
        };
        _.walk_default = function (ast) {
            if (!ast)
                return '';
            var str = tree.toStr(ast);
            if (typeof str !== 'string') {
                return '';
            }
            return str;
        };
        _.error = function (msg, ll) {
            var lineno = ll.lineno || ll;
            throw new error.McssError(msg, lineno, this.options);
        };
        _.indents = function () {
            if (this.get('format') > 1) {
                return '';
            } else {
                return Array(this.level).join(this.indent);
            }
        };
        _._getSassDebugInfo = function () {
            return '@media -sass-debug-info';
        };
        module.exports = Translator;
    },
    '2c': function (require, module, exports, global) {
        var path = null;
        module.exports = function (options) {
            var sourceMap = require('1').sourcemap;
            var options = options || {};
            var buffers = [];
            var mapper = {};
            var generator = path && options.sourceMap ? new sourceMap.SourceMapGenerator({ file: path.basename(options.dest) }) : null;
            var lines = 1;
            var column = 0;
            var outport = '';
            var marked = null;
            return {
                add: function (content) {
                    if (options.sourceMap) {
                        var newline = (content.match(/\n/g) || '').length;
                        lines += newline;
                        var clen = content.length;
                        if (newline) {
                            column = clen - content.lastIndexOf('\n') - 1;
                        } else {
                            column += clen;
                        }
                    }
                    if (typeof marked === 'string')
                        marked += content;
                    outport += content;
                },
                addMap: function (map) {
                    if (options.sourceMap) {
                        generator.addMapping({
                            generated: {
                                column: column,
                                line: lines
                            },
                            source: path.relative(path.dirname(options.dest), map.source),
                            original: {
                                column: 1,
                                line: map.line
                            }
                        });
                    }
                },
                toString: function () {
                    return outport;
                },
                getMap: function () {
                    if (!generator)
                        return null;
                    return generator.toString();
                },
                mark: function () {
                    marked = '';
                },
                restore: function () {
                    var res = marked;
                    marked = null;
                    return res;
                }
            };
        };
    },
    '2d': function (require, module, exports, global) {
        module.exports = {
            prefixr: require('2e'),
            csscomb: require('2g')
        };
    },
    '2e': function (require, module, exports, global) {
        var prefixs = require('2f').prefixs;
        var _ = require('4');
        var tree = require('8');
        var isTestProperties = _.makePredicate('border-radius transition');
        module.exports = {
            'block': function (tree) {
                var list = tree.list, len = list.length;
                for (; len--;) {
                    var declaration = list[len];
                    if (isTestProperties(declaration.property)) {
                        list.splice(len, 0, declaration.clone('-webkit-' + declaration.property), declaration.clone('-moz-' + declaration.property), declaration.clone('-mz-' + declaration.property), declaration.clone('-o-' + declaration.property));
                    }
                }
            }
        };
    },
    '2f': function (require, module, exports, global) {
        exports.orders = {
            'position': 1,
            'z-index': 1,
            'top': 1,
            'right': 1,
            'bottom': 1,
            'left': 1,
            'display': 2,
            'visibility': 2,
            'float': 2,
            'clear': 2,
            'overflow': 2,
            'overflow-x': 2,
            'overflow-y': 2,
            '-ms-overflow-x': 2,
            '-ms-overflow-y': 2,
            'clip': 2,
            'zoom': 2,
            'flex-direction': 2,
            'flex-order': 2,
            'flex-pack': 2,
            'flex-align': 2,
            '-webkit-box-sizing': 3,
            '-moz-box-sizing': 3,
            'box-sizing': 3,
            'width': 3,
            'min-width': 3,
            'max-width': 3,
            'height': 3,
            'min-height': 3,
            'max-height': 3,
            'margin': 3,
            'margin-top': 3,
            'margin-right': 3,
            'margin-bottom': 3,
            'margin-left': 3,
            'padding': 3,
            'padding-top': 3,
            'padding-right': 3,
            'padding-bottom': 3,
            'padding-left': 3,
            'table-layout': 4,
            'empty-cells': 4,
            'caption-side': 4,
            'border-spacing': 4,
            'border-collapse': 6,
            'list-style': 4,
            'list-style-position': 4,
            'list-style-type': 4,
            'list-style-image': 4,
            'content': 5,
            'quotes': 5,
            'counter-reset': 5,
            'counter-increment': 5,
            'resize': 5,
            'cursor': 5,
            'nav-index': 5,
            'nav-up': 5,
            'nav-right': 5,
            'nav-down': 5,
            'nav-left': 5,
            '-webkit-transition': 5,
            '-moz-transition': 5,
            '-ms-transition': 5,
            '-o-transition': 5,
            'transition': 5,
            '-webkit-transition-delay': 5,
            '-moz-transition-delay': 5,
            '-ms-transition-delay': 5,
            '-o-transition-delay': 5,
            'transition-delay': 5,
            '-webkit-transition-timing-function': 5,
            '-moz-transition-timing-function': 5,
            '-ms-transition-timing-function': 5,
            '-o-transition-timing-function': 5,
            'transition-timing-function': 5,
            '-webkit-transition-duration': 5,
            '-moz-transition-duration': 5,
            '-ms-transition-duration': 5,
            '-o-transition-duration': 5,
            'transition-duration': 5,
            '-webkit-transition-property': 5,
            '-moz-transition-property': 5,
            '-ms-transition-property': 5,
            '-o-transition-property': 5,
            'transition-property': 5,
            '-webkit-transform': 5,
            '-moz-transform': 5,
            '-ms-transform': 5,
            '-o-transform': 5,
            'transform': 5,
            '-webkit-transform-origin': 5,
            '-moz-transform-origin': 5,
            '-ms-transform-origin': 5,
            '-o-transform-origin': 5,
            'transform-origin': 5,
            '-webkit-animation': 5,
            '-moz-animation': 5,
            '-ms-animation': 5,
            '-o-animation': 5,
            'animation': 5,
            '-webkit-animation-name': 5,
            '-moz-animation-name': 5,
            '-ms-animation-name': 5,
            '-o-animation-name': 5,
            'animation-name': 5,
            '-webkit-animation-duration': 5,
            '-moz-animation-duration': 5,
            '-ms-animation-duration': 5,
            '-o-animation-duration': 5,
            'animation-duration': 5,
            '-webkit-animation-play-state': 5,
            '-moz-animation-play-state': 5,
            '-ms-animation-play-state': 5,
            '-o-animation-play-state': 5,
            'animation-play-state': 5,
            '-webkit-animation-timing-function': 5,
            '-moz-animation-timing-function': 5,
            '-ms-animation-timing-function': 5,
            '-o-animation-timing-function': 5,
            'animation-timing-function': 5,
            '-webkit-animation-delay': 5,
            '-moz-animation-delay': 5,
            '-ms-animation-delay': 5,
            '-o-animation-delay': 5,
            'animation-delay': 5,
            '-webkit-animation-iteration-count': 5,
            '-moz-animation-iteration-count': 5,
            '-ms-animation-iteration-count': 5,
            '-o-animation-iteration-count': 5,
            'animation-iteration-count': 5,
            '-webkit-animation-direction': 5,
            '-moz-animation-direction': 5,
            '-ms-animation-direction': 5,
            '-o-animation-direction': 5,
            'animation-direction': 5,
            'text-align': 5,
            '-webkit-text-align-last': 5,
            '-moz-text-align-last': 5,
            '-ms-text-align-last': 5,
            'text-align-last': 5,
            'vertical-align': 5,
            'white-space': 5,
            'text-decoration': 5,
            'text-emphasis': 5,
            'text-emphasis-color': 5,
            'text-emphasis-style': 5,
            'text-emphasis-position': 5,
            'text-indent': 5,
            '-ms-text-justify': 5,
            'text-justify': 5,
            'text-transform': 5,
            'letter-spacing': 5,
            'word-spacing': 5,
            '-ms-writing-mode': 5,
            'text-outline': 5,
            'text-wrap': 5,
            'text-overflow': 5,
            '-ms-text-overflow': 5,
            'text-overflow-ellipsis': 5,
            'text-overflow-mode': 5,
            '-ms-word-wrap': 5,
            'word-wrap': 5,
            'word-break': 5,
            '-ms-word-break': 5,
            '-moz-tab-size': 5,
            '-o-tab-size': 5,
            'tab-size': 5,
            '-webkit-hyphens': 5,
            '-moz-hyphens': 5,
            'hyphens': 5,
            'pointer-events': 5,
            'opacity': 6,
            'filter:progid:DXImageTransform.Microsoft.Alpha(Opacity': 6,
            '-ms-filter:\'progid:DXImageTransform.Microsoft.Alpha': 6,
            '-ms-interpolation-mode': 6,
            'color': 6,
            'border': 6,
            'border-width': 6,
            'border-style': 6,
            'border-color': 6,
            'border-top': 6,
            'border-top-width': 6,
            'border-top-style': 6,
            'border-top-color': 6,
            'border-right': 6,
            'border-right-width': 6,
            'border-right-style': 6,
            'border-right-color': 6,
            'border-bottom': 6,
            'border-bottom-width': 6,
            'border-bottom-style': 6,
            'border-bottom-color': 6,
            'border-left': 6,
            'border-left-width': 6,
            'border-left-style': 6,
            'border-left-color': 6,
            '-webkit-border-radius': 6,
            '-moz-border-radius': 6,
            'border-radius': 6,
            '-webkit-border-top-left-radius': 6,
            '-moz-border-radius-topleft': 6,
            'border-top-left-radius': 6,
            '-webkit-border-top-right-radius': 6,
            '-moz-border-radius-topright': 6,
            'border-top-right-radius': 6,
            '-webkit-border-bottom-right-radius': 6,
            '-moz-border-radius-bottomright': 6,
            'border-bottom-right-radius': 6,
            '-webkit-border-bottom-left-radius': 6,
            '-moz-border-radius-bottomleft': 6,
            'border-bottom-left-radius': 6,
            '-webkit-border-image': 6,
            '-moz-border-image': 6,
            '-o-border-image': 6,
            'border-image': 6,
            '-webkit-border-image-source': 6,
            '-moz-border-image-source': 6,
            '-o-border-image-source': 6,
            'border-image-source': 6,
            '-webkit-border-image-slice': 6,
            '-moz-border-image-slice': 6,
            '-o-border-image-slice': 6,
            'border-image-slice': 6,
            '-webkit-border-image-width': 6,
            '-moz-border-image-width': 6,
            '-o-border-image-width': 6,
            'border-image-width': 6,
            '-webkit-border-image-outset': 6,
            '-moz-border-image-outset': 6,
            '-o-border-image-outset': 6,
            'border-image-outset': 6,
            '-webkit-border-image-repeat': 6,
            '-moz-border-image-repeat': 6,
            '-o-border-image-repeat': 6,
            'border-image-repeat': 6,
            'outline': 6,
            'outline-width': 6,
            'outline-style': 6,
            'outline-color': 6,
            'outline-offset': 6,
            'background': 6,
            'filter:progid:DXImageTransform.Microsoft.AlphaImageLoader': 6,
            'background-color': 6,
            'background-image': 6,
            'background-repeat': 6,
            'background-attachment': 6,
            'background-position': 6,
            'background-position-x': 6,
            '-ms-background-position-x': 6,
            'background-position-y': 6,
            '-ms-background-position-y': 6,
            'background-clip': 6,
            'background-origin': 6,
            '-webkit-background-size': 6,
            '-moz-background-size': 6,
            '-o-background-size': 6,
            'background-size': 6,
            'box-decoration-break': 6,
            '-webkit-box-shadow': 6,
            '-moz-box-shadow': 6,
            'box-shadow': 6,
            'filter:progid:DXImageTransform.Microsoft.gradient': 6,
            '-ms-filter:\'progid:DXImageTransform.Microsoft.gradient': 6,
            'text-shadow': 6,
            'font': 7,
            'font-family': 7,
            'font-size': 7,
            'font-weight': 7,
            'font-style': 7,
            'font-variant': 7,
            'font-size-adjust': 7,
            'font-stretch': 7,
            'font-effect': 7,
            'font-emphasize': 7,
            'font-emphasize-position': 7,
            'font-emphasize-style': 7,
            'font-smooth': 7,
            'line-height': 7
        };
    },
    '2g': function (require, module, exports, global) {
        var orders = require('2f').orders;
        var times = 0;
        module.exports = {
            'block': function (tree) {
                var list = tree.list;
                if (!list[0] || list[0].type !== 'declaration')
                    return;
                list.sort(function (d1, d2) {
                    return (orders[d1.property.value] || 100) - (orders[d2.property.value] || 100);
                });
            }
        };
    },
    '2h': function (require, module, exports, global) {
        module.exports = {
            'io': require('i'),
            'Event': require('28'),
            'color': require('b'),
            'options': require('f'),
            'path': require('6'),
            'promise': require('e'),
            'state': require('27'),
            'tpl': require('7'),
            'util': require('4'),
            'watcher': require('2i')
        };
    },
    '2i': function (require, module, exports, global) {
        var _ = require('4'), options = require('f'), Event = require('28'), fs = null;
        function Watcher(options) {
            this.set({ persistent: false });
            this.set(options);
            this._files = options.files;
            this.files = {};
            this.running = false;
        }
        var w = options.mixTo(Watcher);
        Event.mixTo(Watcher);
        w.add = function (file) {
            var files = [];
            _.flatten(arguments).forEach(function (fullpath) {
                try {
                    var stat = fs.statSync();
                } catch (e) {
                }
                if (stat.isDirectory()) {
                }
                if (stat.isFile()) {
                }
            });
            return _.flatten(files);
        };
        w._add = function (fullpath) {
            this._files.push(file);
            if (this.running) {
            }
        };
        w.remove = function (fullpath) {
        };
        w.watch = function () {
            if (!this.running) {
                this.running = true;
                process.on('SIGINT', function () {
                    process.exit();
                });
                process.on('exit', function () {
                    self.emit('end');
                    ;
                    (callback || util.noop)();
                });
            }
        };
        w._watch = function (callback) {
            var self = this, watchers = {}, files = this.files, persistent = this.get('persistent');
            var changed = function (file) {
                for (var p in watchers)
                    watchers[p].close();
                self.trigger('change', file);
                callback();
            };
            for (var fullpath in files)
                if (files.hasOwnProperty(fullpath)) {
                    var file = files[fullpath];
                    fs.readFile(fullpath, 'utf-8', function (err, src) {
                        if (err)
                            return callback(err);
                        watchers[fullpath] = fs.watch(fullpath, { persistent: persistent }, _.throttle(function () {
                            fs.readFile(fullpath, 'utf-8', function (err, now) {
                                if (err && err.code == 'ENOENT')
                                    changed(fullpath);
                                else if (err)
                                    callback(err);
                                else if (now != src)
                                    changed(fullpath);
                            });
                        }, 100));
                    });
                }
        };
    }
}));