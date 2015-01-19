// you'd better dont use stateman in global way
// code below is just a demo

var restate = function(options){
  options = options || {};
  var view = options.view = options.view || document.body;


  var stateman = new StateMan(),
    preStae = stateman.state;


  // rewirte state method to accept React Component
  stateman.state = function(stateName, Component, config){

    var Factory = React.createFactory(Component);
    if(!Component) return preStae.call(stateman, stateName);

    var state = {
      enter: function( option ){
        var component = Factory({param: option.param });

        component.stateman = stateman;

        if(component.enter) component.enter(option);
        this.component = component;

        if(this.parent === stateman ){
          React.render(component, view, function(){
            component
          });
        }else{
          React.render(component, this.parent.component.refs.view)
        }
      },
      leave: function( option){
        if(this.component && this.component.leave){
          this.component.leave(option);
        }
        if(this.parent === stateman ){
          React.render("", view);
        }else{
          React.render("", this.parent.$refs.view)
        }
        this.component = null;
      },
      update: function(option){
        var component = this.component;
        if(component && component.update){
          component.update(option)
        }
        component.setState({param: option.param});
      }
    }

    if(typeof config === "string") config = {url: config};
    //merge config
    for(var i in config){
      state[i] = config[i]
    }

    preStae.call(stateman, stateName, state);

    return this;
  }

  return stateman;
}