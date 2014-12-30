var mcss = require('../');
var path = require('path');

//每次生成都修改后缀
var instance = mcss({
    filename: path.join(__dirname, 'mcss/_large.mcss')
})

//后续修改参数
instance.set('importCSS', true)
  .walk('url', function(ast){
    ast.value += '?v' + Data.now();
  })

// 获取节点
instance.interpret()//获得一个promise对象
  .done(function(ast){
    // the ast is changed
})
// 或输出修改后的css
instance.translate()//获得一个promise对象
  .done(function(cssContent){
    // the cssContent is changed
})
