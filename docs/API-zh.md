



# StateMan  文档



为了更好的理解这不算多的API, 在文档开始前，假设我们已经配置了这样一段路由脚本.



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


对象`config`用来输出navgating的相关信息, 你不需要立刻理解这个例子, 稍后文档会慢慢告诉你一切.

你可以直接通过【[在线DEMO](http://leeluolee.github.io/stateman/api.html)】 访问到这个例子, 有时候试着在console中测试API可以帮助你更好的理解它们




## API

### new StateMan

__Usage__

`new StateMan(option)`

__Arguments__

|Param|Type|Detail|
|--|--|--|
|options|Object| 目前还没有配置项|


__Return__

- type [Stateman] :  StateMan的实例

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


stateman.state 用来增加/更新一个state, 或获取指定的state对象(假如 config 参数没有指定的话)



__Arguments__

|Param|Type|Detail|
|--|--|--|
|stateName|String  Object| state名称，加入传入了一个对象，将成为一个多重设置|
|config(optional)|Function Object| 如果config没有指定，将会返回指定的state, 假如传入的是一个函数，则相当于传入了`config.enter`, 如果指定的state已经存在，原设置会被覆盖 |

 __Return__ : 

 - type [StateMan]: this

  if config is not passed

 - type [[State](#)]: the state.


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


诚如你所见，我们并不需要在定义`demo.detail`之前定义`demo`, stateman会帮你创建中间state

如果config参数没有传入，则会返回对应的state对象


```js

// return the demo.list state
var state = stateman.state('demo.list'); 

```









<a id='config'></a>

### *  关于`config`


所有config中的属性都会成为对应state的实例属性，但在这里, 需要对一些特殊的属性做说明




#### config.url: 

`url`属性用来配置 __当前状态__ (非全路径)的url片段

 默认的url是逗号分割的最后一个词, 如`contact.detail`的`detail` 

```js
  	 //=> /contact/:id
stateman.state('contact.detail', {url: ':id'}) 
		
```


每个state对应的捕获url是所有在到此状态路径上的state的结合. 比如`app.contact.detail` 是 `app`,`app.contact` 和`app.contact.detail`的路径结合


__Example__

```js

state.state("app", {})
	.state("app.contact", "users")
	.state("app.contact.detail", "/:id")

```


`app.contact.detail`的完整捕获路径就是`/app/users/:id`. 当然，如你所见, 我们可以在url中定义我们的[路径参数](#param)


missing `/` or redundancy of `/` is all valid.



__ 绝对路径__

如果你不需要父级的url定义，你可以使用`^`符号来使当前状态的url



```js
state.state("app.contact.detail", "^/detail/:id");
state.state("app.contact.detail.message", "message");
```


这样`app.contact.detail`的路径会直接变成 `/detail/:id`，子状态会被影响到也变为`/detail/:id/message`





__空url__: 放弃当前这级的路径配置

如果你传入`""`, 你会放弃当前url配置, 这样你的捕获路径会与父状态一致(不过匹配优先级更高)




#### enter, leave , update: 


* __config.enter(option)__: 一个函数，当状态被__进入时__会被调用
* __config.leave(option)__: 一个函数，当状态被__离开时__会被调用
* __config.update(option)__: 一个函数，当状态__更新时__会被调用, 更新的意思是，路径有变化，但是此状态仍未被退出.

`enter`, `update` and `leave`是state中最重要的三个时期, 每当这个stata被进入、离开和更新时会被调用




__Example__: 



假设当前状态为`app.contact.detail.setting`, 当我们跳转到 `app.contact.message`. 完整的动作是



1. leave: app.contact.detail.setting
2. leave: app.contact.detail
3. update: app.contact
3. update: app
4. enter: app.contact.message


你可以直接在这里页面来查看完整过程： [api.html](http://leeluolee.github.io/stateman/api.html);

基本上，这里没有难度去理解`enter` 和 `leave`方法，但是`update`何时被调用呢?

先看下我们文章开始的[【例子】](http://leeluolee.github.io/stateman/api.html)中定义的`app.contact.detail.setting`. 当我们从 `/app/contact/3/setting`跳转到`app/contact/2/setting`时，实际上stateman的当前状态并没有变化， 都是`app.contact.detail.setting`, 但是参数id改变了，这时我们称之为update, 所有被当前状态包含的状态(但没被enter和leave)都会运行update方法.






`enter`, `leave` and `update` 它们都接受一个相同的参数 `option`. option 包含一个特殊的属性: `option.param` 它代表来自url的参数, [查看 param 了解更多](#param)







<a name='param'></a>

### * 路由参数


####1. 命名参数但是未指定捕获pattern.


__Example__



捕获url`/contact/:id`可以匹配路径`/contact/1`, 并得到param`{id:1}`

事实上，所有的命名参数的默认匹配规则为`[-\$\w]+`. 当然你可以设置自定规则.

<!-- /t -->

####2.  命名参数并指定的规则


命名参数紧接`(RegExp)`可以限制此参数的匹配(主要不要再使用子匹配). 例如



now , only the number is valid to match the id param of  `/contact/:id(\\d+)`


####3. 未命名的匹配规则


你可以只捕获不命名



__Example__

```sh
/contact/(friend|mate)/:id([0-9])/(message|option)
```


这个捕获路径可以匹配`/contact/friend/4/message` 并获得参数 `{0: "friend", id: "4", 1: "message"}`

如你所见，未命名参数会以自增+1的方式放置在参数对象中.

<!-- /t -->

#### 4. param in search


你当然也可以设置querystring . 以 `/contact/:id`为例.



输入`/contact/1?name=heloo&age=1`, 最终你会获得参数`{id:'1', name:'heloo', age: '1'}`. 
<!-- /t -->


<a name="start"></a>
### stateman.start

 启动stateman, 路由开始

__Usage__

`stateman.start(option)`

__option__


|Param|Type|Detail|
|--|--|--|
|html5 |Boolean|(default false)  是否开启html5支持, 使用pushState, replaceState和popstate|
|root |String|(default '/')  程序根路径，影响到你使用html5模式的表现|
|prefix| String |  配置hashban, 例如你可以传入'!'来达到`#!/contact/100`的hash表现|
|autolink| Boolean | (defualt true)  是否代理所有的`#`开始的链接来达到跳转, 只对html5下有用|


__Example__

```js
stateman.start({
  "html5": true,
  "prefix": "!",
  "root": "/blog" //the app is begin with '/blog'
})

```
	
<a name="nav"></a>
### stateman.nav


跳转到指定路径，[url中匹配到的参数](#param)会合并到option, 并最终传给之前提到的`enter`, `leave`, `update`函数.



__Usage__

`stateman.nav(url[, option][, callback])`;



__Argument__

|Param|Type|Detail|
|--|--|--|
|url |String| 跳转url|
|option(optional) |Object| 跳转option. url参数会作为option的param参数. |
|callback(optional)|Function| 跳转结束后，此函数会被调用|


__control option__



* option.silent: 如果传入silent, 则只有url路径会发生改变，但是不触发stateman内部的状态改变, 即不会有enter, leave或updatec触发
* option.replace: 如果replace === true, 之前历史的记录会被当前替换，即你无法通过浏览器的后退，回到原状态了



__Example__

  * ` stateman.nav("/app/contact/1?name=leeluolee", {data: 1});
  `

{
the final option passed to `enter`, `leave` and `update` is `{param: {id: "1", name:"leeluolee"}, data: 1}`.
%
最终传入到enter, leave与update的option参数会是`{param: {id: "1", name:"leeluolee"}, data: 1}`.
}




<a name="go"></a>

### stateman.go


跳转到特定状态, 与 stateman.nav 非常相似，但是stateman.go 使用状态来代替url路径进行跳转



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
### stateman.is

__Usage__

`stateman.is( stateName[, param] [, isStrict] )`

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
### 

get a url from state and specified param.

method  [__go__](#go) is based on this method.

__Usage__

`stateman.encode( stateName[, param] )`


__Arguments__

```js
stateman.encode("app.contact.detail", {id: "1", name: "leeluolee"}) === "/app/contact/1?name=leeluolee"

```

<a name="decode"></a>
### stateman.decode

__Usage__

`stateman.decode( url )`

find the state that be matched by the particluar url, will also return the param captured from url.

method [__nav__](#nav) is based on this method

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

## Properties

Some living properties.

<a name="current"></a>
### __stateman.current__: 

The target state.

<a name="previous"></a>
### __stateman.previous__: 

The previous state.
	
<a name="active"></a>
### __stateman.active__: 

The active state, represent the state that still in pending.

Imagine that you are navigating from __'app.contact.detail'__ to  __'app.user'__, __current__ will be pointing to `app.user` and __previous__ will be pointing to 'app.contact.detail'. But the active state is dynamic, it is changed from `app.contact.detail` to `app.user`. 

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

Open the 【[DEMO](http://leeluolee.github.io/stateman/active.html) 】, and check the console.log.

<a name="param1"></a>
4. __stateman.param__:

The current param captured from url or passed from the method __stateman.go__.

__Example__

```

stateman.nav("app.detail", {})

```




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


## Builtin Event

### begin


每当跳转开始时触发， 回调会获得一个特殊的参数`evt`用来控制跳转.



__evt__

|Property|Type|Detail|
|--|--|--|
|evt.stop | Function| 是否阻止这次事件|
|evt.previous| State| 跳转时的状态|
|evt.current| State| 要跳转到的状态|
|evt.param| Object| 捕获到的参数|

Because the navigating isn't really start, property like `previous`, `current` and `param` haven't been assigned to stateman.

__Tips__

你可以通过注册begin事件来阻止某次跳转


```js
stateman.on("begin", function(evt){
  if(evt.current.name === 'app.contact.message' && evt.previous.name.indexOf("app.user") === 0){
    evt.stop();
    alert(" nav from 'app.user.*' to 'app.contact.message' is stoped");
  }
})

```

Paste code above to page [http://leeluolee.github.io/stateman/api.html#/app/user](http://leeluolee.github.io/stateman/api.html#/app/user), and click `app.contact.message` to see the log.


### end

Emitted when a navigating is end. 


### notfound: 

Emitted when target state is not founded.

__Tips__

你可以监听notfound事件，来将页面导向默认状态


__Example__

```js

stateman.on("notfound", function(){
  this.go("app.contact");
})
```





<a id="state1"></a>
## Class: State

you can use `stateman.state(stateName)` to get the target state. each state is instanceof `StateMan.State`. the context of the methods you defined in config(`enter`, `leave`, `update`) is belongs to state.

```js

var state = stataeman.state("app.contact.detail");
state.name = "app.contact.detail"

```


<a name="async"></a>

### state.async

___state.async__:

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



### other properties


1. state.name: the state's stateName
2. state.visited: whether the state have been entered.
2. state.parent: state's parent state.for example, the parent of 'app.user.list' is 'app.user'.
2. state.manager: represent the stateman instance;






### Deep Guide

* [Class: State](#State1)
* [asynchronous navigation](#async)
* [__params in routing__](#param)
