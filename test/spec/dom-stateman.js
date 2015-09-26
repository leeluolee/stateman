
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
var doc = typeof document !== "undefined"? document: {};


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

describe("Util", function(){
  it("util.eql", function( ){
    expect(_.eql({a:1}, [2,1])).to.be.equal(false);
    expect(_.eql({a:1, b:3}, {a:1})).to.be.equal(false);
    expect(_.eql({a:1, b:3}, {a:1, b:3})).to.be.equal(true);
    expect(_.eql(1, 1)).to.be.equal(true);
  })
  it("util.emitable:basic", function(){
    var emitter = _.emitable({}); 
    var obj = {basic1:0,basic2:0,basic3:0};

    emitter.on('basic1', function(){
      obj.basic1++
    })
    emitter.on('basic2', function(){
      obj.basic2++
    })
    emitter.on('basic3', function(){
      obj.basic3++
    })
    emitter.emit('basic1');
    expect(obj.basic1).to.equal(1);
    emitter.off('basic1')
    emitter.emit('basic1');
    expect(obj.basic1).to.equal(1);
    emitter.off()
    emitter.emit('basic2');
    emitter.emit('basic3');
    expect(obj.basic2).to.equal(0);
    expect(obj.basic2).to.equal(0);

  })
  it("util.emitable:namespace", function(){
    var emitter = _.emitable({}); 
    obj = {enter_app: 0, enter_blog: 0}

    emitter.on('enter:app', function(){
      obj.enter_app++
    })
    emitter.on('enter:blog', function(){
      obj.enter_blog++
    })
    emitter.off('enter:app')
    emitter.emit('enter');
    expect(obj.enter_blog).to.equal(1)
    expect(obj.enter_app).to.equal(0)
    emitter.emit('enter:blog')
    expect(obj.enter_blog).to.equal(2)
    emitter.off('enter');
    emitter.emit('enter');
    expect(obj.enter_blog).to.equal(2)
  })
})

