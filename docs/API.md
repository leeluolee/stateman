
> Some people tell me there are __a lot of terrible lanuage errors__ in this page. I'm sorry for my poor english, I'll ask my colleague for help.
 and if somebody want to help me, please contact me(oe.zheng@gmail.com);

# StateMan {API Reference % 文档}



{
__ Before taking document into detail, suppose we already have a state config like this__
%
在文档开始前，假设我们已经配置了这样一段路由脚本
}


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
    enter: function(){
      var done = this.async();
      console.log(this.name + "is pending, 1s later to enter next state")
      setTimeout(done, 1000)
    },
    leave: function(){
      var done = this.async();
      console.log(this.name + "is pending, 1s later to leave out")
      setTimeout(done, 1000)
    }
  }),
  "app.user.list": cfg({url: ""})

}).on("notfound", function(){
  this.go('app') // if not found
}).start();

```

{
Object `config` is used to help us record the navigating, you don't need to understand the example right now, document will explain later.

You can find __the demo [here](http://leeluolee.github.io/stateman/api.html)__. type something in console can help you to understand api more clearly.
%
对象`config`用来记录navgating的信息, 你不需要立刻理解这个例子. 稍后文档会慢慢告诉你一切.

你可以直接[在线](http://leeluolee.github.io/stateman/api.html) 访问到这个例子

}


## API

### new StateMan

__Usage__

`new StateMan(option)`

__Arguments__

|Param|Type|Detail|
|--|--|--|
|options|Object|{ currenly, no options is needed % 目前还没有配置项}|


__Return__

- type [Stateman] :The instance of StateMan

__Example__

```javascript
var StateMan = require("stateman");

var stateman = new StateMan();  
// or...
var stateman = StateMan();
```

### stateman.state

__Usage__

`stateman.state(stateName[, config])`

{
stateman.state is used to add/update a state or get particular state(if param `config` is undefined) .
%
stateman.state 用来增加/更新一个state, 或获取指定的state对象(加入 config 参数没有指定的话)
}


__Arguments__

|Param|Type|Detail|
|--|--|--|
|stateName|String  Object|{ the state's name , like `contact.detail`, if a `Object` is passed in, there will be a multiple operation % state名称，加入传入了一个对象，将成为一个多重设置}|
|config(optional)|Function Object|{ is config is not specified, target state will be return. it will be considered as the [enter](#enter) property. 
  if the state is already exsits, the previous config will be override% 如果config没有指定，将会返回指定的state, 假如传入的是一个函数，则相当于传入了`config.enter`, 如果指定的state已经存在，原设置会被覆盖 }|

 __Return__ : 

 - type [StateMan]: this


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

{

As you see, we haven't created the `demo` state before creating `demo.detail`, beacuse stateman have created it for you. 

if config is not passing, `state.state(stateName)` will return the target state.
%
诚如你所见，我们并不需要在定义`demo.detail`之前定义`demo`, stateman会帮你创建中间state

如果config参数没有传入，则会返回对应的state对象
}

```js

// return the demo.list state
var state = stateman.state('demo.list'); 

```









<a id='config'></a>

### * Detail of `config`


#### config.url: 

{default url is the lastName: like `detail` in `contact.detail` % 默认的url是逗号分割的最后一个词, 如`contact.detail`的`detail`} 

```js
  	 //=> /contact/:id
stateman.state('contact.detail', {url: ':id'}) 
		
```

{
The captured url of a particular state is the combination of the all states in the path to this state. like  For Example: 
%
每个state对应的捕获url是所有在到此状态路径上的state的结合. 比如`app.contact.detail` 是 `app`,`app.contact` 和`app.contact.detail`的路径结合
}

__Example__

```js

state.state("app", {})
	.state("app.contact", "users")
	.state("app.contact.detail", "/:id")

