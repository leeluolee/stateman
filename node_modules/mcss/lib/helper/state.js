function ex(o1, o2, override){
    for (var i in o2) if (o1[i] == null || override) {
        o1[i] = o2[i];
    }
};

var API = {
    // store intermidia state
    state: function(state){
        var _states = this._states || (this._states = [])
        return _states.some(function(item){
            return item === state
        })
    },
    // enter some state
    enter: function(state){
        var _states = this._states || (this._states = []);
        _states.push(state)
    },
    // enter some state
    leave: function(state){
        var _states = this._states || (this._states = []);
        if(!state || state === _states[_states.length-1]) _states.pop();
    }

}

exports.mixTo = function(obj){
    obj = typeof obj == "function" ? obj.prototype : obj;
    ex(obj, API)
}
