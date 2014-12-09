var loc = require("../../src/location.js");
var expect = require("../runner/vendor/expect.js")


describe("location", function(){

  before(function(){});
  after(function(){});

  it("location should default to 1", function(done){
    expect(loc.mode).to.equal(1);
    loc.nav('/home', function(){
      expect(loc)
      done();
    })
  })

})


