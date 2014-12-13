var browser = require("./browser.js");
var _ = require("./util.js");


// the mode const
var QUIRK = 3,
  HASH = 1,
  HISTORY = 2;


// extract History for test
// resolve the conficlt with the Native History
function Histery(options){

  // Trick from backbone.history for anchor-faked testcase 
  this.location = options.location || browser.location;

  // mode for start
  this.mode = options.html5 && browser.history ? HISTORY: HASH; 
  if( !browser.hash ) this.mode = this.mode | HISTORY;

  // hash prefix , used for hash or quirk mode
  this.prefix = "#" + (options.prefix || "") ;
  this.rPrefix = new RegExp(this.prefix + '(.*)$');

  // the root regexp for remove the root for the path. used in History mode
  this.root = options.root ||  "/" ;
  this.rRoot = new RegExp("^" +  this.root);

  this.curPath = undefined;
}

_.extend( _.emitable(Histery), {
  // check the 
  start: function(){
    this._checkPath = _.bind(this.checkPath, this);

    if( this.isStart ) return;
    this.isStart = true;

    switch ( this.mode ){
      case HASH: 
        browser.on(window, "hashchange", this._checkPath); break;
      case HISTORY:
        browser.on(window, "popstate", this._checkPath); break;
      case QUIRK:
        this._checkLoop();
    }

    this.checkPath();
  },
  // the history teardown
  stop: function(){

    browser.off(window, 'hashchange', this._checkPath)  
    browser.off(window, 'popstate', this._checkPath)  
    clearTimeout(this.tid);
    this.isStart = false;
    this._checkPath = null;
  },
  // get the path modify
  checkPath: function(){

    var path = this.getPath();

    if( path !== this.curPath ) {
      this.emit('change', ( this.curPath = _.cleanPath(path)) );
    }
  },
  // get the current path
  getPath: function(){
    var location = this.location, tmp;
    if( this.mode !== HISTORY ){
      tmp = location.href.match(this.rPrefix);
      return tmp && tmp[1]? tmp[1]: "";

    }else{
      return _.cleanPath(( location.pathname + location.search || "" ).replace( this.rRoot, "/" ))
    }
  },

  nav: function(to, options ){

    options = options || {};

    to = _.cleanPath(to);

    if(this.curPath == to) return;

    this.curPath = to;

    // 3 or 1 is matched
    if( this.mode !== HISTORY ){
      this.location.hash = "#" + to;
    }else{
      history[ options.replace? 'replaceState': 'pushState' ]( {}, options.title || "" , _.cleanPath( this.root + to ) )
    }

    if(options.force) this.emit('change', to);
  },
  // for browser that not support onhashchange
  _checkLoop: function(){

    this.checkPath();
    this.tid = setTimeout( _.bind( this._checkLoop, this ), this.delay || 66 );
  }
  
})



module.exports = Histery;