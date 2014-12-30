# a browserify transform for regularjs



# usage

```javascript

var path = require("path");
var fs = require('fs');

var regularify = require('regularify');
var browserify = require('browserify');


return browserify([path.join(__dirname, './src/index.js')])
  .transform(regularify({
    BEGIN: '{', END: '}',
    extensions: ['txt']
  }))
  .bundle()
  .pipe(fs.createWriteStream( path.join(__dirname ,"./bundle.js")))


```


## __option__

1. BEGIN: the BEGIN_TAG for regularjs template, the default is "{"
2. END: the END_TAG for regularjs template, the default is "}"
3. extensions: the custom extension for regularjs's template, the DEFAULT is ['regular', 'rgl']. passed extensions will concat with DEFAULT_EXTENSIONS




see the [https://github.com/regularjs/regularify/tree/master/example](https://github.com/regularjs/regularify/tree/master/example) folder for help
