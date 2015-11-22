
// THX for Backbone for some testcase from https://github.com/jashkenas/backbone/blob/master/test/router.js
// to help maze becoming robust soon.

//    Backbone.js 1.1.2
//    (c) 2010-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//    Backbone may be freely distributed under the MIT license.
//    For all details and documentation:
//    http://backbonejs.org


var _ = require("../../src/util.js");
var browser = require("../../src/browser.js");
var History = require("../../src/history.js");
var expect = require("../runner/vendor/expect.js")


// Backbone.js Trick for mock the location service
var a = document.createElement('a');
function loc(href){
  return ({
    replace: function(href) {
      a.href = href;
      _.extend(this, {
        href: a.href,
        hash: a.hash,
        host: a.host,
        fragment: a.fragment,
        pathname: a.pathname,
        search: a.search
      }, true)
      if (!/^\//.test(this.pathname)) this.pathname = '/' + this.pathname;
      return this;
    }
  }).replace(href)
}




describe("History", function(){


  var history = new History({location: loc("http://leeluolee.github.io/")})

  var locals = {num:0}
  function num1(path){
    locals[path] = 1;
  }

  history.start(); 
  it("works under basic usage ", function(){
    history.nav("home");

    expect(history.location.hash).to.equal("#/home");
    history.checkPath();

  })
  it("works under basic usage 2", function(){

    history.on("change", num1)
    history.location.replace("http://leeluolee.github.io/#/home/code");
    history.checkPath();
    expect(locals["/home/code"]).to.equal(1);
    history.off("change", num1);
  })
  it("works with location replace ", function(){
    history.on("change", num1)
    history.location.replace("http://leeluolee.github.io/#/home2");
    history.checkPath();
    expect(history.location.hash).to.equal("#/home2")
    expect(locals["/home2"]).to.equal(1);
    history.off("change", num1);
  })

  it("hashmode with prefix", function(){
    var history = new History({
      location: loc("http://regularjs.github.io/app/history"),
      prefix: "!"
    })
    history.on("change", num1)
    history.location.replace("http://leeluolee.github.io/#!/prefix");
    history.checkPath();
    expect(locals["/prefix"]).to.equal(1);
    history.off("change", num1);
  })

  it("works in html5 history mode", function(){
    var history = new History({
      location: loc("http://regularjs.github.io/app/history"),
      root: "/app",
      mode: 2
    })

    history.on("change", num1)
    history.checkPath();
    expect(locals["/history"]).to.equal(1);

    history.location.replace("http://regularjs.github.io/app/history/code");
    history.checkPath();
    expect(locals["/history/code"]).to.equal(1);

    history.off("change", num1);
  })
  it("with prefix", function(){
    // @TODO some hardcode '#' need remove
    var history = new History({
      location: loc("http://regularjs.github.io/app/history"),
      prefix: '!'
    })
    history.location.replace("http://regularjs.github.io/app/history/code#!/prefix");
    history.on("change", num1)
    history.checkPath();
    expect(locals["/prefix"]).to.equal(1);
  })
  it("every nav, the curPath should be update", function(){
    var history = new History({
      location: loc("http://regularjs.github.io/app/history")
    })
    history.location.replace("http://regularjs.github.io/app/history/code#/prefix");
    history.checkPath();

    expect(history.curPath).to.equal("/prefix")
    history.location.replace("http://regularjs.github.io/app/history/code");
    history.checkPath();
    expect(history.curPath).to.equal("")
  })

})


