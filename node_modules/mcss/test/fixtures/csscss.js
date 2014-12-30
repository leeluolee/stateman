/**
 * Example csscss.js 
 * 60 line code base on mcss we can have a more powerful csscss
 * @type {[type]}
 */
var mcss = require('../../'),
    path = require('path'),
    node = mcss.node,
    // 改变颜色帮助识别console.log
    color = mcss.helper.color,
    rulesets = [], 
    // 允许的delaration最大重复率
    MAX_DUPLICATES = 6;

// use a map, achieve O(n) to find duplicates.
function findDupls(a, b){
    var alist = a.map,
        blist = b.map,
        duplicates = [];

    for(var i in blist){
        if(alist[i]) duplicates.push(i)
    }
    return duplicates;
}


// mcss 实例创建
mcss( {
    filename: path.join(__dirname, '../css/_large.css')

}).set('importCSS', true).walk('ruleset', function(ast){  // walker 片断
    // 获取ruleset的块中的declaration列表
    var list = ast.block.list,
        selector = node.toStr(ast.selector),
        res = {
            selector:selector, 
            filename:ast.filename,
            lineno: ast.lineno,
            map:{}
        },
        sign, map = res.map;

    list.forEach(function(declaration){

        if(declaration.type === 'declaration'){

            sign = node.toStr(declaration.property)+':'+mcss.node.toStr(declaration.value);
            if(!map[sign]) map[sign] = true;
        }
    });
    rulesets.push(res);

}).interpret().done(function(ast){
    var len = rulesets.length, 
        mapa, mapb, jlen, duplicates;

    for(; len-- ;){

        jlen = len; 
        mapa = rulesets[len];

        for(; jlen--;){
            mapb = rulesets[jlen];
            duplicates = findDupls(mapa, mapb);
            if(duplicates.length > MAX_DUPLICATES){
                
                console.log(
                    color(mapa.selector, 'red') + ' at ('+ color(mapa.filename + ':' + mapa.lineno, 'yellow') + ') and \n' +
                    color(mapb.selector, 'red') + ' at ('+ color(mapb.filename + ':' + mapb.lineno, 'yellow') + ') has ' + color(duplicates.length, 'blue') + ' duplicates:\n\t' +
                    duplicates.join(';\n\t')
                    )
            }
        }
    }
}).fail(function(err){
    throw err;
})

