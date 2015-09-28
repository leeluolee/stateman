

>  "Long live my poor English", :P  


## Which is Improved in  v0.2.x 


- add an [__askForPermission__](#permission) step in Lifecyle.
- support return __Promise__ in `enter`， `leave` and `canEnter`, `canLeave`( introduced in v0.2.0) to help us implement some asynchronous navigation. 
- add [namespace support](#event) for builtin emitter.
- Warn: __remove [state.async]__,  you can use  `option.async` for asynchronous navigation. but I suggest you to use promise instead


# StateMan API Reference 



__ Before taking document into detail, suppose we already have a state config like this__



```js

var config = {
  enter: function(option){ 
    console.log("enter: " + this.name + "; param: " + JSON.stringify(option.param)) 
  },
  leave: function(option){ 
    console.log("leave: " + this.name + "; param: " + JSON.stringify(option.param)) 
  },
  update: function(option){ 
    console.log("update: " + this.name + "; param: " + JSON.stringify(option.param)) 
  },
}

function cfg(o){
  o.enter = o.enter || config.enter
  o.leave = o.leave || config.leave
  o.update = o.update || config.update
  return o;
}

var stateman = new StateMan();

stateman.state({

  "app": config,
  "app.contact":  config,
  "app.contact.detail": cfg({url: ":id(\\d+)"}),
  "app.contact.detail.setting": config, 
  "app.contact.message": config,
  "app.user": cfg({
    enter: function( option ){
      var done = option.async();
      console.log(this.name + "is pending, 1s later to enter next state")
      setTimeout(done, 1000)
    },
    leave: function( option ){
      var done = option.async();
      console.log(this.name + "is pending, 1s later to leave out")
      setTimeout(done, 1000)
    }
  }),
  "app.user.list": cfg({url: ""})

}).on("notfound", function(){
  this.go('app') // if not found
}).start();

```


Object `config` is used to help us record the navigating, you don't need to understand the example right now, document will explain later.

You can find 【__The demo [here](./example/api.html)__】. type something in console can help you to understand api more clearly.



## API

### new StateMan

__Usage__

`new StateMan(option)`

__Arguments__

|Param|Type|Detail|
|--|--|--|
|option.strict|Boolean| Default: false . whether only the leaf state can be visited |
|option.title| String| document.title, See   [config.title](#title)|


__Return__

[Stateman] : The instance of StateMan 

__Example__

```javascript
var StateMan = require("stateman");

var stateman = new StateMan({
  title: "Application",
  strict: true
});  
// or...
var stateman = StateMan();
```


if strict is true, it will make the state `app.contact` in the example above can't be visited anymore( in other words , won't be stateman.current). only the __leaf state__ like `app.contact.message` can be visited.



### stateman.state

__Usage__

`stateman.state(stateName[, config])`


stateman.state is used to add/update a state or get particular state(if param `config` is undefined) .



__Arguments__

|Param|Type|Detail|
|--|--|--|
|stateName|String  Object| the state's name , like `contact.detail`, if a `Object` is passed in, there will be a multiple operation |
|config(optional)|Function Object| if config is not specified, target state will be return; if config is A `Function`,  it will be considered as the [enter](#enter) method; if the state is already exsits, the previous config will be override|

 __Return__ : 

StateMan or State (if config is not passed) 


__Example__

```js

stateman
  .state("app", {
    enter: function(){
      console.log("enter the state: app")
    },
    leave: function(){
      console.log("leave the state: app")
    }
  })
  // is equals to {enter: config}
  .state("app.contact", function(){
      console.log("enter the app.contact state")
  })

// pass in a Object for multiple operation
stateman.state({
  "demo.detail": function(){
      console.log("enter the demo.detail state")
  },
  "demo.list": {
    enter: function(){}
    leave: function(){}
  }
})


```



As you see, we haven't created the `demo` state before creating `demo.detail`, beacuse stateman have created it for you. 

if config is not passed into state, `state.state(stateName)` will return the target state.


```js

// return the demo.list state
var state = stateman.state('demo.list'); 

```





<a id='config'></a>

### > detail of `config` 


Everything you defined in `config` will be merged to the target state which the stateName represent. But there are also some special properties you need to konw.



#### lifecycle related 



There five lifecyle-related functions can be used for controlling the routing logic. they are all optional, see [lifecycle](#lifecycle) for detail.

* __config.enter(option)__: a function that will be called when the state be entered
* __config.leave(option)__: a function that will be called when the state be leaved out.
* __config.update(option)__: state contained by current state, but not be entered or leaved out will call `update`.
* __config.canEnter(option)__: ask for permission to enter
* __config.canLeave(option)__: ask for permission to leave





#### config.url: 

`url` is used to describe the state's captured url 



For nested states, every sub-states append their urls to their parent's url , then the __captured url__ is generated. for example. The captured url of `app.contact.detail` is the combination of  `app`,`app.contact` and `app.contact.detail`




__Example__

```js

state.state("app", {})
  .state("app.contact", "users")
  .state("app.contact.detail", "/:id")

```


The captured url of `app.contact.detail` is equals to `/app/users/:id`. YES, obviously you can define the param captured in the url. see [param in routing](#param) for more infomation.


missing `/` or redundancy of `/` is all valid.




__Absolute url__: 

if you dont need the url that defined in parents, use a prefix `^` to make it absolute . __all children__ of the state will also be affect


```js
state.state("app.contact.detail", "^/detail/:id");
state.state("app.contact.detail.message", "message");
```


The captured url of `app.contact.detail` will be `/detail/:id`. and the captured url of `app.contact.detail.message` will be `/detail/:id/message`.




__empty url__: abandon the current url.

if you pass `url:""`, the captured_url will be the same as its parent. (but it have higher priority than parent)






<a href="#" name="title"></a>

#### config.title


when navigating is end. the document.title will replaced by particular title.



__Argument__

- config.title [String or Function]: if title is a Function, document.title will use its returnValue 

__Example__

```
stateman.state({
  "app": {
    title: "APP"
  },
  "app.test": {
    title: "App test"
  },
  "app.exam": {
    url: "exam/:id",
    title: function(){
      return "Exam " + stateman.param.id
    }
  },
  "app.notitle": {}
})

stateman.go("app.test");

// document.title === "App test"

stateman.nav("/app/test/1");

// document.title === "Exam 1"

stateman.nav("/app/notitle");

// document.title === "App"
```


Just as you have seen, if current.title isn't founded, stateman will search title in its parent, and stop searching at stateman self.







<a name="start"></a>

### stateman.start

start the state manager. 

__Usage__

`stateman.start(option)`

__option__


|Param|Type|Detail|
|--|--|--|
|html5 |Boolean|(default false) whether to open the html5 history support |
|root |String|(default '/') the root of the url , __only required when html5 is actived__. defualt is `/` |
|prefix| String | for the hash prefix , default is '' (you can pass `!` to make the hash like `#!/contact/100`), works in hash mode.|
|autolink| Boolean | (defualt true) whether to delegate all link(a[href])'s navigating, only need when __html5 is actived__, default is `true`.|


__Example__

```js
stateman.start({
  "html5": true,
  "prefix": "!",
  "root": "/blog" //the app is begin with '/blog'
})

```

__Warning__


If `html5=true` (need html5 pushState support), but browser doesn't support this feature. stateman will fallback to hash-based routing.



Just like the code above, 

1. If you visited `/blog/app`  in the browser that don't support html5. stateman will automately switch to hash-based routing and redirect to `/blog#/app` for you.

2. If you visted `/blog#/app` in the browser that __support__ html5. stateman will also use the history-based routing, and fix the url to __`/blog/app`__ for you.







  
<a name="nav"></a>
### stateman.nav


nav to particular url. [param from url](#param) will be merged to option and passed to function `enter`, `leave`, `update`.



__Usage__

`stateman.nav(url[, option][, callback])`;



__Argument__

|Param|Type|Detail|
|--|--|--|
|url |String|target url |
|option(optional) |Object|will become the [routing option](#option), option will merge the [param from url](#param) as its `param` property. |
|callback(optional)|Function|function called after navigating is done|


__control option__



* option.silent: if silent is true, only the location is change in browser, but will not trigger the stateman's navigating process
* option.replace: if replace is true. the previous path in history will be replace by url( means you can't backto  or goto the previous path)




__Example__

`stateman.nav("/app/contact/1?name=leeluolee", {data: 1}); `

<!-- t -->

the final option passed to `enter`, `leave` and `update` is 



`{param: {id: "1", name:"leeluolee"}, data: 1}`.




<a name="go"></a>

### stateman.go


nav to particular state, very similar with [stateman.nav](#nav). but `stateman.go` use stateName instead of url.



__Usage__

`stateman.go(stateName [, option][, callback])`;


__Arguments__

- stateName [String]: the name of target state. 

- option [Object]: [Routing Option](#option)

  - option.encode: 

  default is true. if encode is false, url will not change at  location, only state is change (means will trigger the stateman's navigating process). stateman use the [__encode__](#encode) method to compute the real url. 
  - option.param: 

    the big different between __nav__ and __go__ is param: 

     __go__ may need param to compute the real url, and place it in location. 

  you can use [stateman.encode](#encode) to test how stateman compute url from a state with specifed param

  - option.replace: the same as  [stateman.nav](#nav)

- calback [Function]: if passed, it will be called if navigating is over.


All other property in option will passed to `enter`, `leave` , `update`. 



__Example__

```
stateman.go('app.contact.detail', {param: {id:1, name: 'leeluolee'}});
```



location.hash will change to `#/app/contact/1?name=leeluolee` , you can find that unnamed param (name) will be append to url as the querystring.



__Tips__: 


we always recommend to using __go__ instead of __nav__ in large project to control the state more clearly.





__relative navigation__ : 


you can use special symbol to perform relative navigating.



1. "~":  represent the active state 
2. "^":  represent the parent of active state ;

__example__

```js
stateman.state({
  "app.user": function(){
    stateman.go("~.detail")  // will navigate to app.user.detail
  },
  "app.contact.detail": function(){
    stateman.go("^.message")  // will navigate to app.contact.message 
  }

})

```



<a name="is"></a>
### stateman.is

__Usage__

`stateman.is( stateName[, param] [, isStrict] )`



determine if the [current](#current) state is equal to or is the child of the state. If any params are passed then they will be tested for a match as well. not all the parameters need to be passed, just the ones you'd like to test for equality.


__Arguments__

|Param|Type|Detail|
|--|--|--|
|stateName |String|stateName to be tested  |
|param(optional)|Object|param used to be tested |
|isStrict(optional)|Boolean| Whether the target state need strict equals to current state.|



__example__

```js
stateman.nav("#/app/contact/1?name=leeluolee");
stateman.is("app.contact.detail") // return true
stateman.is("app.contact", {}, true) // return false, 
stateman.is("app.contact.detail", {name: "leeluolee"}, true) // return true
stateman.is("app.contact.detail", {id: "1"}) // return true
stateman.is("app.contact.detail", {id: "2"}) // return false
stateman.is("app.contact.detail", {id: "2", name: "leeluolee"}) // return false
```

<a name="encode"></a>
### stateman.encode


Get the particular url from state and specified param.

method  [__go__](#go) is based on this method.






__Usage__

`stateman.encode( stateName[, param] )`


__Arguments__


|Param|Type|Detail|
|--|--|--|
|stateName |String|stateName  |
|param(optional)|Object|param used to rebuild url |


```js
stateman.encode("app.contact.detail", {id: "1", name: "leeluolee"}) 
// === "/app/contact/1?name=leeluolee"

```

<a name="decode"></a>
### stateman.decode



Find the state that be matched by url, the state will be returned with the computed param..

method [__nav__](#nav) is based on this method


__Usage__

`stateman.decode( url )`


__Example__

```js
var state = stateman.decode("/app/contact/1?name=leeluolee")

state.name === 'app.contact.detail'
state.param // =>{id: "1", name: "leeluolee"}

```


<a name="stop"></a>
### stateman.stop

__Usage__

`stateman.stop()`

stop the stateman.



<a name="on"></a>

### stateman.on

bind handle to specified event.



__Usage__

`stateman.on(event, handle)`


StateMan have simple EventEmitter implementation for event driven development, see builtin events at [Routing Event](#event)




you can use format `[event]:[namespace]`  to create a event that have specified namespace.


__Example__

```
stateman
  .on('begin', beginListener)
  // there will be a multiply binding
  .on({   
    'end': endListener,
    'custom': customListener,
    'custom:name1': customListenerWithNameSpace
  })
```



<a name="off"></a>
### stateman.off

unbind handle 


__Usage__

`stateman.off(event, handle)`


__Example__


There will be a variety of combinations of parameters.



```js
// unbind listener with specified handle
stateman.off('begin', beginListener ) 
  // unbind all listener whose eventName is custom and namespace is name1
  .off('custom:name1')   
  // unbind listener whose name is 'custom' (ignore namespace)
  .off('custom')   
  // clear all event bindings of stateman
  .off()  
```



<a name="emit"></a>
### stateman.emit


trigger a specified event with specified param




__Usage__

`stateman.emit(event, param)`



__Similiar with `stateman.off`, namespace will affect its working.__



__Example__

```js
// emit all listeners named `begin` (ignore namespace) 
stateman.emit('begin') 
// emit all listeners named `begin`, and with namespace `name1`
  .emit('custom:name1')   

```


##  About Routing 

<a name='lifecycle'></a>

### Routing  LifeCycle 


> <img src="lifecycle.png" width="100%">

There are three stages in one routing.

- permission
- navigation
- completion

let's talk about `navigation` first.


<a name="navigation"></a>
#### navigation: enter, leave , update: 


`enter`, `update` and `leave` are the most important things you need to know in stateman. 



__Example__: 



Imagine that the current state is `app.contact.detail.setting`, when navigating to `app.contact.message`. the complete process is


1. leave: app.contact.detail.setting
2. leave: app.contact.detail
3. update: app.contact
4. update: app
5. enter: app.contact.message



you can test it in [api.html](./example/api.html);

There is no difficult to understand `enter` and `leave`, But what is the update used for?  

See `app.contact.detail.setting` that we defined in the 【[first example](./example/api.html#/app/contact/3/setting)】. if we nav from `/app/contact/3/setting` to `/app/contact/2/setting`, the current state doesn't change, only the param `id` changed. so stateman call the `state.update` method to notify state to process updating work. All states that  included in current state will update.





<a name="permission"></a>
#### permission: canEnter canLeave


Some times, you want to stop the routing before `navigation` process. one solution is handling it in [`begin`](#event)'s listeners


```js
stateman.on('begin', function(option){
  if( option.current.name === 'app.user' && !isUser){
    option.stop()
  }
  
})
```


But after version 0.2 , stateman provide an more reasonable choice that called __"ask for permission"__. The process is triggered before __navigation__.

By implementing two optional method: `canEnter`, `canLeave`. you can stop the routing before navigation is starting.


```js
stateman.state('app.user',{
  'canEnter': function(){
    return !!isUser;
  }
})

```


In the example, if `false` was returned, the navigation will stop, __And url will back to old one__.

__you can also use [Promise](#control) to control this process__

Just like the example we mentioned in `navigation`, if we navigating from `app.contact.detail.setting` to `app.contact.message`, the complete process is: 



1. __canLeave: app.contact.detail.setting__
2. __canLeave: app.contact.detail__
3. __canEnter: app.contact.message__
4. leave: app.contact.detail.setting
5. leave: app.contact.detail
6. update: app.contact
7. update: app
8. enter: app.contact.message



If any step is undefined, __It will be ignored__, they are all optional. 




<a name="control"></a>
### Routing  Control 


Stateman provide some ways to implement asynchronous navigation.
You can find DEMO for this section in [lifecycle.html](./example/lifecycle.html);



<a name="promise"></a>
#### [__Promise__](#Promise)


I suggest you to use Promise to control routing.


__Example__

```js

var delayBlog = false;
stateman.state('app.blog',{
  // ...
  'enter': function(option){
    delayBlog = true;

    return new Promise(function(resolve, reject){
      console.log('get into app.blog after 3s')
      setTimeout(function(){
        delayBlog = false;
        resolve();
      }, 3000)
    }) 
  }
  // ...
})

```




__If promise is rejected or resolved by `false`, navigation will stop directly. (if phase is `permission`, also return to old url)  __.
 


#### Returned Value 


You can return `false` (===) in `enter`, `leave`, `canEnter` and `canLeave` to end this navigation in paricular phase. 


```js
stateman.state('app.blog',{
  // ...
  'canLeave': function(){

    if(delayBlog){
      return confirm('blog is pending, want to leave?')
    }
    
  }
  // ...
})
```


#### `option.async` 


stateman wasn't bundle with any promise-polyfill, if you don't include polyfill in old browser by yourself,
you may need `option.async` for asynchronous routing, see [option.async](#async) section.





<a name='option'></a>
### Routing Option


`enter`，`leave`,`update`, `canEnter` and `canLeave` accpet same param which called __Routing Option__. 
It will also passed as the param to event `begin` and `end`.

It is just the same `option` that you passed to `stateman.go` or `stateman.nav` , but take a lot of import information for routing.



```js

stateman.state({
  'app': {
    enter: function( option ){
      console.log(option)// routing option
    }
  }
})

```


__option__

|Property|Type|Detail|
|--|--|--|
|option.phase| String| represent which phase the navigation is |
|option.param| Object| captured param |
|option.previous| State| previous state |
|option.current| State| target state |
|option.async| Function| fallback for async navigating |
|option.stop | Function| function used to stop the navigating |

#### 0. option.phase


represent which phase the navigation is, there are three phases.
- permission: still calling the permission
- navigation: in navigating process
- completion: navigating is done




#### 1. option.async


If you must run application in the runtime that doesn't support Promise (old IE without Promise polyfill), you can use `option.async` for asynchronous navigation.



__Return __

 
A function used to resolve the pending state. 



```js

"app.user": {
  enter: function(option){
    var resolve = option.async(); 
    setTimeout(resolve, 3000);
  }
}

```



The returned `resolve` is very similiar with the `resolve` function in promise, if __you pass `false` to it__, the navigation will be terminated.



```js

"app.user": {
  canEnter: function(option){
    var resolve = option.async(); 
    resolve(false);
  }
}

```

> `false` is a special signal used for rejecting a state throughout this guide. 




#### 1. option.current

 The target state.  

#### 2. option.previous

 The prevous state. 

#### 3. option.param: see [Routing Params](#param)

#### 4. option.stop


manually stop this navigating. you may use it when event `begin` is emitted.




<a name='param'></a>
### Routing  Params 

####1. named param without pattern, the most usually usage .


__Example__

<!-- t -->

captured url `/contact/:id` will  match the path `/contact/1`, and find the param `{id:1}`

In fact, all named param have a default pattern `[-\$\w]+`. but you can change it use custom pattern.



####2. named param with custom pattern 



named param follow with `(regexp)` can restrict the pattern for current param (don't use sub capture it regexp). for example.




now , only the number is valid to match the id param of  `/contact/:id(\\d+)`


####3. unnamed param with pattern


you can also define a plain pattern for route matching.



__Example__

```sh
/contact/(friend|mate)/:id([0-9])/(message|option)
```

<!-- t -->

It will match the path `/contact/friend/4/message` and get the param `{0: "friend", id: "4", 1: "message"}`

unnamed param will be put one by one in `param` use autoincrement index. 


#### 4. param in search


you can also passing query search in the url. take `/contact/:id` for example.


<!-- t -->
it matches the url `/contact/1?name=heloo&age=1`, and get the param `{id:'1', name:'heloo', age: '1'}`



#### 5. implicit  param


Just like sending http request with method `POST`, the param won't be showed in url.  You can also create implicit param by  trick on [Routing Option](#option) in stateman.

In other words, of course, that you can pass __non-string__ information during navigation.


__Example__

```js

stateman.state('app.blog', {
  enter: function(option){
    console.log(option.blog.title) 
  } 
})

stateman.go('app.blog', {
  blog: {title: 'blog title', content: 'content blog'}
})

```

Any properties kept in option except `param` won't be showed in url. 


<a name="event"></a>
### Routing  Event 

#### begin


Emitted when a navigating is start. every listener got a special param : `evt`.




Because the navigating isn't really start, property like `previous`, `current` and `param` haven't been assigned to stateman.

__Tips__

you can register a begin listener to stop particular navigating. 


```js
stateman.on("begin", function(evt){
  if(evt.current.name === 'app.contact.message' && evt.previous.name.indexOf("app.user") === 0){
    evt.stop();
    alert(" nav from 'app.user.*' to 'app.contact.message' is stoped");
  }
})

```



Paste code above to page [http://leeluolee.github.io/stateman/api.html#/app/user](./example/api.html#/app/user), and click `app.contact.message` to see the log.



#### end

Emitted when a navigating is end. 

```
stateman.on('end', function(option){
  console.log(option.phase) // the phase, routing was end with  
})
```

see [Option](#option) for other parameter on option.


#### notfound: 

Emitted when target state is not founded.

__Tips__

you can register a notfound listener to redirect the page to default state


__Example__

```js

stateman.on("notfound", function(){
  this.go("app.contact");
})
```


## Properties 

Some living properties. 

<a name="current"></a>
### __stateman.current__: 

The target state. the same as option.current

<a name="previous"></a>
### __stateman.previous__: 

The previous state. the same as option.previous
  
<a name="active"></a>
### __stateman.active__: 

The active state, represent the state that still in pending.

Imagine that you are navigating from __'app.contact.detail'__ to  __'app.user'__, __current__ will point to `app.user` and __previous__ will point to 'app.contact.detail'. But the active state is dynamic, it is changed from `app.contact.detail` to `app.user`. 

__example__

```javascript
var stateman = new StateMan();

var config = {
  enter: function(option){ console.log("enter: " + this.name + "; active: " + stateman.active.name )},
  leave: function(option){ console.log("leave: " + this.name + "; active: " + stateman.active.name) }
}

function cfg(o){
  o.enter = o.enter || config.enter  
  o.leave = o.leave || config.leave  
  o.update = o.update || config.update  
  return o;
}


stateman.state({

  "app": config,
  "app.contact":  config,
  "app.contact.detail": config,
  "app.user": config

}).start();


```


<a name="param1"></a>

4. __stateman.param__:

The current param captured from url or be passed to the method __stateman.go__.

__Example__

```js

stateman.nav("app.detail", {})

```





<a id="state1"></a>
## Class: State

you can use `stateman.state(stateName)` to get the target state. each state is instanceof `StateMan.State`. the context of the methods you defined in config(`enter`, `leave`, `update`) is belongs to state.

```js

var state = stataeman.state("app.contact.detail");
state.name = "app.contact.detail"

```

__ state's properties __

1. <del>state.async </del> (REMOVED!) : use option.async instead
2. state.name [String]: the state's stateName
3. state.visited [Boolean]: whether the state have been entered.
4. state.parent [State or StateMan]: state's parent state.for example, the parent of 'app.user.list' is 'app.user'.
5. state.manager [StateMan]: represent the stateman instance;




