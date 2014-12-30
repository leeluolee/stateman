// simplest event emitter 60 lines
// ===============================
var slice = [].slice,
    ex = function(o1, o2, override){
        for (var i in o2) if (o1[i] == null || override) {
            o1[i] = o2[i];
        }
    };
var API = {
    on: function(event, fn) {
        if(typeof event === 'object'){
            for (var i in event) {
                this.on(i, event[i]);
            }
        }else{
            var handles = this._handles || (this._handles = {}),
                calls = handles[event] || (handles[event] = []);
            calls.push(fn);
        }
        return this;
    },
    off: function(event, fn) {
        if(event) this._handles = [];
        if(!this._handles) return;
        var handles = this._handles,
            calls;

        if (calls = handles[event]) {
            if (!fn) {
                handles[event] = [];
                return this;
            }
            for (var i = 0, len = calls.length; i < len; i++) {
                if (fn === calls[i]) {
                    calls.splice(i, 1);
                    return this;
                }
            }
        }
        return this;
    },
    trigger: function(event){
        var args = slice.call(arguments, 1),
            handles = this._handles,
            calls;
        if (!handles || !(calls = handles[event])) return this;
        for (var i = 0, len = calls.length; i < len; i++) {
            calls[i].apply(this, args)
        }
        return this;
    },
    hasEvent: function(event){
        var handles = this._handles;
        return handles && (calls = handles[event]) && calls.length;
    }
}
// container class
function Event(handles) {
    if (arguments.length) this.on.apply(this, arguments);
};
ex(Event.prototype, API)

Event.mixTo = function(obj){
    obj = typeof obj == "function" ? obj.prototype : obj;
    ex(obj, API)
}
module.exports = Event;
