var _ = require("./util.js");

// normal lize the path
function normalizeRegexp(path, keys){

  if(_.typeOf(path) === "regexp") return path

  var normPath = "^" + 
    // the optional end lash
    normalizePath(("/" + path + "/?"), keys) //
      .replace(/([\/.])/g, "\\$1")
      .replace(/(\*{2,})|(\*(?!\*))/g, function(all, mult, single){

        if(mult) return "(?:.*)";
        else return "(?:[^\\/]*)";

      }) + "$";

  return new RegExp( normPath );
}

// normalize the path
function normalizePath(path, keys, index) {
  index = index || 0

  return path.replace(/(\/)+/g, "\/") 
    //  /?        hello             :id                                    (regexp)
    .replace(/(\/)?(?:(?:\((.+)\))|:([\w-]+)(?:\(([^:\(\)]+)\))?|\(([^\(\)]+)\))/g, function(_, slash, capture, key, keyformat) {

      if(capture){
        keys && keys.push(index++)
        var res = normalizePath(capture, keys, index) // sub capture detect
        return (slash ? "(?:/(" : "(") + res + (slash ? "))" : ")")
      }

      keys && keys.push(key)
      return (slash ? "(?:/" : "") + "("+(keyformat || "[\\w-]+")+")" + (slash ? ")" : "")
    })

}

function State( ){
  this._states = {};
  this.keys = []
}


_.extend( _.emitable( State ), {

  state: function(stateName, config){
    var current, next, nextName, states = this._states, i=0;

    if( typeof stateName === "string" ) stateName = stateName.split(".");

    var slen = stateName.length, current = this;


    do{
      nextName = stateName[i];
      next = states[nextName];
      if(!next){
        if(!config) return;
        next = states[nextName] = new State();
        _.extend(next, {
          parent: current,
          stateName: stateName.join("."),
          currentName: nextName
        })
        current.hasNext = true;
        next.configUrl();
      }
      current = next;
      states = next._states;
    }while((++i) < slen )

    if(config){
       next.config(config);
       return this;
    } else {
      return current;
    }
  },

  config: function(configure){
    if(!configure ) return;
    configure = this._getConfig(configure);

    for(var i in configure){
      var prop = configure[i];
      switch(i){
        case "url": 
          if(typeof prop === "string"){
            this.url = prop;
            this.configUrl();
          }
          break;
        case "events": 
          this.on(prop)
          break;
        default:
          this[i] = prop;
      }
    }
  },

  // children override
  _getConfig: function(configure){
    return typeof configure === "function"? {enter: configure} : configure;
  },

  configUrl: function(){
    var url = "" , base = this, currentUrl;
    var _watchedParam = [];

    this.keys = [];


    while( base ){

      url = (typeof base.url === "string" ? base.url: (base.currentName || "")) + "/" + url;

      if(base === this){
        // url.replace(/\:([-\w]+)/g, function(all, capture){
        //   _watchedParam.push()
        // })
        this._watchedParam = _watchedParam.concat(this.watched || []);
      }
      // means absolute;
      if(url.indexOf("^/") === 0) {
        url = url.slice(1);
        break;
      }
      base = base.parent;
    }
    this.path = _.cleanPath("/" + url);
    var pathAndQuery = this.path.split("?");
    this.path = pathAndQuery[0];
    // some Query we need watched
    if(pathAndQuery[1]){
      this._watchedQuery = pathAndQuery[1].split("&");
    }
    this.regexp = normalizeRegexp(this.path, this.keys);
  },
  match: function( path ){
    var matched = this.regexp.exec(path),
      keys = this.keys;

    if(matched){

      var param = {};

      for(var i =0,len=keys.length;i<len;i++){
        param[keys[i]] = matched[i+1] 
      }

      return param;
    }else{

      return false;
    }
  }

})


module.exports = State;