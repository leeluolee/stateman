StateMan
=======

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/leeluolee/stateman?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)


[![Build Status](http://img.shields.io/travis/regularjs/regular/master.svg?style=flat-square)](http://travis-ci.org/regularjs/regular)
[![spm package](http://spmjs.io/badge/stateman)](http://spmjs.io/package/stateman)


stateman: A tiny foundation that provides nested state-based routing for complex web applications. 


stateman is highly inspired by [ui-router](https://github.com/angular-ui/ui-router); you will find many features similar to it.

But stateman is a __standalone library__ with an extremely tiny codebase (10kb minified). Feel free to integrate it with whatever framework you like! 



## Reference

- [English](http://leeluolee.github.io/stateman/)
- [中文手册](http://leeluolee.github.io/stateman/?API-zh)


## Feature

0. nested routing support.
1. standalone with tiny codebase.
2. async routing support if you need asynchronous logic in navigating. Support Promise
3. html5 history supported, fallback to hash-based in old browser. 
5. [concise API](https://github.com/leeluolee/stateman/tree/master/docs/API.md), deadly simple to getting start with it.
6. support IE6+ and other modern browsers.
7. __well tested, born in large product.__


## Quick Start

You may need a static server to run the demo. [puer](https://github.com/leeluolee/puer) is simple to get start.

just paste the code to your own `index.html`, and load it up in a browser. 

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

open the console to see the output when navigating.


## Demos

###1.  [Simple Layout Demo:](http://leeluolee.github.io/stateman/example/layout.html) 

The code in this demo is for demonstration only. In a production development, you will want a view layer to create nested views.

###2. A simple SPA built upon [Regularjs (Living Template)](https://github.com/regularjs/regular) + requirejs + stateman: [Link](http://regularjs.github.io/regular-state/requirejs/index-min.html)

I create a simple wrapping ([regular-state](https://github.com/regularjs/regular-state)) to integrate stateman with Regularjs, which makes it easy to build a single Page Application.  thanks to the concise API, [the code](https://github.com/regularjs/regular-state/blob/master/example/requirejs/index.js#L83) is very clean. You will find that integrating stateman with other libraries is also simple.




## Browser Support 

1. Modern browsers, including mobile devices
2. IE6+


## Installation

### Bower

```javascript
bower install stateman
```

`stateman.js` have been packaged as a standard UMD, so you can use it in AMD, CommonJS and as a global.

### npm (browserify or other based on commonjs)

```js
npm install stateman
```

To use:

```js
var StateMan = require('stateman');
```

### [spm](http://spmjs.io/package/stateman)

```js
spm install stateman
```

To use:

```js
var StateMan = require('stateman');
```

### Component

```js
component install leeluolee/stateman
```

To use:

```js
var StateMan = require('leeluolee/stateman');
```



### Direct downloads

1. [stateman.js](https://rawgit.com/leeluolee/stateman/master/stateman.js)
2. [stateman.min.js](https://rawgit.com/leeluolee/stateman/master/stateman.min.js)







## Examples

Some basic examples can be found in [the examples directory](https://github.com/leeluolee/stateman/tree/master/example).

__run demo local__

1. clone this repo
2. `npm install gulp -g && npm install`
3. `gulp server`
4.  check the example folder



## LICENSE

MIT.


## ChangLog





