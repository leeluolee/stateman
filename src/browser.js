
var win = window, 
  doc = document;



var b = module.exports = {
  hash: "onhashchange" in win && (!doc.documentMode || doc.documentMode > 7),
  history: win.history && "onpopstate" in win,

  on: "attachEvent" in win ? 
      function(node,type,cb){return node.attachEvent( "on" + type, cb )}
    : function(node,type,cb){return node.addEventListener( type, cb )},
    
  off: "detachEvent" in win ? 
      function(node,type,cb){return node.detachEvent( "on" + type, cb )}
    : function(node,type,cb){return node.removeEventListener( type, cb )}
}


