var orders = require('../helper/properties').orders;

var times = 0;
module.exports = {
    'block':function(tree){
        var list = tree.list;
        if(!list[0] || list[0].type !== 'declaration') return;
        list.sort(function(d1, d2){
            return (orders[d1.property.value] || 100) - (orders[d2.property.value] || 100);
        })
    }
}