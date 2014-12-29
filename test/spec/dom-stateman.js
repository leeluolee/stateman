
// THX for Backbone for some testcase from https://github.com/jashkenas/backbone/blob/master/test/router.js
// to help stateman becoming robust soon.

//    Backbone.js 1.1.2
//    (c) 2010-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//    Backbone may be freely distributed under the MIT license.
//    For all details and documentation:
//    http://backbonejs.org

var StateMan = require("../../src/stateman.js");
var expect = require("../runner/vendor/expect.js")
var _ = require("../../src/util.js");


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


function reset(stateman){
  stateman._states = {};
  stateman.off();
}

describe("stateman", function(){



describe("stateman:basic", function(){
  var stateman = new StateMan( {} );
  var location = loc("http://leeluolee.github.io/homepage");


  var obj = {}; 

  stateman
    .state('l0_not_next', function(){
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
      url:'',
      enter: function(){obj.l13 = true},
      leave: function(){obj.l13 = false}
    })
    .state('book', {
      enter: function(){obj.book = true},
      leave: function(){obj.book = false}
    })
    .state('book.detail', {
      url: "/:bid",
      enter: function(option){obj.book_detail = option.param.bid},
      leave: function(){obj.book_detail = false},
      update: function(option){obj.book_detail_update = option.param.bid}
    })
    .state('book.detail.index', {
      url: "",
      enter: function(option){obj.book_detail_index = option.param.bid},
      leave: function(){obj.book_detail_index = false}

    })
    .state('book.detail.message', {
      enter: function(option){ obj.book_detail_message = option.param.bid },
      leave: function(){obj.book_detail_message = false},
      update: function(option){obj.book_detail_message_update = option.param.bid}
    })
    .state('book.list', {
      url: "", 
      enter: function(){obj.book_list = true},
      leave: function(){obj.book_list = false}
    })
    .state('$notfound', {
      enter: function(){
        obj.notfound = true
      },
      leave: function(){
        obj.notfound = false;
      }
    })
    .start({
      location: location
    });

  it("we can directly vist the leave1 leaf state", function(){

    stateman.nav("/l0_not_next")
    expect(obj.l0).to.equal(true)

  })

  it("we can directly vist the branch state, but have low poririty than leaf", function(){
    stateman.nav("/l1_has_next/l11_has_next")
    expect(obj.l13).to.equal(true);

  })

  it("we can define the id in url", function(){
    stateman.nav("/book/1");
    expect(obj.book).to.equal(true)
    expect(obj.book_detail).to.equal("1")
  })
  it("we can also assign the blank url", function(){
    stateman.nav("/book");
    expect(obj.book).to.equal(true)
    expect(obj.book_detail).to.equal(false)
    expect(obj.book_list).to.equal(true)
  })

  it("the ancestor should update if the path is change, but the state is not change", function(){
    stateman.nav("/book/1");
    expect(obj.book).to.equal(true)
    expect(obj.book_detail_index).to.equal("1")
    stateman.nav("/book/2/message");
    expect(obj.book).to.equal(true)
    expect(obj.book_detail_update).to.equal("2")
    expect(obj.book_detail_message).to.equal("2")
    stateman.nav("/book/3/message");
    expect(obj.book_detail_update).to.equal("3")
    expect(obj.book_detail_message_update).to.equal("3")
  })
  it("the ancestor before basestate between current and previouse should update", function(){
    stateman.nav("/book/4/message");
    expect(obj.book_detail_update).to.equal("4")
    expect(obj.book_detail_message_update).to.equal("4")
    stateman.nav("/book/5");
    expect(obj.book_detail_update).to.equal("5")
    expect(obj.book_detail_message_update).to.equal("4")
  })


  it("we can directly define the nested state", function(){
      stateman.state('directly.skip.parent.state', function(){
        obj.directly_skip_parent_state = true;
      }).nav("/directly/skip/parent/state")

      expect(obj.directly_skip_parent_state).to.equal(true)

  })



})


describe("stateman:navigation", function(){

  var location = loc("http://leeluolee.github.io/stateman");

  var obj = {}; 

  var stateman = new StateMan()
    .state("home", {})
    .state("contact.id", {
    })
})


// current previous pending and others
describe("stateman:property", function(){

})


describe("stateman:transition", function(){

  var location = loc("http://leeluolee.github.io/homepage");


  var obj = {}; 

  var stateman = new StateMan();
    stateman

    .state("home", {})
    .state("contact", {
      // animation basic
      enter: function(){
        var done = this.async();
        setTimeout(done, 100)
      },

      leave: function(){
        var done = this.async();
        setTimeout(done, 100)
      }
    })
    .state("contact.list", {
      url: "",
      // animation basic
      enter: function(){
      },

      leave: function(){
      }
    })
    .state("contact.detail", {
      url: ":id",
      // animation basic
      enter: function(option){
        var done = this.async();
        setTimeout(function(){
          obj.contact_detail = option.param.id
          done();
        }, 100)
        
      },

      leave: function(option){
        obj.contact_detail = option.param.id
      }
    })
    .state("book", {
      // animation basic
      enter: function(option){
        var done = this.async();
        setTimeout(function(){
          obj.book = true;
          done()
        }, 100)
      },

      leave: function(option){
        var done = this.async();
        setTimeout(function(){
          obj.book = false;
          done();
        }, 100)
      }
    })
    .state("book.id", {
      url: ":id",
      // animation basic
      enter: function(option){
        obj.book_detail = option.param.id
      },

      leave: function(option){
        delete obj.book_detail;
      }
    })
    .start({
      location: location
    })

  it("we can use transition in enter and leave", function(done){

    stateman.on("end", function a(){

      expect(obj.book).to.equal(true)
      expect(obj.book_detail).to.equal("1")

      stateman.off("end").nav("/contact/2", {}, function(){

        expect(obj.book).to.equal(false)
        expect(obj.contact_detail).to.equal("2")
        stateman.off("end");

        done();
      });


      expect(obj.book).to.equal(true)
      expect(obj.contact_detail).to.equal(undefined)
      // sync enter will directly done
      expect(obj.book_detail).to.equal(undefined)
      
    }).nav("/book/1")

    expect(obj.book).to.equal(undefined)
    expect(obj.book_detail).to.equal(undefined)

  })

  it("will forbit previous async nav if next is comming", function(done){
    stateman.nav("/book/1").nav("/home", {}, function(){
      expect(stateman.current.name).to.equal("home")
      done();
    });
  })

  // done (false)
  var loc2 = loc("http://leeluolee.github.io/homepage");
  var obj2 = {}; 
  var stateman2 = new StateMan();

  stateman2.start({location: loc2})

  it("enter return false can stop a navigation", function(){
    stateman2.state("contact", {
      enter: function(option){
        if(option.stop){
          return false;
        }
      }
    });
    stateman2.state("contact.detail", {
      leave: function(option){
        if(option.stop) return false;
      }
    })

    stateman2.go("contact.detail", { stop:true })
    expect(stateman2.current.name).to.equal("contact")
    stateman2.go("contact.detail", { stop: false })
    stateman2.go("contact", {stop:true});
    expect(stateman2.current.name).to.equal("contact.detail")
  })
  it("pass false to done, can stop a async ", function(done){

    stateman2.state("user", {
      enter: function(option){
        var done = this.async();
        setTimeout(function(){
          done(option.success)
        },50)
      }
    });
    stateman2.state("user.detail", {
      leave: function(option){
        var done = this.async();
        setTimeout(function(){
          done(option.success)
        },50)
      }
    })
    stateman2.state("user.message", {
      enter: function(){
        this.async()
      }
    })

    stateman2.go("user.detail", { success:false }, function(){
      expect(stateman2.current.name).to.equal("user")
      stateman2.go("user.detail", { success: true }, function(){
        expect(stateman2.current.name).to.equal("user.detail")
        stateman2.go("user", {success: false}, function(){
          expect(stateman2.current.name).to.equal("user.detail")
          done()
        });
      })
    })
    
  })

})

describe("stateman:redirect", function(){

  var location = loc("http://leeluolee.github.io/homepage");
  var obj = {}; 
  var stateman = new StateMan();

  stateman.start({location: location})


  it("we can redirect at branch state, if it is not async", function(){
    reset(stateman);
    stateman
      .state("branch1", {
        enter: function(opt){
          if(opt.param.id == "1"){
            stateman.nav("branch2")
          }
        },
        leave: function(){
          obj["branch1_leave"] = true;
        }

      })
      .state("branch1.leaf", function(){
        obj["branch1_leaf"] = true;
      })
      .state("branch2", function(){
        obj.branch2 = true
      })

    stateman.nav("/branch1/leaf?id=1");

    expect(stateman.current.name).to.equal("branch2");
    expect(obj.branch1_leave).to.equal(true);
    expect(obj.branch1_leaf).to.equal(undefined);
  })

  it("we can redirect at leaf state also", function(){
    reset(stateman);

    stateman.state("branch1.leaf", function(){
      stateman.go("branch2.leaf")
    }).state("branch2.leaf", function(){
      obj.branch2_leaf = true;
    })

    stateman.nav("/branch1/leaf");

    expect(stateman.current.name).to.equal("branch2.leaf");

  })
  it("we can redirect if the async state is done before redirect", function(done){

    var location = loc("http://leeluolee.github.io/homepage");
    var obj = {}; 
    var stateman = new StateMan();

    stateman.start({location: location})

    // beacuse the last state dont need async will dont need to async forever
    stateman.state("branch2", function(){
      var over = this.async()
      setTimeout(function(){
        over();
        stateman.go("branch3.leaf", null, function(){
          expect(this.current.name).to.equal("branch3.leaf");
          expect(obj.branch2_leaf).to.equal(true)
          expect(obj.branch3_leaf).to.equal(true)
          done()
        })
        over();
      },100)
    })
    .state("branch2.leaf", function(){
      obj.branch2_leaf = true
    })
    .state("branch3.leaf", function(){
      obj.branch3_leaf = true;
    })

    stateman.nav("/branch2/leaf")

  })

})

describe("stateman:other", function(){
  var location = loc("http://leeluolee.github.io/homepage");
  var obj = {}; 
  var stateman = new StateMan();

  stateman
    .start({location: location})
    .state("contact.detail", {
      events: {
        notify: function(option){
          obj.contact_detail = true;
        }
      },
      enter: function(){
        obj.manager = this.manager;
      }
    })



  it("visited flag will add if the state is entered", function(){
    expect(stateman.state("contact.detail").visited).to.equal(false)
    stateman.go("contact.detail")
    expect(stateman.state("contact.detail").visited).to.equal(true)
    expect(obj.manager).to.equal(stateman)
  })


  it("stateman.decode should return the parsed state", function(){

    var state = stateman.state("book.detail", {url: ":id"}).decode("/book/a?name=12")
    expect(state.param).to.eql({id:"a", name: "12"})
  })

  it("stateman.go should also assign the stateman.path", function(){

    var state = stateman.state("book.message", {}).go("book.message")
    expect(state.path).to.eql("/book/message")
  })

  it("stateman.encode should return the url", function(){

    var state = stateman.state("encode.detail", {url: ':id'}).go("book.message")
    expect(stateman.encode("encode.detail", {id:1, name:2})).to.equal("/encode/1?name=2")

  })

})


describe("stateman: matches and relative go", function(){
  var location = loc("http://leeluolee.github.io/homepage");
  var obj = {}; 
  var stateman = new StateMan();
    stateman.state("contact.detail.message", {})
    .state("contact.list", {
      enter: function(){
        stateman.go("^.detail.message");
        expect(stateman.current.name).to.equal('contact.detail.message');
      }
    })
    .state("contact.list.option", {})
    .state("contact.user.param", {url: ":id"})
    .start({location: location});

  it("relative to parent(^) should work as expect", function(){
    stateman.go("contact.detail.message");
    expect(stateman.current.name).to.equal("contact.detail.message");
    stateman.go("^");
    expect(stateman.current.name).to.equal("contact.detail");
    stateman.go("^.list.option");
  })  
  it("relative to parent(~) should work as expect", function(){
    stateman.go("contact.detail");
    expect(stateman.current.name).to.equal("contact.detail");
    stateman.go("~.message");
    expect(stateman.current.name).to.equal("contact.detail.message");
  })

  it("stateman.is should work as expect", function(){
    stateman.go("contact.detail.message");
    expect( stateman.is("contact.detail", {})).to.equal(true);
    expect( stateman.is("contact.detail", {}, true)).to.equal(false);
    expect( stateman.is("detail.message", {})).to.equal(false);
    expect( stateman.is("contact.detail.message", {})).to.equal(true);
    stateman.nav("/contact/user/1");

    expect( stateman.is("contact.user.param")).to.equal(true);
    expect( stateman.is("contact.user.param", {})).to.equal(false);
    expect( stateman.is("contact.user", {id: "1"})).to.equal(true);

    stateman.state("contactmanage.detail",{})

    stateman.go("contactmanage.detail");
    expect(stateman.is("contact")).to.equal(false)
  })
})
  
})