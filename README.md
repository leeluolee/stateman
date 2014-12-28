StateMan
=======


[![Build Status](http://img.shields.io/travis/regularjs/regular/master.svg?style=flat-square)](http://travis-ci.org/regularjs/regular)


stateman: A flexiable foundation that providing nested state-based routing for complex web application. 


stateman is highly inspired by [ui-router](https://github.com/angular-ui/ui-router) for angular, you can find many features similiar with it. 

But stateman is a __standalone__ library with extremely tiny codebase(10kb minified). feel free to integrated it with whatever framework you like! 


## Feature

0. nested routing support.
1. standalone with tiny codebase.
2. async routing support if you need asynchronous logic in naviagation. 
3. html5 history supported, fallback to hash-based in old browser.
4. builtin event emitter.
5. concise API, deadly simple to getting start with it.
6. support IE6+ and other modern browsers.



## Quirk Start

just pasting the code to your own `index.html`, and you can find the demo runs.

```javascript

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>StateMan Test</title>
  <script src="https://rawgit.com/leeluolee/stateman/master/stateman.js"></script>
  // use jquery to operate dom
  <script src="https://"></script>
</head>
<body>
  
<script>
  var stateman = new StateMan();

  stateman.state("")

</script>
</body>
</html>

```

## Browser Support 

1. Modern Broswer contains mobile devices
2. IE6 - IE8 

##Feature

stateman is borned in requirements, it reuse the concept __state__ in [ui-router], it is




## installation

- bower

```javascript
bower install stateman
```

- npm (browserify or other based on commonjs)

```js
npm install stateman
```

- component

```js
component install leeluolee/stateman
```

- exprimental 


change name to stateman.

## API Reference

- [English](https://github.com/leeluolee/stateman/tree/master/docs/API.md)
- [中文](https://github.com/leeluolee/stateman/tree/master/docs/API-zh.md)



## Guide


