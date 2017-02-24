var _ = require("./util.js");

function State(option){
  this._states = {};
  this._pending = false;
  this.visited = false;
  if(option) this.config(option);
}


//regexp cache
State.rCache = {};

_.extend( _.emitable( State ), {

  getTitle: function(options){
    var cur = this ,title;
    while( cur ){
      title = cur.title;
      if(title) return typeof title === 'function'? cur.title(options): cur.title
      cur = cur.parent;
    }
    return title;
  },


  state: function(stateName, config){
    if(_.typeOf(stateName) === "object"){
      var keys = _.values(stateName, true);
      keys.sort(function(ka, kb){
        return _.countDot(ka) - _.countDot(kb);
      });

      for(var i = 0, len = keys.length; i< len ;i++){
        var key = keys[i];
        this.state(key, stateName[key])
      }
      return this;
    }
    var current = this, next, nextName, states = this._states, i=0;

    if( typeof stateName === "string" ) stateName = stateName.split(".");

    var slen = stateName.length;
    var stack = [];

    do{
      nextName = stateName[i];
      next = states[nextName];
      stack.push(nextName);
      if(!next){
        if(!config) return;
        next = states[nextName] = new State();
        _.extend(next, {
          parent: current,
          manager: current.manager || current,
          name: stack.join("."),
          currentName: nextName
        });
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
          this.on(prop);
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

  //from url
  configUrl: function(){
    var url = "" , base = this;

    while( base ){

      url = (typeof base.url === "string" ? base.url: (base.currentName || "")) + "/" + url;

      // means absolute;
      if(url.indexOf("^/") === 0) {
        url = url.slice(1);
        break;
      }
      base = base.parent;
    }
    this.pattern = _.cleanPath("/" + url);
    var pathAndQuery = this.pattern.split("?");
    this.pattern = pathAndQuery[0];
    // some Query we need watched

    _.extend(this, _.normalize(this.pattern), true);
  },
  encode: function(param){

    var state = this;
    param = param || {};

    var matched = "%";

    var url = state.matches.replace(/\(([\w-]+)\)/g, function(all, capture){

      var sec = param[capture]; 
      var stype = typeof sec;
      if(stype === 'boolean' || stype === 'number') sec = ''+sec;
      sec = sec || '';
      matched+= capture + "%";
      return sec;
    }) + "?";

    // remained is the query, we need concat them after url as query
    for(var i in param) {
      if( matched.indexOf("%"+i+"%") === -1) url += i + "=" + param[i] + "&";
    }
    return _.cleanPath( url.replace(/(?:\?|&)$/,"") );
  },
  decode: function( path ){
    var matched = this.regexp.exec(path),
      keys = this.keys;

    if(matched){

      var param = {};
      for(var i =0,len=keys.length;i<len;i++){
        param[keys[i]] = matched[i+1];
      }
      return param;
    }else{
      return false;
    }
  },
  // by default, all lifecycle is permitted

  async: function(){
    throw new Error( 'please use option.async instead');
  }

});

module.exports = State;
