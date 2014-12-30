
var tpl = require('./helper/tpl');
var color = require('./helper/color');



/**
 * All other Error like Reference Error, Type Error
 * this errors all occurs after parse step(interpret、translator、hook...) 
 * 
 * @param {String} message  the error.message
 * @param {Number} line     the line error ocurr
 */
function McssError(message, line, options){
    this.message = message;
    this.line = line;
    this.filename = options.filename;
    this.source = options.imports[options.filename];
    Error.captureStackTrace(this, McssError);
}
McssError.prototype.__proto__ = Error.prototype;
McssError.prototype.name = 'McssError';

/**
 * Error occur at tokenize or parser step
 * 
 * @param {String} message 
 * @param {Number} line    
 */
function SyntaxError(message, line, options){
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
exports.isMcssError = function(error){
    return error instanceof SyntaxError || error instanceof McssError;
}

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
}

exports.format = function(error){
    if(!exports.isMcssError(error)){
        return error;
    }
    var source = error.source,
        lines = source.split(/\r\n|[\r\f\n]/),
        pos = error.pos,
        message = error.message,
        line = error.line || 1,
        column = error.column || 0,
        start = Math.max(1, line - 5),
        end = Math.min(lines.length, line + 4),
        res = [color(error.name + ':' + message, 'red', null, 'bold') ,'\tat (' + color(error.filename,'yellow') + ' : '+ line + ')' ];

    for(var i = start; i <= end ; i++){
        var cur = lines[i-1], info;
        if(i === line) {
            info = color('>>', 'red', null, 'bold') + getLineNum(i) + '| ' + cur.slice(0, column) + color(cur.slice(column), 'white', 'red')
        }else{
            info = '  ' + getLineNum(i) + '| ' + cur;
        }
        res.push(info);
    }
    error.message = res.join('\n');
    return error;
}

function getLineNum(line){
    return ('           ' + line).slice(-5) + '.';
}


var newline = /^[\n\f\r]/;
function getLoc(pos, input){
    var n = pos, column = -1, line;
    for(; n--;){
        if(newline.test(input.charAt(n)) && n >= 0) break;
        column ++;
    }
    line = (input.slice(0, pos).match(/\r\n|[\r\f\n]/g) || '').length;
    return { line: line, column: column }
}