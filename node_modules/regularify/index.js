// regularify plugin
var through = require("through");
var parse = require("regularjs/src/node.js").parse;

var DEFAULT_EXTENSIONS = ['rgl', 'regular'];

function wrap(str, options){
  options =options || {};
  var code = parse(str, {BEGIN: options.BEGIN, END: options.END}) ;

  code = 'module.exports=' + code + '';
  return code;
}

module.exports = function(option){
  option = option || {};

  if(Array.isArray(option)) option = {extensions: option}

  var extensions = ( option.extensions || [] ).concat( DEFAULT_EXTENSIONS );
  var BEGIN = option.BEGIN, END = option.END;



  var rMatch = new RegExp ("\\." + extensions.join("|") + "$")


  return function(file){
    var input = "";
    function write(buffer){
      input += buffer;
    }
    function end(){
      this.queue(wrap(input, {BEGIN: BEGIN, END: END} ));
      this.queue(null);
    }
    var test = rMatch.test(file);
    if(!test) return through();
    else  return through(write, end)
  }
};