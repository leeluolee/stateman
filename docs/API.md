# StateMan


## Class: StateMan

### 1. new StateMan() or StateMan()

__return__:  the StateMan instance


```javascript
var StateMan = require("stateman");

var stateman = new StateMan();  // or StateMan()

```


## Instance: stateman

### 1. stateman.state(stateName[, config])

__Arguments__

- stateName [String]: the state's name , like `contact.detail`
- config [Function|Object]: if config is not specified, the state defined by stateName will be return
	* config.url:  default url is the lastName: like `detail` in `contact.detail`
      ```js
		
	  ```
	
	* config.events:
	  ```javascript
	  stateman.state('contact')
      ```
            
	* config.enter [see:lifecyle](#lifecylce): An function that will be called when the state be entered into.
	* config.leave [see:lifecyle](#lifecylce): An function that will be called when the state be leaved out.
	* config.update [see:lifecyle](#lifecylce): the state is on the way to the current state, but not be entered into or leave out.

### Lifecycle

you can also directly defined a nested state　without createing its parent first. 

```javascript
stateman.state('lv1.lv2.lv3', {})
```



### __Important: The param captured in routing__

1. named param without pattern

```javascript

```

2. named param with pattern

3. unnamed param with pattern


<a name="start"></a>
### 2. stateman.__start__ (option)

<a name="nav"></a>
### 3. stateman.__nav__(url[, option][, callback]);

### 4. stateman.__go__(stateName [, option][, callback]);

### 5. stateman.__notify__(stateName, param)

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
StateMan have simple EventEmitter implementation for event handling, The Following Class Mixin the Emitter System

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