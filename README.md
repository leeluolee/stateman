StateMan
=======

state manager: A concise, flexible foundation for complex application routing.


## Why Another wheel. 

Firstly, I promise stateman is considered irreplaceable

stateman is a state-based libraring that focusing on complex  application routing.

SPA(Single Page Application) is become an common technology choice in morden web development , we need a routing library to help us organizing our logic, and make every page locatable(through the url).

But, the SPA is also become more and more complex, the routing-style that similar with server-side routing (express.Router.. etc) don't meet the requirements anymore. we need a well-designed foundation to simplify our logic.

[ui-router] go the right way, they abstarct a concept named __state__ to replace the real url to represent the application state. the state is 


##Feature

stateman is borned in requirements, it reuse the concept __state__ in [ui-router], it is

0. nested routing support based on state.
1. standalone with 9kb (minify && no gzip) source code
2. async routing when you need asynchronous logic in state.
3. support IE6+ and all other modern browser.
4. history supported, fallback to hash-based in old browser.
5. concise API, deadly simple to getting start with it.



## installation

- bower

```javascript
bower install stateman
```

- npm (browserify or other based on commonjs)

```js
npm install stateman
```

- component

```js
component install leeluolee/stateman
```

- exprimental 


change name to stateman.

## Document






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
    stateman.notifiy("state.hello.*", {});
    stateman.nav("/home/code/1?hello", {});
    stateman.go("state.list", {param:{}});
    stateman.encode("state.list", param);
    stateman.decode("/home/code")

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
      "notfound"
      "redirect"

  
    //some 


     state.state(); // 
     state.async(); //need pending === this; so , leave or enter is permit
     state.decode(url); // you can pass your own match return param
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

## if the state is pending, we cant redirect to other . to avoid 

if the s