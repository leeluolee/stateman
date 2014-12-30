StateMan
=======


[![Build Status](http://img.shields.io/travis/regularjs/regular/master.svg?style=flat-square)](http://travis-ci.org/regularjs/regular)


stateman: A tiny foundation that providing nested state-based routing for complex web application. 


stateman is highly inspired by [ui-router](https://github.com/angular-ui/ui-router) , you can find many features similiar with it. 

But stateman is a __standalone library__ with extremely tiny codebase(10kb minified). feel free to integrated it with whatever framework you like! 


## Feature

0. nested routing support.
1. standalone with tiny codebase.
2. async routing support if you need asynchronous logic in navigating. 
3. html5 history supported, fallback to hash-based in old browser. 
5. [concise API](https://github.com/leeluolee/stateman/tree/master/docs/API.md), deadly simple to getting start with it.
6. support IE6+ and other modern browsers.


## Reference

- [English](https://github.com/leeluolee/stateman/tree/master/docs/API.md)
- [中文](https://github.com/leeluolee/stateman/tree/master/docs/API-zh.md)



## Quirk Start

you may need a static server to run the demo. [puer](https://github.com/leeluolee/puer) is simple to get start.

just pasting the code to your own `index.html`, then you can find the demo works. 

```html

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>StateMan Test</title>
  <script src="https://rawgit.com/leeluolee/stateman/master/stateman.js"></script>
</head>
<body>

<ul>
  <li><a href="#/home">/home"</a></li>
  <li><a href="#/contact">/contact"</a></li>
  <li><a href="#/contact/list">/contact/list</a></li>
  <li><a href="#/contact/2">/contact/2</a></li>
  <li><a href="#/contact/2/option">/contact/2/option</a></li>
  <li><a href="#/contact/2/message">/contact/2/message</a></li>
</ul>
  
<script>
  var config = {
    enter: function(){
      console.log("enter: " + this.name)
    },
    leave: function(){
      console.log("leave: " + this.name)
    }
  }

  function create(o){
    o = o || {};
    o.enter= config.enter;
    o.leave = config.leave;
    return o;
  }

  var stateman = new StateMan();

  stateman
    .state("home", config)
    .state("contact", config)
    .state("contact.list", config )
    .state("contact.detail", create({url: ":id(\\d+)"}))
    .state("contact.detail.option", config)
    .state("contact.detail.message", config)
    .start({});
</script>
</body>
</html>

```

open the console,  see the  log of the navigating.

## Browser Support 

1. Modern Broswer contains mobile devices
2. IE6+



## installation

###bower

```javascript
bower install stateman
```

`stateman.js` have been packaged as a standard UMD, you can use it in AMD、commonjs and global.

### npm (browserify or other based on commonjs)

```js
npm install stateman
```

use

```js
var StateMan = require('stateman');
```

### component

```js
component install leeluolee/stateman
```
use

```js
var StateMan = require('leeluolee/stateman');
```



### Directly download

1. [stateman.js](https://rawgit.com/leeluolee/stateman/master/stateman.js)
2. [stateman.min.js](https://rawgit.com/leeluolee/stateman/master/stateman.min.js)







## Example

some basic example has been placed at [example](https://github.com/leeluolee/stateman/tree/master/example)

__run demo local__

1. clone this repo
2. `npm install gulp -g && npm install`
3. `gulp server`
4.  check the example folder



## LICENSE

MIT.