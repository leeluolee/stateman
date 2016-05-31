
// MIT
// Thx Backbone.js 1.1.2  and https://github.com/cowboy/jquery-hashchange/blob/master/jquery.ba-hashchange.js
// for iframe patches in old ie.

var browser = require("./browser.js");
var _ = require("./util.js");


// the mode const
var QUIRK = 3,
  HASH = 1,
  HISTORY = 2;

// extract History for test
// resolve the conficlt with the Native History
function History(options){
  options = options || {};

  // Trick from backbone.history for anchor-faked testcase
  this.location = options.location || browser.location;

  // mode config, you can pass absolute mode (just for test);
  this.html5 = options.html5;
  this.mode = options.html5 && browser.history ? HISTORY: HASH;
  if( !browser.hash ) this.mode = QUIRK;
  if(options.mode) this.mode = options.mode;

  // hash prefix , used for hash or quirk mode
  this.prefix = "#" + (options.prefix || "") ;
  this.rPrefix = new RegExp(this.prefix + '(.*)$');
  this.interval = options.interval || 66;

  // the root regexp for remove the root for the path. used in History mode
  this.root = options.root ||  "/" ;
  this.rRoot = new RegExp("^" +  this.root);


  this.autolink = options.autolink!==false;
  this.autofix = options.autofix!==false;

  this.curPath = undefined;
}

_.extend( _.emitable(History), {
  // check the
  start: function(callback){
    var path = this.getPath();
    this._checkPath = _.bind(this.checkPath, this);

    if( this.isStart ) return;
    this.isStart = true;

    if(this.mode === QUIRK){
      this._fixHashProbelm(path);
    }

    switch ( this.mode ){
      case HASH:
        browser.on(window, "hashchange", this._checkPath);
        break;
      case HISTORY:
        browser.on(window, "popstate", this._checkPath);
        break;
      case QUIRK:
        this._checkLoop();
    }
    // event delegate
    this.autolink && this._autolink();
    this.autofix && this._fixInitState();

    this.curPath = path;

    this.emit("change", path, { firstTime: true});
  },

  // the history teardown
  stop: function(){

    browser.off(window, 'hashchange', this._checkPath);
    browser.off(window, 'popstate', this._checkPath);
    clearTimeout(this.tid);
    this.isStart = false;
    this._checkPath = null;
  },

  // get the path modify
  checkPath: function(/*ev*/){

    var path = this.getPath(), curPath = this.curPath;

    //for oldIE hash history issue
    if(path === curPath && this.iframe){
      path = this.getPath(this.iframe.location);
    }

    if( path !== curPath ) {
      this.iframe && this.nav(path, {silent: true});
      this.curPath = path;
      this.emit('change', path);
    }
  },

  // get the current path
  getPath: function(location){
    location = location || this.location;
    var tmp;

    if( this.mode !== HISTORY ){
      tmp = location.href.match(this.rPrefix);
      return _.cleanPath(tmp && tmp[1]? tmp[1]: "");

    }else{
      return _.cleanPath(( location.pathname + location.search || "" ).replace( this.rRoot, "/" ));
    }
  },

  nav: function(to, options ){

    var iframe = this.iframe;

    options = options || {};

    to = _.cleanPath(to);

    if(this.curPath == to) return;

    // pushState wont trigger the checkPath
    // but hashchange will
    // so we need set curPath before to forbit the CheckPath
    this.curPath = to;

    // 3 or 1 is matched
    if( this.mode !== HISTORY ){
      this._setHash(this.location, to, options.replace);
      if( iframe && this.getPath(iframe.location) !== to ){
        if(!options.replace) iframe.document.open().close();
        this._setHash(this.iframe.location, to, options.replace);
      }
    }else{
      this._changeState(this.location, options.title||"", _.cleanPath( this.root + to ), options.replace )
    }

    if( !options.silent ) this.emit('change', to);
  },
  _autolink: function(){
    if(this.mode!==HISTORY) return;
    // only in html5 mode, the autolink is works
    // if(this.mode !== 2) return;
    var self = this;
    browser.on( document.body, "click", function(ev){

      var target = ev.target || ev.srcElement;
      if( target.tagName.toLowerCase() !== "a" ) return;
      var tmp = browser.isSameDomain(target.href)&&(browser.getHref(target)||"").match(self.rPrefix);

      var hash = tmp && tmp[1]? tmp[1]: "";

      if(!hash) return;

      ev.preventDefault && ev.preventDefault();
      self.nav( hash );
      return (ev.returnValue = false);
    } );
  },
  _setHash: function(location, path, replace){
    var href = location.href.replace(/(javascript:|#).*$/, '');
    if (replace){
      location.replace(href + this.prefix+ path);
    }
    else location.hash = this.prefix+ path;
  },
  // for browser that not support onhashchange
  _checkLoop: function(){
    var self = this;
    this.tid = setTimeout( function(){
      self._checkPath();
      self._checkLoop();
    }, this.interval );
  },
  // if we use real url in hash env( browser no history popstate support)
  // or we use hash in html5supoort mode (when paste url in other url)
  // then , history should repara it
  _fixInitState: function(){
    var pathname = _.cleanPath(this.location.pathname), hash, hashInPathName;

    // dont support history popstate but config the html5 mode
    if( this.mode !== HISTORY && this.html5){

      hashInPathName = pathname.replace(this.rRoot, "");
      if(hashInPathName) this.location.replace(this.root + this.prefix + _.cleanPath(hashInPathName));

    }else if( this.mode === HISTORY /* && pathname === this.root*/){

      hash = this.location.hash.replace(this.prefix, "");
      if(hash) this._changeState( this.location, document.title, _.cleanPath(this.root + hash));
    }
  },
  // ONLY for test, forbid browser to update 
  _changeState: function(location, title, path, replace){
    var history = location.history || window.history;
    return history[replace? 'replaceState': 'pushState']({}, title , path)
  },
  // Thanks for backbone.history and https://github.com/cowboy/jquery-hashchange/blob/master/jquery.ba-hashchange.js
  // for helping stateman fixing the oldie hash history issues when with iframe hack
  _fixHashProbelm: function(path){
    var iframe = document.createElement('iframe'), body = document.body;
    iframe.src = 'javascript:;';
    iframe.style.display = 'none';
    iframe.tabIndex = -1;
    iframe.title = "";
    this.iframe = body.insertBefore(iframe, body.firstChild).contentWindow;
    this.iframe.document.open().close();
    this.iframe.location.hash = '#' + path;
  }

});

module.exports = History;
