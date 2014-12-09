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
  .state('l1_has_next.l2_has_next.l3_not_next', {
    enter: function(){obj.l13 = true},
    leave: function(){obj.l13 = false}
  }).start();


describe("maze", function(){
  it("we can directly vist the leave1 leaf state", function(done){
    maze.nav("/l0_not_next", function(){
      expect(obj.l0).to.equal(true)
      expect(location.hash).to.equal("#/l0_not_next");
      done();
    })
  })
})
