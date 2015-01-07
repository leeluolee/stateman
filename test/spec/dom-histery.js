
// THX for Backbone for some testcase from https://github.com/jashkenas/backbone/blob/master/test/router.js
// to help maze becoming robust soon.

//    Backbone.js 1.1.2
//    (c) 2010-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//    Backbone may be freely distributed under the MIT license.
//    For all details and documentation:
//    http://backbonejs.org


var _ = require("../../src/util.js");
var browser = require("../../src/browser.js");
var Histery = require("../../src/histery.js");
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




describe("Histery", function(){


  var histery = new Histery({location: loc("http://leeluolee.github.io/")})

  var locals = {num:0}
  function num1(path){
    locals[path] = 1;
  }

  histery.start(); 
  it("works under basic usage ", function(){
    histery.nav("home");

    expect(histery.location.hash).to.equal("#/home");
    histery.checkPath();

  })
  it("works under basic usage 2", function(){

    histery.on("change", num1)
    histery.location.replace("http://leeluolee.github.io/#/home/code");
    histery.checkPath();
    expect(locals["/home/code"]).to.equal(1);
    histery.off("change", num1);
  })
  it("works with location replace ", function(){
    histery.on("change", num1)
    histery.location.replace("http://leeluolee.github.io/#/home2");
    histery.checkPath();
    expect(histery.location.hash).to.equal("#/home2")
    expect(locals["/home2"]).to.equal(1);
    histery.off("change", num1);
  })

  it("hashmode with prefix", function(){
    var histery = new Histery({
      location: loc("http://regularjs.github.io/app/histery"),
      prefix: "!"
    })
    histery.on("change", num1)
    histery.location.replace("http://leeluolee.github.io/#!/prefix");
    histery.checkPath();
    expect(locals["/prefix"]).to.equal(1);
    histery.off("change", num1);
  })

  it("works in html5 histery mode", function(){
    var histery = new Histery({
      location: loc("http://regularjs.github.io/app/histery"),
      root: "/app",
      mode: 2
    })

    histery.on("change", num1)
    histery.checkPath();
    expect(locals["/histery"]).to.equal(1);

    histery.location.replace("http://regularjs.github.io/app/histery/code");
    histery.checkPath();
    expect(locals["/histery/code"]).to.equal(1);

    histery.off("change", num1);
  })
  it("with prefix", function(){
    // @TODO some hardcode '#' need remove
    var histery = new Histery({
      location: loc("http://regularjs.github.io/app/histery"),
      prefix: '!'
    })
    histery.location.replace("http://regularjs.github.io/app/histery/code#!/prefix");
    histery.on("change", num1)
    histery.checkPath();
    expect(locals["/prefix"]).to.equal(1);
  })
  it("every nav, the curPath should be update", function(){
    var histery = new Histery({
      location: loc("http://regularjs.github.io/app/histery")
    })
    histery.location.replace("http://regularjs.github.io/app/histery/code#/prefix");
    histery.checkPath();

    expect(histery.curPath).to.equal("/prefix")
    histery.location.replace("http://regularjs.github.io/app/histery/code");
    histery.checkPath();
    expect(histery.curPath).to.equal("")
  })

})


