
var stateman = require("../../src/index.js");
var expect = require("../runner/vendor/expect.js");


describe("State Server", function(){
    var stm = stateman( {
      routes: {
        'app': {url: ''},
        'app.index': {},
        'app.blog': {
          url: 'blog/:id'
        },
        'app.blog.detail': {
        }
      }
    })

  it("exec success path", function(){


    var ret = stm.exec( '/blog/3/detail?description=2');

    expect(ret).to.not.equal(undefined);

    expect( ret.states.map(function(state){ return state.name }) ).to.eql([
      'app', 'app.blog', 'app.blog.detail'
    ])

    expect(ret.param).to.eql({
      id: '3',
      description: '2'
    })


  })
  it("exec fail path", function(){


    var ret = stm.exec( '/user/3/detail?description=2' );

    expect(ret).to.equal(undefined);


  })

  it("is should work",  function(){

    var ret = stm.exec( '/blog/3/detail?description=2' );

    expect(stm.is('app.blog.detail')).to.equal( true );
    expect(stm.is('app.blog')).to.equal( true );
    expect(stm.is('app.blog', null, true)).to.equal( false );
  })

})