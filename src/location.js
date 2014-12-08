
var browser = require("./browser.js");
var _ = require("./util.js");

// the location exports
var l = module.exports = {};


// the mode const
var QUIRK = 3,
  HASH = 1,
  HISTORY = 2;

// All Regexp
var rHash = /#(.*)$/,   // hash
  rRoot;                // the root remover

// regist the path change event
var registers = [];


// get the current Path from hash or location.url(mode === HISTORY)
function getPath(path){

  var tmp;
  if(l.mode !== HISTORY){
    tmp = location.href.match(rHash);
    return tmp && tmp[1]? tmp[1]: "";

  }else{
    return _.cleanPath( location.pathname + location.search || "" )
      .replace( rRoot, "" )

  }
}

function loop(){
  checkPath();
  setTimeout(loop, 60);
}


// notifyAll registers when path changed 
function notifyAll( path ){

  var len = registers.length;

  for( ;len-- ; ){
    registers[len]( path );
  }

}

// check the current path
function checkPath(){
  var path = getPath();
  if(path !== l.currentPath) {
    currentPath = path;
    notifyAll(currentPath)
  }
}



//whether the location is running already
l.isStart = false;


// default location's mode is hash
// 
//  - 1: `#/a/b`   hash
//  - 2: `/a/b`   html5 history
//  - 3: `#/a/b` hash in ie < 8
l.mode = HASH;
l.suffix = "";
l.root = "/";
l.currentPath = undefined;


// start the location detect
// *the location service can  be only started once*
// 
l.start = function start( options ){
  options = options || {};
  if(l.isStart) return console.error("history is started");
  else l.isStart = true;


  l.mode = options.html5 && browser.history ? HISTORY: HASH; 
  if( !browser.hash ) l.mode = l.mode | HISTORY;

  l.root = options.root || "/";

  if(options.suffix) l.suffix = options.suffix;
  
  rRoot = new RegExp("^" + l.suffix + l.root);

  switch (l.mode){
    case HASH: 
      browser.on(window, "hashchange", checkPath); break;
    case HISTORY:
      browser.on(window, "popstate", checkPath); break;
    case QUIRK:
      loop();
  }

  // the initialized checking
  checkPath();
}

l.nav = function(path, options){
  options = options || {};

  if(l.currentPath == path) return;

  l.currentPath = path;

  // 3 or 1 is matched
  if(l.mode & HASH){
    location.hash = "#" + path;

  }else{
    history.pushState({}, document.title, _.cleanPath(l.root + path))

  }

  if(!options.silent) notifyAll(path);
}

l.regist = function( cb ){
  cb && registers.push(cb);
}















