var _ = require('./util');
var tree = require('../node');

// Function.prototype.op_accept = function(list){
//     var test = typeof list === 'function' ? list : _.makePredicate(list);
//     var fn = this;
//     return function(left, right){
//         // means invalid 
//         if( !test(tree.inspect(left)) ||
//             !test(tree.inspect(right))){
//             console.log(left, right, tree.inspect(left))
//             throw Error('invalid actors to operation' + right.lineno)
//         } 
//         return fn.apply(this,arguments) 
//     }
// }

// for % sprintf operation
var formats = {
    'd' : function(value){
        return parseInt(value.value, 10).toString(10);
    },
    'f': function(value){
        return parseFloat(value.value, 10).toString(10);
    },
    'x': function(value){
        return parseInt(value.value, 10).toString(16);
    },
    'X': function(value){
        return parseInt(value.value, 10).toString(16).toUpperCase();
    },
    's': function(value){
        return tree.toStr(value)
    }
}



var $ = module.exports = {
    '+': _.accept(function(left, right){
        var value = left.value + right.value;
        var unit = left.unit || right.unit;
        if(left.type === 'DIMENSION' && right.type === 'DIMENSION'){
            if(left.unit && right.unit && left.unit !== right.unit) _.warn('unmatched unit, forced 2rd unit equal with the 1st one')
            return {type: left.type, value: value, unit: unit, lineno: left.lineno}
        }else{
            return {type: left.type === 'DIMENSION'? right.type: left.type, value: tree.toStr(left) + tree.toStr(right), lineno: left.lineno}
        }
    },['TEXT DIMENSION STRING', 'TEXT DIMENSION STRING']),

    '-': _.accept(function(left, right){
        var value = left.value - right.value;
        var unit = left.unit || right.unit;
        if(left.unit && right.unit && left.unit !== right.unit) _.warn('unmatched unit, forced 2rd unit equal with the 1st one')
        return {type: left.type, value: value, unit: unit, lineno: left.lineno}
    },['DIMENSION', 'DIMENSION']),

    '*': _.accept(function(left, right){
        var value = left.value * right.value;
        var unit = left.unit || right.unit;
        if(left.unit && right.unit && left.unit !== right.unit) _.warn('unmatched unit, forced 2rd unit equal with the 1st one')
        return {type: left.type, value: value, unit: unit, lineno: left.lineno}
    },['DIMENSION', 'DIMENSION']),

    '/': _.accept(function(left, right){
        if(right.value === 0) throw 'Divid by zero' + right.lineno;
        
        var value = left.value / right.value;
        var unit = left.unit || right.unit;

        if(left.unit && right.unit && left.unit !== right.unit) _.warn('unmatched unit, forced 2rd unit equal with the 1st one')

        return {type: left.type, value: value, unit: unit};
    },['DIMENSION', 'DIMENSION']),
    // @TODO: sprintf
    '%': _.accept(function(left, right){
        if(left.type === 'STRING'){ // sprintf
            var values = right.list || [right],
                index = 0;
            var value = left.value.replace(/\%(x|f|s|d|X)/g, function(all, format){
                var replace = values[index]
                if(!replace) return '';
                index++;
                return formats[format](replace);
            })
            return {type: 'STRING', value: value, lineno: left.lineno};
        }else{
            if(right.value === 0) throw 'Divid by zero' + right.lineno;

            var value = left.value % right.value;
            var unit = left.unit || right.unit;

            if(left.unit && right.unit && left.unit !== right.unit) _.warn('unmatched unit, forced 2rd unit equal with the 1st one')

            return {type: left.type, value: value, unit: unit, lineno:left.lineno};
        }
    },['DIMENSION STRING']),

    'relation': function(left, right, op){
        var bool = {type: 'BOOLEAN', lineno: left.lineno}
        var lv = left.value,
            rv = right.value,
            lt = left.type,
            rt = right.type,
            bv;
        if(lt !== rt){
            if(~'STRING TEXT'.indexOf(lt) && ~'STRING TEXT'.indexOf(rt)){
                if(lv !== rv) bv = op === '!=';
                else bv = op === '==';
            }else{
                bv = op === '!=';
            }
        }else{
            if(lt === 'DIMENSION'){
                if(lv > rv) bv = op === '>' || op === '>=' || op === '!=';
                if(lv < rv) bv = op === '<' || op === '<=' || op === '!=';
                if(lv === rv) bv = op === '==' || op === '>=' || op === '<=';
            }else{
                if(tree.toStr(left) !== tree.toStr(right)) bv = op === '!=';
                else bv = op === '==';
            }
        }
        bool.value = bv;
        return bool;
    },

    '&&': function(left, right){
        var bool = tree.toBoolean(left);
        if(!bool) return left;
        return this.walk? this.walk(right) : right;
    },

    '||': function(left, right){
        var bool = tree.toBoolean(left)
        if(bool) return left;
        return this.walk? this.walk(right) : right;
    }
}