var prefixs = require('../helper/properties').prefixs;
var _ = require('../helper/util');
var tree = require('../node');

var isTestProperties = _.makePredicate('border-radius transition');

module.exports = {
    // 只访问一个节点
    "block": function(tree){
        var list = tree.list,
            len = list.length;
        for(; len--;){
            var declaration = list[len];
            if(isTestProperties(declaration.property)){
                list.splice(len, 0, 
                    declaration.clone('-webkit-' + declaration.property),
                    declaration.clone('-moz-' + declaration.property),
                    declaration.clone('-mz-' + declaration.property),
                    declaration.clone('-o-' + declaration.property)
                    )
            }
        }
    }
}