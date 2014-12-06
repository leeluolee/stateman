var casca = require("casca");
var 

var restate = {}

function ReState(option){
  casca.Casca.call(this, option)
}

ReState.prototype._getConfig = function(Component){
  // 1. string
  // 2. Object -> .regular === true
  // 3. Component
  // 4. plain object
  // 5. function(){}
  if(typeof Component !== "function" && Component.regular){
    Component = restate.BaseComponent.extend({

    })
  }

  if(Component instanceof Regular){
    var instance = new Component();
    return {
      enter: function(step){
        if(!instance){
           instance = new Config({
              $param: step.param,
              $query: step.query
           });
           cacahe.push(instance);
           // the max cache length
           if(cacahe.length > 1000) instance.destory();
        }
        instance.$inject(this.parent.instance.view);
        instance.enter(step);
      },
      leave: function(){
        instance.leave(step, function(){
          instance.frozen();
        });
        
      },
      events: {
        "state:update": function(option){
          instance.$emit("state:update", option);
        }
      }

      
    }
  }

  if(Component.regular){
    var Component = Regular.extend({})
  }
}


restate.stateModule = function(Component){
  Component.implement({
    enter: function(){

    },
    leave: function(){

    }
  })
}

BaseComponent.use(restate.stateModule);

restate()
  .state( "contact", require("xx.rgl") )
  .state( "contact.detail", ContactDetail )
    .state( "contact.detail.option", DetailOption)
  .state( "contact.list", ContactList )


var Contact = StateComponent.extend({
  template: require("xx.rgl"),
  events: {
    "state:update": function(option){

    }
  },
  init: function(){
    this.supr();
  },
  enter: function(step){
    this.supr();
  },
  leave: function(step){
    this.supr();
  }
});


