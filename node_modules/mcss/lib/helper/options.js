var _ = require('./util');
var API = {
    set: _.msetter(function(name, value){
        options = this.options || (this.options = {});
        options[name] = value;
        return this;
    }),
    get: function(name){
        options = this.options || (this.options = {});
        return options[name];
    },
    has: function(name, value){
        if(!value) return !!this.get(name);
        return this.get(name) === value;
    },
    del: function(name){
        options = this.options || (this.options = {});
        delete options[name];
    },
    add: function(name, item){
        options = this.options || (this.options = {});
        if(!options[name]) options[name] = [];
        var container = options[name];
        if(container instanceof Array){
            container.push(item)
        }
        return this;
    }
}

exports.mixTo = function(obj){
    obj = typeof obj == "function" ? obj.prototype : obj;
    return _.extend(obj, API)
}