describe("stateman:basic", function(){
  var stateman = StateMan( {} );
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

  after(function(){
    stateman.stop();
  })
  it("we can directly vist the leave1 leaf state", function(){

    stateman.nav("/l0_not_next");
    expect(obj.l0).to.equal(true);

  })
  it("some Edge test should not throw error", function(){

    expect(function(){
      stateman.nav("");
      stateman.nav(undefined);
      stateman.go();
    }).to.not.throwError()

  })
 
  it("in strict mode, we can not touched the non-leaf state",function(){
    var location = loc("http://leeluolee.github.io/homepage");
    var stateman = new StateMan( {strict: true} );
    stateman.start({location: location});

    stateman.state("app.state", {})
    stateman.go("app");
    expect(stateman.current.name).to.not.equal("app");
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
    stateman.nav("/book/6/message");
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
      enter: function(option){
        var done = option.async();
        setTimeout(done, 100)
      },

      leave: function(option){
        var done = option.async();
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
        var done = option.async();
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
        var done = option.async();
        setTimeout(function(){
          obj.book = true;
          done()
        }, 100)
      },

      leave: function(option){
        var done = option.async();
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

  after(function(){
    stateman.stop();
  })

 it("we can use callback as second param", function(done){

    stateman.state('callback.second', {})
    stateman.nav('/callback/second', function(option){
      expect(option.current.name ==='callback.second')
      done();
    })

  })
  it("we can use transition in enter and leave", function(done){

    stateman.nav("/book/1" , {},function(){

      expect(obj.book).to.equal(true)
      expect(obj.book_detail).to.equal("1")

      stateman.nav("/contact/2", {}, function(){

        expect(obj.book).to.equal(false)
        expect(obj.contact_detail).to.equal("2")
        done();
      });

      expect(obj.book).to.equal(true)
      expect(obj.contact_detail).to.equal(undefined)
      // sync enter will directly done
      expect(obj.book_detail).to.equal(undefined)
    })

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
  after(function(){
    stateman.stop();
  })

  it("enter return false can stop a navigation", function(){
    stateman2.state("contact", {
      enter: function( option ){
        return !option.ban;
      }
    });
    stateman2.state("contact.detail", {
      leave: function(option){
        return !option.ban
      }
    })

    stateman2.go("contact.detail", {  ban:true })
    expect( stateman2.active.name ).to.equal("contact")
    stateman2.go("contact.detail", {  ban: false })
    stateman2.go("contact", { ban:true});
    expect(stateman2.current.name).to.equal("contact.detail")
  })
  it("pass false to done, can stop a async ", function(done){

    stateman2.state("user", {
      enter: function(option){
        var done = option.async();
        setTimeout(function(){
          done(option.success)
        },50)
      }
    });
    stateman2.state("user.detail", {
      leave: function(option){
        var done = option.async();
        setTimeout(function(){
          done(option.success)
        },50)
      }
    })
    stateman2.state("user.message", {
      enter: function(){
        option.async()
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
  after(function(){
    stateman.stop();
  })


  it("we can redirect at branch state, if it is not async", function(){
    reset(stateman);
    stateman
      .state("branch1", {
        enter: function(opt){
          if(opt.param.id == "1"){
            opt.stop();

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
    expect(obj.branch2).to.equal(true);
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
    done();

    // // beacuse the last state dont need async will dont need to async forever
    // stateman.state("branch2", function(){
    //   var over = this.async()
    //   setTimeout(function(){
    //     over();
    //     stateman.go("branch3.leaf", null, function(){
    //       expect(this.current.name).to.equal("branch3.leaf");
    //       expect(obj.branch2_leaf).to.equal(true)
    //       expect(obj.branch3_leaf).to.equal(true)
    //       done()
    //     })
    //   },100)
    // })
    // .state("branch2.leaf", function(){
    //   obj.branch2_leaf = true
    // })
    // .state("branch3.leaf", function(){
    //   obj.branch3_leaf = true;
    // })

    // stateman.nav("/branch2/leaf")

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

  after(function(){
    stateman.stop();
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

    expect(stateman.encode("contact.detail")).to.equal("/contact/detail")
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

  after(function(){
    stateman.stop();
  })

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
    expect( stateman.is("contact.user.param", {})).to.equal(true);
    expect( stateman.is("contact.user", {id: "1"})).to.equal(true);
    expect( stateman.is("contact.user", {id: "2"})).to.equal(false);
    expect( stateman.is()).to.equal(false);

    stateman.state("contactmanage.detail",{})

    stateman.go("contactmanage.detail");
    expect(stateman.is("contact")).to.equal(false)
  })

})

describe("LifeCycle: callForPermission", function(){

    var location = loc("http://leeluolee.github.io/homepage");
    var obj = {}; 
    var stateman = StateMan();
      stateman.state({
        "normal": { },
        "normal.blog": {
          canEnter: function(){
            return false 
          },
          enter: function(){
            obj['normal.blog']  = true 
          }
        },
        'normal.user': {
          canLeave: function(){
            return false
          },
          canEnter: function(){

          },
          enter: function(){
            obj['normal.chat'] = true
          }
        },
        'normal.chat': {
          enter: function(){
            obj['normal.chat'] = true
          }
        }
      })
      .start({location: location});
  it("return false in canEnter or canLeave, will stop navigation", function( ){
    stateman.go('normal.chat')
    expect(stateman.current.name).to.equal('normal.chat')
    stateman.go('normal.blog')
    expect(stateman.current.name).to.equal('normal.chat')
    stateman.go('normal.user')
    expect(stateman.current.name).to.equal('normal.user')
    expect(stateman.active.name).to.equal('normal.user')
    expect(stateman.previous.name).to.equal('normal.chat')
    stateman.go('normal.chat')
    expect(stateman.current.name).to.equal('normal.user')
    expect(stateman.active.name).to.equal('normal.user')
    expect(stateman.previous.name).to.equal('normal.chat')
    
  })
  if(typeof Promise !== 'undefined'){
    var obj = {}; 
    var pstateman = StateMan();

    pstateman.state({
      "promise": { },
      "promise.blog": {
        canEnter: function(){
          return Promise.reject()
        },
        enter: function(){
          pstateman['promise.blog']  = true 
        }
      },
      'promise.user': {
        canLeave: function(){
          return new Promise(function(resolve, reject){
            setTimeout(reject, 300)
          })
        }
      },
      'promise.chat': {
        enter: function(){
          return new Promise(function(resolve, reject){
            setTimeout(function(){
              pstateman['promise.chat'] = true;
              resolve();
            }, 300)
          })
        },
        leave: function(){
          return new Promise(function(resolve, reject){
            setTimeout(function(){
              pstateman['promise.chat'] = false;
              resolve();
            }, 300)
          })
        }
      }
    }).start({'location':loc("http://leeluolee.github.io/homepage")} )
    it("canEnter and canLeave accpet [Promise] as return value", function( done ){
      pstateman.go('promise.chat', function(option){
        expect(option.phase).to.equal('completion')
        expect(pstateman['promise.chat']).to.equal(true)
        pstateman.go('promise.blog', function(option){
          expect(option.phase).to.equal('permission')
          expect(pstateman['promise.blog']).to.equal(undefined)
          pstateman.go('promise.user', function(option){
            expect(option.phase).to.equal('completion')
            expect(pstateman.current.name).to.equal('promise.user')
            expect(pstateman.active.name).to.equal('promise.user')
            expect(pstateman.previous.name).to.equal('promise.chat')
            pstateman.nav('/promise/chat', function(option){
              expect(option.phase).to.equal('permission')
              expect(pstateman.current.name).to.equal('promise.user')
              expect(pstateman.active.name).to.equal('promise.user')
              expect(pstateman.previous.name).to.equal('promise.chat')
              done()
            })

          })
        })
        expect(pstateman['promise.blog']).to.equal(undefined)
      })
      expect(pstateman['promise.chat']).to.equal(undefined)
    })
    it("if you resolve promise with `false`, it is same as reject", function(){

    })
  }

})

describe("LifeCycle: Navigating", function(){
  var location = loc("http://leeluolee.github.io/");
  var obj = {}; 
  var stateman = new StateMan();

  stateman
    .state("app", {
      enter: function(){
      }
    })
    .start({location: location})


  after(function(){
    stateman.stop();
  })


  it("redirect at root, should stop navigating and redirect to new current", function(){
    var index =0, blog=0;
    stateman.state("app.index", {
      enter:function(){
        index++
      }
    })
    .state("app.blog", {enter: function(){
      blog++;
    }})
    .on("begin", function( option ){
      if(option.current.name !== "app.index"){
        option.stop(); // @TODO tongyi 
        stateman.go("app.index")
      }
    })


    var end = 0;
    stateman.on("end", function(){
      end++;
    })
    stateman.nav("/app/blog", {} );
    expect( blog ).to.equal( 0 );
    expect( index ).to.equal( 1 );
    expect( end ).to.equal( 1 );

    stateman.nav("/app/blog", {} );
    expect( end ).to.equal( 2 );
    expect( blog ).to.equal( 0 );
    stateman.off();
    stateman._states = {}
  })

  it("redirect at root, during redirect the callback should stashed, when end all callbacks should emit ", function(done){
    stateman
      .state( "app1.index", {
        enter:function(){
          stateman.go("app1.blog", function(){
            expect(stateman.active.name === "app1.blog").to.equal(true);
            expect(stateman._stashCallback.length).to.equal(0);
            done();
          })
        }
      })
      .state( "app1.blog", {enter: function(){}})

    stateman.go("app1.index")
  })

  it("option passed to nav, should also passed in enter, update and leave", function(done){
    var data = {id:1}, num =0;
    stateman.state("app2.index", {
      url: "index/:id",
      enter: function(option){
        expect(option.data).to.equal(data);
        expect(option.data).to.equal(data);
        expect(option.param.id).to.equal("2");
        done();
      }
    })
    stateman.nav("/app2/index/2", {data: data})

  })

  it("stateman.back should return the previous state", function(){

  })


})

describe("Config", function(){
  var location = loc("http://leeluolee.github.io/");
  var obj = {}; 
  var stateman = new StateMan();
  stateman.start({location: location})

  after(function(){
    stateman.stop();
  })

  it("title should accept String", function(){
    var baseTitle = doc.title;
    stateman.state({
      "app.hello": {
        title: "hello app"
      },
      "app.exam": {
        url: "exam/:id",
        title: function(){
          return "hello " + this.name + " " + stateman.param.id;
        }
      },
      "app.third": {}
    })
    stateman.go("app.hello")
    expect(doc.title).to.equal("hello app")
    stateman.go("app.exam", {param: {id: 1}})
    expect(doc.title).to.equal("hello app.exam 1")
    stateman.nav("/app/third");
    expect(doc.title).to.equal(baseTitle);
  })

  it("title should Recursive up search", function(){
    var baseTitle = doc.title;
    stateman.state({
      "app2": {
        title: "APP"
      },
      "app2.third": {}
    })
    stateman.go("app2.third")

    expect(doc.title).to.equal("APP")
  })
})
})
