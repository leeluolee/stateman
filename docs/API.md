
# StateMan API Reference

## Quirk Links

### API
- [new StateMan(option) or StateMan(option)](#instance)
- [__stateman.state__](#state)
- [stateman.start](#start)
- [stateman.nav](#nav)
- [stateman.go](#nav)
- [stateman.is](#nav)
- [stateman.encode](#encode)

- [stateman.on](#on)
- [stateman.off](#off)
- [stateman.emit](#emit)

- [stateman.stop](#stop)
- [stateman.decode](#decode)

### [Event](#event)

- __`begin`__: emit when an navigating is begin
- __`end`__:  emit when an navigating is over
- `notfound`:  no state is founded when path is changed
- `start`: emit when calling stateman.start
- `stop`: emit when calling stateman.stop
- `history:change`: if path  is changed . emitted by stateman.history.

### Properties

- [stateman.current](#current)
- [stateman.previous](#previous)
- [stateman.pending](#pending)
- [stateman.param](#param)

### Deep Guide

* [nested state](#nested)
* [__LifeCycle__ In one Navigating](#lifecycle)
* [__params in routing__](#params)
* [encode url from state with param](#restore)
* [redirect during one navigating](#redirect)


## Class: StateMan

### 1. new StateMan() or StateMan()

__return__:  the StateMan instance


```javascript
var StateMan = require("stateman");

var stateman = new StateMan();  
var stateman = StateMan();
```


## Instance: stateman

## 1. stateman.state(stateName[, config])
stateman.state is the most important api in stateman. 

 __Arguments__

- __stateName__ < String  |Object >: the state's name , like `contact.detail`, if a `Object` is passed in, there will be a multiple operation.
- __config__ < Function | Object >: the configure of the state which stateName specified.
	if config is not passed, target [state](#State)   will be return. if a `Function` is passed, it will be considered as the [enter](#enter) property

you can simply replace the `.` with `/` to get the url that state represent. for example , the url of 'app.contact' is '/app/contact'. but you can adjust the url by passing the [url](#url) in config.

 __Return__ : this

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

// get the state definition

```

As you see, we haven't create the `demo` state before creating `demo.detail`, beacuse stateman have created it for you. 






if config is not passing, `state.state(stateName)` will return the target state.

```js

var state = stateman.state('demo.list'); // return the demo.list state

```




### __The detail of the param `config`__

the config 


* config.url:  default url is the lastName: like `detail` in `contact.detail`
```js
      	 //=> /contact/:id
		stateman.state('contact.detact', {url: ':id'}) 
		
```

* config.enter(option) [see:lifecyle](#lifecylce): a function that will be called when the state be entered into.
* config.leave(option) [see:lifecyle](#lifecylce): a function that will be called when the state be leaved out.
* config.update(option) [see:lifecyle](#lifecylce): states that included by current state, but not be entered into or leave out. 



__example__: consume the current state is `app.detail.message.detail`, when naving to `app.detail.list.option`. the complete process is

1. leave app.detail.message.detail 
2. leave app.detail.message
3. enter app.detail.list
4. enter app.detail.list.option

during the navigating, there are two state is on the way to current(app.detail.list.option): `app.detail` and `app`. they will update.

1. app.detail update
2. app update

`enter`, `leave` and `update` they all accepet an param named `option`. option contains a special property `option.param` represent the param from url [see more: url routing](#routing)

a example to explain the lifecycle
[__Example__@TODO]()





<a name='param'></a>

### __Important: The param captured in routing__

you can use [__stateman.decode__](#decode) to find the mached state for the path.



####1. named param without pattern, the most usually usage.
	```shell
	/contact/:id
	```
	the router will be matched by path `/contact/1`

####2. named param with pattern
	named param follow with `(regexp)` can restrict the pattern for param (dont use sub capture it regexp)
	```sh
	/contact/:id(\\d+)
	```
	then, only the number is valid in this route.


#### special state

1. $notfound: notfound is a special state will be entered when every state isn't  matched by current url. you can define.

####3. unnamed param with pattern
you can also define a plain pattern for route matching.

	```sh
	/contact/(friend|mate)
	```


<a name="start"></a>
### 2. stateman.__start__ (option)

start the state manager. 

__option__
	- **option.html5**: whether to open the html5 history support  [runing mode](#mode)
	- **option.root**: the root of the url , only need when html5 is actived. defualt is `/`
	- **option.prefix**: for the hash prefix , default is '' (you can pass `!` to make the hash like `#!/contact/100`). 
	- **option.autolink**: whether to capture all anchor's navigating, only need when html5 is actived, default is `true`
	
<a name="nav"></a>
### 3. stateman.__nav__(url[, option][, callback]);

nav to a specified url, the `option` will passed to `enter`, `leave` and `update`, but some property in option can control the navigating, for example

- option.silent: if silent is true, only the url is change in browser, but will not trigger the Lifecycle
- option.replace: if replace is true. the previous path in history will be replace by current( you can't use back or go in browser to restore it)

### 4. stateman.__go__(stateName [, option][, callback]);

nav to specified state, very likely with stateman.nav. but stateman use stateName to navigating. 

- option.slient: if silent is true. url will not change in the browser, only state is change(different with state.nav)
- option.param: the 
you can use stateman.encode to find how stateman get url from a state with specifed param

```
stateman.state('/app/detail/:id')
```

### 5. stateman.__notify__(stateName, param)

each state is Also a __Emitter__(), so you can notify state. it is equals to 

```js
stateman.notify('app.detail', {id:1})

//equals to 
stateman.state('app.detail').emit('notify' ,{id:1});
``` 

### 6. stateman.encode( stateName[, param] )

### 7. stateman.decode( url )
find the state that match the url, [__nav__](#nav) and [__go__](#go) is based on this method

### 8. stateman.stop()

stop the routing

### 9. Other Useful property in stateman

1. __stateman.current__: 
	the current state in state manager, if a navigating is still in pending, the current represent the destination state. 

2. __stateman.previous__: 
	the previous state in state manager
	
3. __stateman.pending__: 
	the pending state in state manager, point the state that still in pending.

imagine that you navigating form state named 'contact.detail' to the state named 'user.detail', the current is point to contact.detail and the previous will point to 'user.detail'. 

Which is __pending__ point to? the pending is depend on the time that you call it. beacuse some state is asynchronous. 

`current`, `pending`, `previous` is __all living__ during the navigating operation.


## Emitter
StateMan have simple EventEmitter implementation for event driven development, The Following Class have the Emitter Mixin .

1. __StateMan__: The State Manager.
2. __StateMan.State__: Every state in state mannager is StateMan.State's instance
2. StateMan.Histery : for cross-platform 's location maniplatation, generally, you will nerver to use it.

all instance that extended from Class that list above have same API below


### 1. emitter.on(event, handle)
bind handle on specified event.

### 2. emitter.off(event, handle)
unbind handle 

### 3. emitter.emit(event, handle)

trigger a specified event.


## Event

1. start: when stateman is start
2. stop: when stateman is stop
2. begin: when a navigating is perform
3. end: when a navigating is over
4. history:change: when a change envet is emitted by history
5. notfound: when a notfound is 



stateman is a state-based libraring that focusing on complex  application routing.

SPA(Single Page Application) is become an common technology choice in morden web development , we need a routing library to help us organizing our logic, and make every page locatable(through the url).

But, the SPA is also become more and more complex, the routing-style that similar with server-side routing (express.Router.. etc) don't meet the requirements anymore. we need a well-designed foundation to simplify our logic.

[ui-router] go the right way, they abstarct a concept named __state__ to replace the real url to represent the application state. the state is 

