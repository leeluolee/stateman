var win = window,
    doc = document;

module.exports = {
  hash: "onhashchange" in win && (!doc.documentMode || doc.documentMode > 7),
  history: win.history && "onpopstate" in win,
  location: win.location,
  isSameDomain: function(url){
    var matched = url.match(/^.*?:\/\/([^/]*)/);
    if(matched){
      return matched[0] == this.location.origin;
    }
    return true;
  },
  getHref: function(node){
    return "href" in node ? node.getAttribute("href", 2) : node.getAttribute("href");
  },
  on: "addEventListener" in win ?  // IE10 attachEvent is not working when binding the onpopstate, so we need check addEventLister first
      function(node,type,cb){return node.addEventListener( type, cb )}
    : function(node,type,cb){return node.attachEvent( "on" + type, cb )},

  off: "removeEventListener" in win ? 
      function(node,type,cb){return node.removeEventListener( type, cb )}
    : function(node,type,cb){return node.detachEvent( "on" + type, cb )}
}
