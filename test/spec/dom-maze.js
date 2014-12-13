
// THX for Backbone for some testcase from https://github.com/jashkenas/backbone/blob/master/test/router.js
// to help maze becoming robust soon.

//    Backbone.js 1.1.2
//    (c) 2010-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//    Backbone may be freely distributed under the MIT license.
//    For all details and documentation:
//    http://backbonejs.org

var Maze = require("../../src/maze.js");
var expect = require("../runner/vendor/expect.js")

var maze = new Maze();

var obj = {}; 

maze
  .state('l0_not_next', function(){
    console.log("enter l0_not_next")
    obj.l0 = true
  })
  .state('l1_has_next', {
    enter: function(){obj.l1 = true},
    leave: function(){obj.l1 = false}
  })
  .state('l1_has_next.l11_has_next', {
    enter: function(){obj.l12 = true},
    leave: function(){obj.l12 = false}
  })
  .state('l1_has_next.l11_has_next.l12_not_next', {
    enter: function(){obj.l13 = true},
    leave: function(){obj.l13 = false}
  })
  .state('l1_has_next.l11_has_next.l12_not_next', {
    enter: function(){obj.l13 = true},
    leave: function(){obj.l13 = false}
  })
  .start();


describe("maze", function(){
  it("we can directly vist the leave1 leaf state", function(done){
    maze.nav("/l0_not_next", function(){
      expect(obj.l0).to.equal(true)
      expect(location.hash).to.equal("#/l0_not_next");
      done();
    })
  })

  it("we can't directly vist the branch state", function(done){
    maze.nav("/l1_has_next", function(){
      expect(obj.l1).to.equal(undefined)
      expect(location.hash).to.equal("#/l1_has_next");
      expect(loc.currentPath).to.equal("/l1_has_next");
      done();
    })
  })

  it("but we can vist the nested leaf state", function(done){
    maze.nav("/l1_has_next/l11_has_next/l12_not_next", function(){
      expect(obj.l12).to.equal(true)
      expect(obj.l13).to.equal(true)
      expect(location.hash).to.equal("#/l1_has_next/l11_has_next/l12_not_next");
      done();
    })
  })
  // it("but we can vist the nested leaf state", function(done){
  //   history.back(1);
  //   setTimeout(function(){
  //     debugger
  //     expect(obj.l12).to.equal(false)
  //     expect(obj.l13).to.equal(false)
  //     expect(location.hash).to.equal("#/l1_has_next");
  //     done();
  //   },100)

  // })

})
