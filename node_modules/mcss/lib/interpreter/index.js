var Interpreter = require('./interpreter');

module.exports = Interpreter;

// exports.interpret = function(ast, options){
//     if(typeof ast === 'string'){
//         ast = Parser.parse(ast, options);
//     }
//     return new Interpreter(options).interpret(ast);
// }

// exports.Interpreter = Interpreter;