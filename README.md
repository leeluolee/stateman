Maze
=======

A standalone library providing state-based router, built for complex SPA development.



> Maze is design to , highly inspired by [ui-router]()



## Why not [ui-router]()?

1. ui-router is tightly bind to angularjs
2. ui-router is based upon angularjs , but also have a large codebase(4000 line)
3. we 

## Why not [director.js]

first, I'm director's fans

1. client router is not similar with server, client application need maintain the state. but server is almost not state(expect session or cookie)
2. url is not satasify to decribe the client state.
3. We need the whole control on every state's enter and leave




## installation

1. bower


2. npm (browserify or other based on commonjs)


3. component


4. script


change name to stateman.

## document

1. describe your 


```javascript

stateman.state("level1.level2", {
  url: "hello?query&hello",
  enter: function(option){
    var done = this.async();
    this.manager === stateman; // true
    stateman.current = this;
    stateman.previous = state;
    done();

  },
  leave: function(option){
    this.manager == stateman;
    state.current = next;
    state.previous = this;
  },
  update: function(option){
    state.current = "hello";
  },
  martch: function(url){
    return {
      name:
    } 
  },
  // match the wilcat
  include: function(){

  }
})

href={state.list(name:1)}

state.state("l1.l2", {
  url: "hello?",
  enter: function(option){
  // Stateman

    // API
    stateman.redirect("state.hello", option);
    stateman.notifiy("state.hello.*", {});
    
    stateman.navigate("/home/code/1?hello", {});
    stateman.go("state.list", {param:{}});

    stateman.encode("state.list", param);
    stateman.decode("/home/code") === stateman.match("/home"); {param, state}

    stateman.start;
    stateman.stop;



    // property 
    stateman.current
    stateman.previous
    stateman.pending

    // message
    stateman.on
    stateman.off
    stateman.emit


    events:
      "history:change"
      notfound
      redirect

  
    //some 
    stateman.history

    stateman.history.on("change", function(){})



     state.include("**.state.list");
     state.decode(url); // you can pass your own match return param
     state.state(); // 
     state.config(); // move to state
     stateman.state();
     state.async(); //need pending === this; so , leave or enter is permit
     state.encode(param);
     state.enter
     state.leave
     state.update

     // propety
     state.manager
     state.name

     state.on
     state.off
     state.emit


  },
  leave: function(){
    stateman.notify("") 
  }
})


stateman
  .state("l1.l2")
  .emit("hello");




```
