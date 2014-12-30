// inspired by // templayed.js(mini mustache 1.26k minify)
// So this version is mini templayed.js :)  (0.66k)
// just for mcss's simple outport format, 
// not intended to contrast any template

// Speed && Size ​comparison should be based on functional
// @leeluolee http://weibo.com/luolee

function tpl(template) {
    var i = 0;
    function get(p) {return p == '.'? '': '.' + p; }
    function replace(str) {
      var codes = [],pre = str;
      while(str = str.replace(/^\{\s*([\.-\w]*?)\s*}|\{#([\.-\w]*?)}([\s\S]*?)\{\/\2}|([^{]*)/, 
        function(all, tagname, blockname, blockcontent, raw){
        if(raw) codes.push(['s+="', raw , '";'].join(''));
        else if(tagname) codes.push(['s+=vars', get(tagname), '||"";'].join(''))
        else if(blockname){
          var k = ++i;
          codes.push(['var o', k, '=vars', get(blockname), ';', 'o', k,' = o', k, ' instanceof Array? o',k,':[o', k, ']'
          ,';for(var i', k, '=0;i', k, '<o', k, '.length;i', k, '++)',
          '{var tmp', k,'=vars; vars=o', k, '[i', k, ']; ', replace(blockcontent), 'vars=tmp', k,'}'].join(''))
        }
        return '';
      })){
        if(str === pre) throw 'unexpect at \n' + str;
        pre = str;
      }
      return codes.join('');
    }
    return new Function('vars',['var s = "";' ,replace(template.replace(/\n/g, "\\n").replace(/"/g,'\\"')), 'return s;'].join(''));
};
module.exports = tpl;

// console.log(tpl('{hello}\n{#arr}{#arr2}\n{name} 100px{/arr2}{/arr}{#s}{.}{/s}')({
//   'hello': 1,
//   arr: [{
//     arr2: [{name: 'name1'}, {name:'name2'}]
//   },{
//     arr2: [{name: 'name3'}, {name:'name4'}]
//   }],
//   s: ['zhenga', 'zheng2', 'zheng3']
// }))

// console.log(tpl('{hello}\n{#arr}{#arr2}\n{name} 100px{/arr2}{/arr}{#s}{.}{/s}').toString());
