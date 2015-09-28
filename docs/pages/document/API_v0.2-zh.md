

>  微量的api在0.2版本有所修改


##   0.2.x的改进 


- 增加了一个[askForPermission](#permission), 来帮助我们阻止一次跳转(比如在离开时， 加个通知用户是否要保存）
- 现在你可以在`enter`, `leave` 以及新增加的 `canLeave`, `canEnter` 方法中来返回Promise对象， 这对于一些异步的跳转非常有帮助
- 事件现在支持[命名空间](#event)了
- 移除了[state.async] 方法, 如果你的运行环境不支持Promise, 你仍然可以使用 `option.async` 来获得一样的效果


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


对象`config`用来输出navgating的相关信息, 你不需要立刻理解这个例子, 稍后文档会慢慢告诉你一切.

你可以直接通过【[在线DEMO](./example/api.html)】 访问到这个例子, 有时候试着在console中测试API可以帮助你更好的理解它们




## API

### new StateMan

__Usage__

`new StateMan(option)`

__Arguments__

|Param|Type|Detail|
|--|--|--|
|option.strict|Boolean| Default: false . 是否只有叶子节点可以被访问到 |
|option.title| String|  设置文档标题， 见  [config.title](#title)|


__Return__

[Stateman] :  StateMan的实例

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

如果strict为true, 会导致上例的 `app.contact`等状态不能被直接定位(即无法成为stateman.current了). 只有像`app.contact.message` 这样的叶子节点可以被直接访问.


### stateman.state

__Usage__

`stateman.state(stateName[, config])`


stateman.state 用来增加/更新一个state, 或获取指定的state对象(假如 config 参数没有指定的话)



__Arguments__

|Param|Type|Detail|
|--|--|--|
|stateName|String  Object| state名称，假如传入了一个对象，将成为一个多重设置|
|config(optional)|Function Object| 如果config没有指定，将会返回指定的state, 假如传入的是一个函数，则相当于传入了`config.enter`, 如果指定的state已经存在，原设置会被覆盖 |

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


诚如你所见，我们并不需要在定义`demo.detail`之前定义`demo`, stateman会帮你创建中间state

如果config参数没有传入，则会返回对应的state对象


```js

// return the demo.list state
var state = stateman.state('demo.list'); 

```





<a id='config'></a>

### >  关于`config`


所有config中的属性都会成为对应state的实例属性，但在这里, 需要对一些特殊的属性做说明



#### lifecycle related 



这里有五个生命周期相关的方法可供你用来控制 路由的逻辑, 它们都是可选择实现的 , 查看[生命周期](#lifecycle)了解更多

* __config.enter(option)__: 一个函数，当状态被__进入时__会被调用
* __config.leave(option)__: 一个函数，当状态被__离开时__会被调用
* __config.update(option)__: 一个函数，当状态__更新时__会被调用, 更新的意思是，路径有变化，但是此状态仍未被退出.
* __config.canEnter(option)__: 请求是否可进入
* __config.canLeave(option)__: 请求是否可退出





#### config.url: 

`url`  属性用来配置state(非全路径)的url片段



每个state对应的捕获url是所有在到此状态路径上的state的结合. 比如`app.contact.detail` 是 `app`,`app.contact` 和`app.contact.detail`的路径结合




__Example__

```js

state.state("app", {})
  .state("app.contact", "users")
  .state("app.contact.detail", "/:id")

```


`app.contact.detail`的完整捕获路径就是`/app/users/:id`. 当然，如你所见, 我们可以在url中定义我们的[路径参数](#param)






__ 绝对路径__

如果你不需要父级的url定义，你可以使用`^`符号来使当前状态的url



```js
state.state("app.contact.detail", "^/detail/:id");
state.state("app.contact.detail.message", "message");
```


这样`app.contact.detail`的路径会直接变成 `/detail/:id`，子状态会被影响到也变为`/detail/:id/message`





__空url__: 放弃当前这级的路径配置

如果你传入`""`, 你会放弃当前url配置, 这样你的捕获路径会与父状态一致(不过匹配优先级更高)






<a href="#" name="title"></a>

#### config.title


一旦跳转结束， 我们可以控制标签栏的title值(当然 你可以在enter, update, leave中来更精确的手动使用document.title来设置)



__Argument__

- config.title [String or Function]: 如果是函数，document会设置成其返回值 

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


正如你所见， 如果当前状态的title没有配置，stateman会去找它父状态的title， 直到stateman本身为止.







<a name="start"></a>

### stateman.start

 启动stateman, 路由开始

__Usage__

`stateman.start(option)`

__option__


|Param|Type|Detail|
|--|--|--|
|html5 |Boolean|(default false)  是否开启html5支持, 即使用pushState等API代替hash设置|
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

__Warning__


如果你在不支持html5 pushState的浏览器开启了`html=true`, stateman会自动降级到hash的路由. 




就如同上例的配置.

1. 如果我们在不支持html5(pushState相关)的浏览器访问`/blog/app`, stateman会降级到hash的路由，并自动定向到`/blog#/app`的初始状态.

2. 如果我们在__支持html5__的浏览器范围__`/blog#/app`__, stateman同样会使用history的路由路径，并自动返回到 `/blog/app`的初始状态.






  
<a name="nav"></a>
### stateman.nav


跳转到指定路径，[url中匹配到的参数](#param)会合并到option, 并最终传给之前提到的`enter`, `leave`, `update`函数.



__Usage__

`stateman.nav(url[, option][, callback])`;



__Argument__

|Param|Type|Detail|
|--|--|--|
|url |String| 跳转url|
|option(optional) |Object| [路由option](#option). url参数会作为option的param参数. |
|callback(optional)|Function| 跳转结束后，此函数会被调用|


__control option__



* option.silent: 如果传入silent, 则只有url路径会发生改变，但是不触发stateman内部的状态改变, 即不会有enter, leave或updatec触发
* option.replace: 如果replace === true, 之前历史的记录会被当前替换，即你无法通过浏览器的后退，回到原状态了




__Example__

`stateman.nav("/app/contact/1?name=leeluolee", {data: 1}); `



最终传入到enter, leave与update的option参数会是 



<!-- /t -->

`{param: {id: "1", name:"leeluolee"}, data: 1}`.




<a name="go"></a>

### stateman.go


跳转到特定状态, 与 stateman.nav 非常相似，但是stateman.go 使用状态来代替url路径进行跳转



__Usage__

`stateman.go(stateName [, option][, callback])`;


__Arguments__

- stateName [String]:  目标状态

- option [Object]: [Routing Option](#option)

  - option.encode: 

   默认是true, 如果encode是false. 则地址栏的url将不会发生变化，仅仅只是触发了内部状态的跳转. 当encode为true时， stateman会使用[encode](#encode) 函数去反推出真实的url路径显示在location中.
  
  - option.param: 

     nav与go的最大区别就在于param参数 

      如果你的路径中带有参数，则需要传入param来帮助encode函数推算出url路径

  you can use [stateman.encode](#encode) to test how stateman compute url from a state with specifed param

  - option.replace:  见[stateman.nav](#nav)

- calback [Function]: 同nav


所有其它的option属性将会与param一起传入 `enter`, `leave` , `update`中.



__Example__

```
stateman.go('app.contact.detail', {param: {id:1, name: 'leeluolee'}});
```


地址会跳转到`#/app/contact/1?name=leeluolee`, 你可以发现未命名参数会直接拼接在url后方作为queryString 存在.



__Tips__: 


作者始终推荐在大型项目中使用go代替nav来进行跳转， 来获得更灵活安全的状态控制.






 __相对跳转__: 


stateman预定义了一些符号帮助你进行相对路径的跳转



1. "~":   代表当前所处的active状态
2. "^":  代表active状态的父状态;

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


判断当前状态是否满足传入的stateName. 如果有param 参数传入，则除了状态，param也必须匹配. 你不必传入所有的参数， is 只会判断你传入的参数是否匹配.



__Arguments__

|Param|Type|Detail|
|--|--|--|
|stateName |String| 用测试的stateName |
|param(optional)|Object| 用于测试的参数对象|
|isStrict(optional)|Boolean| 传入状态是否要严格匹配当前状态|



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


根据状态名和参数获得指定url.

go函数即基于此方法





__Usage__

`stateman.encode( stateName[, param] )`


__Arguments__


|Param|Type|Detail|
|--|--|--|
|stateName |String| stateName |
|param(optional)|Object| 用于组装url的参数对象|


```js
stateman.encode("app.contact.detail", {id: "1", name: "leeluolee"}) 
// === "/app/contact/1?name=leeluolee"

```

<a name="decode"></a>
### stateman.decode


解码传入的url, 获得匹配的状态，状态同时会带上计算出的参数对象

方法[__nav__](#nav) 就是基于此方法实现


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

 为指定函数名添加监听器



__Usage__

`stateman.on(event, handle)`


StateMan内置了一个小型Emitter 来帮助实现事件驱动的开发, 在 [Routing Event](#event) 中查看内建事件




you 可以使用 `[event]:[namespace]`的格式区创建一个带有namespace的事件


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

解绑一个监听器


__Usage__

`stateman.off(event, handle)`


__Example__


这里有多种参数可能



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


触发一个事件，你可以传入对应的参数




__Usage__

`stateman.emit(event, param)`



与stateman.off类似， namespace会影响函数的表现， 我们用例子来说明一下



__Example__

```js
// emit all listeners named `begin` (ignore namespace) 
stateman.emit('begin') 
// emit all listeners named `begin`, and with namespace `name1`
  .emit('custom:name1')   

```


##  理解Routing 

<a name='lifecycle'></a>

### Routing  生命周期 


> <img src="lifecycle.png" width="100%">

There are three stages in one routing.

- permission
- navigation
- completion

let's talk about `navigation` first.


<a name="navigation"></a>
#### navigation: enter, leave , update: 


`enter`, `update` and `leave`是生命周期中最重要的三个时期, 会在这个stata被进入、离开和更新时被调用



__Example__: 



假设当前状态为`app.contact.detail.setting`, 当我们跳转到 `app.contact.message`. 完整的动作是


1. leave: app.contact.detail.setting
2. leave: app.contact.detail
3. update: app.contact
4. update: app
5. enter: app.contact.message



你可以直接在这里页面来查看完整过程： [api.html](./example/api.html);

基本上，这里没有难度去理解`enter` 和 `leave`方法，但是`update`何时被调用呢?

先看下我们文章开始的[【例子】](./example/api.html)中定义的`app.contact.detail.setting`. 当我们从 `/app/contact/3/setting`跳转到`app/contact/2/setting`时，实际上stateman的当前状态并没有变化， 都是`app.contact.detail.setting`, 但是参数id改变了，这时我们称之为update, 所有被当前状态包含的状态(但没被enter和leave)都会运行update方法.




<a name="permission"></a>
#### permission: canEnter canLeave


有时候， 我们需要在跳转真正开始前阻止它， 一种解决方案是使用[`begin`](#event)


```js
stateman.on('begin', function(option){
  if( option.current.name === 'app.user' && !isUser){
    option.stop()
  }
  
})
```


在版本0.2之后， stateman提供了一种额外的方法， 可供每个状态自己控制是否允许被跳入或跳出, 我们称之为 __"请求权限"__的过程，这个过程发生在跳转(`enter`, `leave`)之前


```js
stateman.state('app.user',{
  'canEnter': function(){
    return !!isUser;
  }
})

```


在上面的例子中，如果`false`被返回了， 则此跳转会被，并恢复之前的url.

__你当然也可以使用[Promise](#control) 来实现异步的流程控制__

现在扩展在[navigation](#navigation)中提到的例子，当你从 `app.contact.detail.setting` 跳转到 `app.contact.message`. 现在完整的流程是



1. __canLeave: app.contact.detail.setting__
2. __canLeave: app.contact.detail__
3. __canEnter: app.contact.message__
4. leave: app.contact.detail.setting
5. leave: app.contact.detail
6. update: app.contact
7. update: app
8. enter: app.contact.message



如果任何一个过程没有被定义, 它会被忽略， 所以都是可选的， 我们只需要实现我们跳转逻辑中需要实现的方法.




<a name="control"></a>
### Routing  控制 


Stateman 提供几种方式来帮助你实现 __异步或同步__ 的跳转控制. 你可以在[lifecyle.html](./example/lifecycle.html)查找到当前的页面.



<a name="promise"></a>
#### [__Promise__](#Promise)


如果你的运行环境有Promise支持(浏览器或引入符合规范的Promise/A+的polyfill), 建议你使用Promise控制.


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



如果Promise对象被reject 或 resolve(false), 跳转会直接停止， 如果还在`askForPermission`阶段，url也会被恢复

 


####  返回值控制


你可以在`enter`, `leave` 等函数中返回`false`来__同步的__阻止这次跳转


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


stateman 没有与任何promise的polyfill 绑定， 如果你没有在旧版本浏览器主动引入Promise的垫片， 你也可以使用`option.async`来实现同样的功能





<a name='option'></a>
### Routing Option



`enter`，`leave`,`update`, `canEnter` 和 `canLeave` 都接受一个称之为 __Routing Option__ 的参数. 这个参数同时也会传递事件 `begin` 和 `end`.
这个option和你传入go 和 nav的option 是同一个引用， 不过stateman让它携带了其它重要信息




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
|option.phase| String| 跳转所处阶段|
|option.param| Object| 捕获到的参数|
|option.previous| State| 跳转前的状态|
|option.current| State| 要跳转到的状态|
|option.async| Function| 异步跳转的一种补充方式, 建议使用Promise|
|option.stop | Function| 是否阻止这次事件|

#### 0. option.phase


代表现在跳转进行到了什么阶段. 现在跳转分为三个阶段

- permission: 请求跳转阶段
- navigation: 跳转阶段
- completion: 完成





#### 1. option.async


如果你需要在不支持Promise的环境(同时没有手动添加任何Promise的Polyfill), 你需要option.async来帮助你实现异步的跳转



__Return __


返回一个释放当前装状态的函数



```js

"app.user": {
  enter: function(option){
    var resolve = option.async(); 
    setTimeout(resolve, 3000);
  }
}

```



这个返回的`resolve`函数非常接近Promise中的`resolve`函数， 如果你传入false, 跳转会被终止



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

 目标state 

#### 2. option.previous

 上任state

#### 3. option.param: see [Routing Params](#param)

#### 4. option.stop


手动结束这次跳转， 一般你可能会在begin事件中使用它. 




<a name='param'></a>
### Routing  参数 

####1. 命名参数但是未指定捕获pattern.


__Example__



捕获url`/contact/:id`可以匹配路径`/contact/1`, 并得到param`{id:1}`

事实上，所有的命名参数的默认匹配规则为`[-\$\w]+`. 当然你可以设置自定规则.

<!-- /t -->

####2.  命名参数并指定的规则



命名参数紧接`(RegExp)`可以限制此参数的匹配(不要再使用子匹配). 例如



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


#### 5.  隐式 param



就像使用POST HTTP 请求一样， 参数不会显示在url上. 同样的, 利用一些小技巧可以让你在stateman实现隐式的参数传递. 换句话说， 你也可以传递非字符串型的参数了。



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
### Routing  事件

#### begin


每当跳转开始时触发， 回调会获得一个特殊的参数`evt`用来控制跳转.




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


将上述代码复制到[http://leeluolee.github.io/stateman/api.html#/app/user](./example/api.html#/app/user).并点击 `app.contact.message`. 你会发现跳转被终止了.



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

你可以监听notfound事件，来将页面导向默认状态


__Example__

```js

stateman.on("notfound", function(){
  this.go("app.contact");
})
```


##  其它属性

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




