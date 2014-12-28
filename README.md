StateMan
=======


[![Build Status](http://img.shields.io/travis/regularjs/regular/master.svg?style=flat-square)](http://travis-ci.org/regularjs/regular)


state manager: A concise, flexible foundation for complex application routing.


## Why Another wheel. 

Firstly, I promise stateman is considered irreplaceable

stateman is a state-based libraring that focusing on complex  application routing.

SPA(Single Page Application) is become an common technology choice in morden web development , we need a routing library to help us organizing our logic, and make every page locatable(through the url).

But, the SPA is also become more and more complex, the routing-style that similar with server-side routing (express.Router.. etc) don't meet the requirements anymore. we need a well-designed foundation to simplify our logic.

[ui-router] go the right way, they abstarct a concept named __state__ to replace the real url to represent the application state. the state is 


##Feature

stateman is borned in requirements, it reuse the concept __state__ in [ui-router], it is

0. nested routing support based on state.
1. standalone with 9kb (minify && no gzip) source code
2. async routing when you need asynchronous logic in state.
3. support IE6+ and all other modern browser.
4. history supported, fallback to hash-based in old browser.
5. concise API, deadly simple to getting start with it.



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


