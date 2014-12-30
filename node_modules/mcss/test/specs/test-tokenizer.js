// if(typeof require !== 'undefined') var ness = require('../../lib/index.js')
var tk = mcss.tokenizer

Function.prototype.perf = function(times, args){
    var date = +new Date;
    for(var i = 0; i < times; i++){
        this.apply(this, args || []);
    }
    console.log(+new Date - date, this.name);
}


var http = function(url, callback){
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false)
    xhr.onreadystatechange = function(e){
        if(xhr.readyState === 4 && xhr.status === 200){
            callback(xhr.responseText);
        }
    }
    xhr.send()
}



// test1. charCode 速度原高于index
// var str = new Array(1000000).join('ajdskjd');
// var index = 1000
// ;(function index(){
//     str[index++]
// }).perf(100000)
// index = 1000
// ;(function charAt(){
//     str.charAt(index++)
// }).perf(100000)

function testToken(tk, arr, t){
    for(var i = 0 ;i < arr.length; i++){
        t.equal(tk.lex().type, arr[i], 'next type must be: '+ arr[i])
    }
}


// this.tokenizer = {
//     "punctor list must return": function(t){
//         var token = tk("#hello{})(;:,")
//         testToken(token, ["HASH","{", "}", ")", "(", ";", ":", ","], t);
//         t.done()
//     },
//     "must eat the comment\n\r": function(t){
//         var token = tk("/*hellotest*/", {
//             comment: true
//         })
//         var next = token.lex()
//         t.deepEqual(next, {type: 'COMMENT', val: "hellotest"}, 'must comment')
//         t.done()
//     },
//     "must ignored the whitespace": function(t){
//         var token = tk("/*hellotest*/ {   \t}")
//         testToken(token, ["COMMENT","{",  "}"], t);
//         t.done()
//     },
//     "must eat the flag": function(t){
//         var token = tk("!important/*hellotest*/ ")
//         t.equal(token.lex().type, 'IMPORTANT', 'must eat important');
//         t.equal(token.lex().type, 'COMMENT', 'must comment');
//         t.equal(token.lex().type, 'WS', 'must hit the eof');
//         t.done();
//     },
//     "must eat the newline": function(t){
//         var token1 = tk("\r\n");
//         t.equal(token1.lex().type, 'NEWLINE', 'must match the new line')
//         t.equal(token1.lex().type, 'EOF', 'join the \\r\\n ,so hit the eof')

//         var token = tk("\n \r \f");
//         t.equal(token.lex().type, 'NEWLINE', 'must match the new line\\n')
//         t.equal(token.lex().type, 'NEWLINE', 'must match the new line\\r')
//         t.equal(token.lex().type, 'NEWLINE', 'must match the new line\\f')
//         t.equal(token.lex().type, 'EOF', 'then hit the eof')

//         t.done()
//     },
//     "must eat the selector": function(d){
//         // var selectors = selector_test.join(",");
//         // var token = tk(selectors);
//         // var t;
//         // while(t = token.lex()){
//         //     // console.log(t);
//         //     if(t.type == 'EOF') break;
//         // }
//         d.done()
//     }
// }

// http('../data/parse.mcss',function(text){

//     (function(){
//         var token = tk(text, {ignoreComment:true});
//         while(t = token.lex()){
//             console.log(t, token.lineno);
//             if(t.type == 'EOF') break;
//         }
//     })()
// });