```

{
The captured url of `app.contact.detail` is equals to `/app/users/:id`. YES, obviously you can define the param captured in the url. see [param in routing](#param) for more infomation.
%
`app.contact.detail`的完整捕获路径就是`/app/users/:id`. 当然，如你所见, 我们可以在url中定义我们的[路径参数](#param)
}

missing `/` or redundancy of `/` is all valid.

{
__absolute url__: 

if you dont need the url that defined in parents, use a prefix `^` to make it absolute . __all children of the state will also be affect
%

__ 绝对路径__

如果你不需要父级的url定义，你可以使用`^`符号来使当前状态的url

}

```js
state.state("app.contact.detail", "^/detail/:id");
state.state("app.contact.detail.message", "message");
```

{
The captured url of `app.contact.detail` will be `/detail/:id`. and the captured url of `app.contact.detail.message` will be `/detail/:id/message`.
%
这样`app.contact.detail`的路径会直接变成 `/detail/:id`，子状态会被影响到也变为`/detail/:id/message`
}


{
__empty url__: abandon the current url.

if you pass `url:""`, the captured_url will be the same as its parent.

%

__空url__: 放弃当前这级的路径配置

如果你传入`""`, 你会放弃当前url配置, 这样你的捕获路径会与父状态一致(不过匹配优先级更高)

}


#### enter, leave , update: 

{
* __config.enter(option)__: a function that will be called when the state be entered into.
* __config.leave(option)__: a function that will be called when the state be leaved out.
* __config.update(option)__: a function called by states that included by current state, but not be entered into or leave out. 
%
* __config.enter(option)__: 一个函数，当状态被__进入时__会被调用
* __config.leave(option)__: 一个函数，当状态被__离开时__会被调用
* __config.update(option)__: 一个函数，当状态__更新时__会被调用, 更新的意思是，路径有变化，但是此状态仍未被退出.

}


__Example__: 


{
The current state is `app.contact.detail.setting`, when navigating to `app.contact.message`. the complete process is

%
假设当前状态为`app.contact.detail.setting`, 当我们跳转到 `app.contact.message`. 完整的动作是

}

1. leave: app.contact.detail.setting
2. leave: app.contact.detail
3. update: app.contact
3. update: app
4. enter: app.contact.message

you can test it in [api.html](http://leeluolee.github.io/stateman/api.html);


{
`enter`, `leave` and `update` they all accepet an param named `option`. option contains a special property `option.param` represent the param from url [see param for detail](#param)

other options that passed into [__stateman.go__](#go) or [__stateman.nav__](#nav), will also be passed to `enter`, `leave`, `update`
%

`enter`, `leave` and `update` 它们都接受一个相同的参数 `option`. option 包含一个特殊的属性: `option.param` 它代表来自url的参数, [查看 param 了解更多](#param)

}





<a name='param'></a>

### * {Routing param%路由参数}


####1. {named param without pattern, the most usually usage %命名参数但是未指定捕获pattern}.


__Example__

<!-- t -->
captured url `/contact/:id` will  match the path `/contact/1`, and find the param `{id:1}`

In fact, all named param have a default pattern `[-\$\w]+`. but you can change it use custom pattern.
<!-- s -->

捕获url`/contact/:id`可以匹配路径`/contact/1`, 并得到param`{id:1}`

事实上，所有的命名参数的默认匹配规则为`[-\$\w]+`. 当然你可以设置自定规则.

<!-- /t -->

####2. {named param with pattern % 命名参数并指定的规则}

{
named param follow with `(regexp)` can restrict the pattern for current param (don't use sub capture it regexp). for example.
%
命名参数紧接`(RegExp)`可以限制此参数的匹配(主要不要再使用子匹配). 例如
}


now , only the number is valid to match the id param of  `/contact/:id(\\d+)`


####3. {unnamed param with pattern%未命名的匹配规则}

{
you can also define a plain pattern for route matching.
%
你可以只捕获不命名
}


__Example__

```sh
/contact/(friend|mate)/:id([0-9])/(message|option)
```

<!-- t -->

It will match the path `/contact/friend/4/message` and get the param `{0: "friend", id: "4", 1: "message"}`

unnamed param will be put one by one in `param` use autoincrement index. 
<!-- s -->
这个捕获路径可以匹配`/contact/friend/4/message` 并获得参数 `{0: "friend", id: "4", 1: "message"}`

如你所见，未命名参数会以自增+1的方式放置在参数对象中.

<!-- /t -->

#### 4. param in search

{
you can also passing query search in the url. take `/contact/:id` for example.
%
你当然也可以设置querystring . 以 `/contact/:id`为例.
}

<!-- t -->
it will matched the url `/contact/1?name=heloo&age=1`, and get the param `{id:'1', name:'heloo', age: '1'}`
<!-- s -->
输入`/contact/1?name=heloo&age=1`, 最终你会获得参数`{id:'1', name:'heloo', age: '1'}`. 
<!-- /t -->


<a name="start"></a>
### stateman.start

start the state manager. 

__Usage__

`stateman.start(option)`

__option__


|Param|Type|Detail|
|--|--|--|
|html5 |Boolean|(default false) {whether to open the html5 history support % 是否开启html5支持, 使用pushState, replaceState和popstate}|
|root |String|(default '/') {the root of the url , __only need when html5 is actived__. defualt is `/` % 程序根路径，影响到你使用html5模式的表现}|
|prefix| String | {for the hash prefix , default is '' (you can pass `!` to make the hash like `#!/contact/100`), works in hash mode.% 配置hashban, 例如你可以传入'!'来达到`#!/contact/100`的hash表现}|
|autolink| Boolean | (defualt true) {whether to delegate all link(a[href])'s navigating, only need when __html5 is actived__, default is `true`.% 是否代理所有的`#`开始的链接来达到跳转, 只对html5下有用}|


__Example__
	
<a name="nav"></a>
### stateman.nav

{
nav to particular url. [param from url](#param) will be merged to option and passed to function `enter`, `leave`, `update`.
%
跳转到指定路径，[url中匹配到的参数](#param)会合并到option, 并最终传给之前提到的`enter`, `leave`, `update`函数.
}


__Usage__

`stateman.nav(url[, option][, callback])`;



__Argument__

|Param|Type|Detail|
|--|--|--|
|url |String|{target url % 跳转url}|
|option(optional) |Object|{navigate option, option will merge the [param from url](#param) as its `param` property. % 跳转option. url参数会作为option的param参数. }|
|callback(optional)|Function|{function called after navigating is done% 跳转结束后，此函数会被调用}|


__control option__

* option.silent: if silent is true, only the location is change in browser, but will not trigger the stateman's navigating process
* option.replace: if replace is true. the previous path in history will be replace by url( means you can't backto  or goto the previous path)


__Example__

  * ` stateman.nav("/app/contact/1?name=leeluolee", {data: 1});
  `

the final option passed to `enter`, `leave` and `update` is `{param: {id: "1", name:"leeluolee"}, data: 1}`.




<a name="go"></a>

### stateman.go

nav to specified state, very similar with [stateman.nav](#nav). but `stateman.go` use stateName instead of url to navigating. 

__Usage__

`stateman.__go__(stateName [, option][, callback])`;


__Arguments__

- stateName: the name of target state.

- option.encode: default is true. if encode is false, url will not change at  location, only state is change (means will trigger the stateman's navigating process). stateman use the [__encode__](#encode) method to compute the real url.
- option.param: the big different between __nav__ and __go__ is __go__ method  may need a param to compute the real url, and place it in location.
you can use stateman.encode to test how stateman compute url from a state with specifed param
- option.replace: the same as [stateman.nav](#nav)

- calback: if passed, it will be called if navigating is over.

All other property in option will passed to `enter`, `leave` , `update`. just like nav.

__we always recommend that use go instead of nav in large project to control the state more clearly __.


__example__

```
stateman.go('app.contact.detail', {param: {id:1, name: 'leeluolee'}});
```

location.hash will change to `#/app/contact/1?name=leeluolee` , you can find that uncaputed param (name) will be append to url as the querystring.


__relative navigation__: you can pass special symbol to perform relative navigate.

1. "~":  represent the active state;
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
### 5. stateman.is( stateName[, param] [, isStrict] )

determine if the active state is equal to or is the child of the state. If any params are passed then they will be tested for a match as well. not all the parameters need to be passed, just the ones you'd like to test for equality.


__Arguments__

- stateName: test state's name
- param: the param need to be tested
- isStrict: if the target state need strict equals to active state.


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
### 6. stateman.encode( stateName[, param] )

get a url from state and specified param.

method  [__go__](#go) is based on this method.

__Arguments__

```js
stateman.encode("app.contact.detail", {id: "1", name: "leeluolee"}) === "/app/contact/1?name=leeluolee"

```

<a name="decode"></a>
### 7. stateman.decode( url )

find the state that match the url, 

method [__nav__](#nav) is based on this method

__Example__

```js
var state = stateman.decode("/app/contact/1?name=leeluolee")

state.name === 'app.contact.detail'
state.param // =>{id: "1", name: "leeluolee"}

```


<a name="stop"></a>
### 8. stateman.stop()

stop the stateman.

### 9. Other Useful property in stateman

<a name="current"></a>
1. __stateman.current__: 
	the current state, if a navigating is still in process, the current represent the destination state. 

<a name="previous"></a>
2. __stateman.previous__: 
	the previous state.
	
<a name="active"></a>
3. __stateman.active__: 
	the active state, point to the state that still in active.

imagine that you are navigating from state 'app.contact.detail' to state 'app.user', current will point to `app.user` and previous will point to 'app.contact.detail'. but the active state is dynamic, it is changed from `app.contact.detail` to `app.user`

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

open the [DEMO](http://leeluolee.github.io/stateman/active.html), and check the console.log

<a name="param1"></a>
4. __stateman.param__:
	the current param




## Emitter

StateMan have simple EventEmitter implementation for event driven development, The Following Class have the Emitter Mixin .



1. __StateMan__: The State Manager.
2. __StateMan.State__: Every state in state mannager is StateMan.State's instance
2. StateMan.Histery : for cross-platform 's location manipulation, generally speaking, you will nerver to use it.

all Class that list above have same API below


<a name="on"></a>

### 1. emitter.on(event, handle)
bind handle to specified event.

<a name="off"></a>
### 2. emitter.off(event, handle)
unbind handle 

<a name="emit"></a>
### 3. emitter.emit(event, param)

trigger a specified event with specified param


## StateMan's builtin Event

2. begin: when a navigating is perform
3. end: when a navigating is over
4. history:change: when a change envet is emitted by history
5. notfound: when no state is founded during a navigating.



<a name="state1"></a>
## Class: State

you can use `stateman.state(stateName)` to get the target state. each state is instanceof `StateMan.State`. the context of the methods you defined in config(`enter`, `leave`, `update`) is pointed to state.

```js

var state = stataeman.state("app.contact.detail");
state.name = "app.contact.detail"

```


<a name="async"></a>

### 1. state.async()

you can pending a state until you want to continue. see the `app.user` config that we defined above.

__Return __

A function used to release the  current pending state. 

```js

"app.user": {
  enter: function(){
    var done = this.async();
    console.log(this.name + "is pending, 1s later to enter next state")
    setTimeout(done, 1000)
  },
  leave: function(){
    var done = this.async();
    console.log(this.name + "is pending, 1s later to leave out")
    setTimeout(done, 1000)
  }
}


```

if enter into or leave out from the state `app.user`, pending it for 1s. then go to the next step. type `stateman.go('app.user.list')`, and see log at console.

it is very useful if you have some asynchronous logic(xhr, animation...etc) to operate.


### 2. state.config(config)

In fact, `stateman.state("app.user", config)` is equals to `stateman.state("app.user").config(config)`.


### 3. state.state()

this method is equls to "stateman.state"


### other property


1. state.name: the state's stateName
2. state.visited: whether the state have been entered.
2. state.parent: state's parent state.for example, the parent of 'app.user.list' is 'app.user'.
2. state.manager: represent the stateman instance;











### API
- [__stateman.state__](#state)
- [__stateman.start__](#start)
- [__stateman.nav__](#nav)
- [__stateman.go__](#go)
- [stateman.is](#is)
- [stateman.encode](#encode)
- [stateman.on](#on)
- [stateman.off](#off)
- [stateman.emit](#emit)
- [stateman.stop](#stop)
- [stateman.decode](#decode)

### [Event](#event)

- __`begin`__: emit when an navigating is begin
- __`end`__:  emit when an navigating is over
- `notfound`:  path is changed but no state is founded
- `history:change`: if path  is changed . emitted by [stateman.history](). 

### Properties

- [stateman.current](#current):  target state;
- [stateman.previous](#previous):  previous state;
- [stateman.active](#active): valuable at navigating. represent the active state.
- [stateman.param](#param1):  current param.

### Deep Guide

* [Class: State](#State1)
* [asynchronous navigation](#async)
* [__params in routing__](#param)
