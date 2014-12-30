var Symtable = exports.SymbolTable =  function(){

}
/**
 * ## TODO:
 * 
 * 1. Global
 * 2. Local
 * 3. Struct
 * 4. AtMethod Scope
 */

var Scope = exports.Scope = function(parentScope){
    // this.scopeName = scopeName;
    this.parentScope = parentScope;
    this.symtable = {};
    this.isStruct = false;
}

Scope.prototype = {
    getSpace: function(){
        return this.symtable;
    },
    resolve: function(name, first){
        var scope = this;
        while(scope){
            var symbol = scope.symtable[name];
            if(symbol) return symbol;
            else{
                if(first) return;
                scope = scope.parentScope;
            }
        }
    },
    define: function(name, value){
        this.symtable[name] = value;
        return this;
    },
    getOuterScope: function(){
        return this.parentScope;
    },
    has: function(value){
        var symtable = this.symtable;
        for(var i in symtable) if (symtable.hasOwnProperty(i)){
            if(symtable[i] == value ){
                return true
            }
        }
        return false;
    },
    toStruct: function(){
        var scope = new Scope();
        scope.isStruct = true;
        scope.symtable = this.symtable
        return scope;
    }
}


