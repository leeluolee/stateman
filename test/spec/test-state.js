var State = require("../../src/state.js");
var expect = require("../runner/vendor/expect.js")



function expectUrl(url, option){
  return expect(new State({url: url}).encode(option))
}

function expectMatch(url, path){
  return expect(new State({url: url}).decode(path))
}

describe("State", function(){

  describe("state.state", function(){
    it("can defined nested statename that parentState is not defined", function(){
      var state = new State();

      state.state('contact.detail.message', {});

      expect(state.state("contact").name).to.equal("contact")
      expect(state.state("contact.detail").name).to.equal("contact.detail")
      expect(state.state("contact.detail.message").name).to.equal("contact.detail.message")
    })
    it("we can define absolute url when start with '^'", function(){
      var state = new State();
      state.state('contact.detail', {});
      state.state('contact.detail.app', {url: '^/home/code/:id'});
      expect(state.state("contact.detail.app").encode({id: 1})).to.equal("/home/code/1")

    })
    it("state.async has been removed after v0.2.0", function(){
      var state = new State();
      expect(function(){
        state.async()
      }).to.throwError();
      
    })

  })


  describe("state.encode", function(){


    it("no param and query should work", function(){

      expectUrl("/home/code").to.equal("/home/code")

      expectUrl("/home/code", {name: 'hello', age: 1} )
        .to.equal("/home/code?name=hello&age=1");
      
    })
    it("with uncatched param should work", function(){
      
      expectUrl("/home/code/:id").to.equal("/home/code")

      expectUrl("/home/code/:id", {
        id: 100, name: 'hello', age: 1
      }).to.equal("/home/code/100?name=hello&age=1");
      
    })

    it("with unnamed param should work", function(){
      
      expectUrl("/home/code/(\\d+)", {
        name: 'hello', age: 1, 0:100
      }).to.equal("/home/code/100?name=hello&age=1");
    })

    it("with named and catched param should work", function(){
      
      expectUrl("/home/code/:id(\\d+)", {
        name: 'hello', 
        age: 1, 
        id: 100
      }).to.equal("/home/code/100?name=hello&age=1");

    })

    it("with wildcard should work", function(){
      
      expectUrl("/home/**/code", {
        name: 'hello', age: 1, 0: "/name/100"
      }).to.equal("/home/name/100/code?name=hello&age=1");

      expectUrl("/home/*/code", {
        name: 'hello', age: 1, 0: "name"
      }).to.equal("/home/name/code?name=hello&age=1");

    })

    it("complex testing should work as expect", function(){

      expectUrl("/home/code/:id(\\d+)/:name/prefix(1|2|3)suffix/**", {
        name: 'leeluolee', age: 1 ,id: 100,  0: 1, 1: "last"
      }).to.equal("/home/code/100/leeluolee/prefix1suffix/last?age=1");

    })

    it("nested state testing", function(){
      var state = new State({url: "home"})
        .state("home", {})
        .state("home.list", {url: ""})
        .state("home.list.message", {url: "/:id/message"})

      var url =state.state("home.list.message").encode({
        id: 1000 ,name:1, age: "ten"
      })
      expect(url).to.equal("/home/home/1000/message?name=1&age=ten");
    })


  })


  describe("state.match", function(){

    it("basic usage", function(){
      expectMatch("/home/code", "/home/code/").to.eql({});
      expectMatch("/home/code", "/home/code").to.eql({});
    })

    it("simple named param", function(){
      expectMatch("/home/code/:id", "/home/code/100/").to.eql({id:"100"});
    })

    it("simple catched param", function(){
      expectMatch("/home/code/(\\d+)", "/home/code/100/").to.eql({0:"100"});
    })

    it("simple catched and named param", function(){
      expectMatch("/home/code/:id(\\d+)", "/home/code/100/").to.eql({id:"100"});
    })

    it("simple wild param", function(){
      expectMatch("/home/code/:id(\\d+)", "/home/code/100/").to.eql({id:"100"});
    })

    it("complex composite param", function(){

      expectMatch("/home/code/:id(\\d+)/([0-9])/(\\d{1,3})/home-:name/*/level", 
        "/home/code/100/1/44/home-hello/wild/level").to .eql({id:"100", "0": 1, "1": 44, "2": "wild",  name: "hello"});

    })

  })

})


describe("state.event", function(){
  var state = new State();
  it("event base", function(){
    var locals = {on:0};
    function callback(num){locals.on+=num||1}

    state.on("change", callback);
    state.emit("change", 2);
    expect(locals.on).to.equal(2);
    state.off("change", callback);
    state.emit("change");
    expect(locals.on).to.equal(2);
  })
  it("event once", function(){
    var locals = {once:0};
    function callback(num){locals.once+=num||1}

    state.once("once", callback);
    state.emit("once")
    expect(locals.once).to.equal(1);
    state.emit("once")
    expect(locals.once).to.equal(1);
  })
  it("batch operate", function(){
    var locals = {on:0};
    function callback(name1,name2){locals.on+=name2||1}

    state.on({
      "change": callback,
      "change2": callback
    })

    state.emit("change", 1,2);
    expect(locals.on).to.equal(2);
    state.emit("change2");
    expect(locals.on).to.equal(3);

    state.off();

    state.emit("change");
    expect(locals.on).to.equal(3);
    state.emit("change2");
    expect(locals.on).to.equal(3);
  })
})

