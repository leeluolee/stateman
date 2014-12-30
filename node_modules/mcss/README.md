# Writing abstract and modular CSS with MCSS

MCSS是一个CSS Preprocessor, 语法上基于[CSS3 Syntax](http://dev.w3.org/csswg/css3-syntax/#parsing)的超集, 提供 **Nested Ruleset**, **Variable**, **first-class function(or mixin)**, **custom atrule**(@extend、@import、@abstract...)等等特性来填补原生CSS的抽象能力弱的缺陷, 帮助我们书写抽象化的CSS

MCSS是有丰富的语言特性的一个DSL, 它甚至允许扩展[`@atrule`](https://developer.mozilla.org/en-US/docs/Web/CSS/At-rule)自定义解释策略; 与此同时MCSS是一个易用使用的CSS Parser, 并提供便利化的方式去操作树形结构, 以实现csscomb、prefixr等CSS工具.


MCSS完全使用javascript构建, 你可以分别在browser(ES5 support needed)和nodejs中使用它

目前主页正在建设中，这是临时性介绍页, 你可以先 __[动手试试](http://leeluolee.github.io/mcss/)__ 

> 有兴趣可以查看下mcss的[实例函数库(类似compass)](https://github.com/leeluolee/mass)，你会发现几乎所有在mcss中都可以封装成函数的形势，如果你愿意

## 安装

### Nodejs

```bash
npm install -g mcss
```

### Browser

```html
<script src="https://github.com/leeluolee/mcss/blob/master/dist/mcss-latest.js"></script>
```
需要支持ES5的浏览器，绝对只建议在线上环境使用compile后的css文件，而不是即时compile;


## 使用

API请参考([API使用指南](dada))

### 命令行

一般就输入 ` mcss 输入目录或文件  -o  输出目录或文件  -w`即可开启监听并编译了， 其他参数请参考`mcss -h`

```bash
ubuntu-10:12 ~ $ mcss -h

  Usage: mcss [options] <file>

  Options:

    -h, --help                print usage information
    -v, --version             print the version number
    -f, --format <n>          the outport format, 1: common | 2: compress | 3:online
    -c, --config <file>          the config filepath. [optional]
    ..........省略请输入 mcss -h 查看详情............

```

__注意__: 当file参数为文件夹时, 会compile目录下的所有.mcss文件, 此时outport参数会视为是一个文件夹, 并将所有css输入到此文件夹


####配置文件

当参数略多时，你会感觉筋疲力竭, 这时你可以建立一个配置的JSON文件, 其中JSON中的input参数代表输入文件 file, 其它与命令行打印的__参数全名__(比如format)一致 并使用-c 参数指定这个配置文件,默认情况下mcss会寻找 __当前路径下的mcss.json__ 作为配置文件, 配置文件与命令的参数会进行合并(命令行优先)

```javascript
{
  "input": "./",  //代表输入文件或目录
  "outport": "../css",  //输出目录(如果输入为单文件可以是一个具体的文件名)
  "format": 1,
  "watch": 2, //检测文件变化并build，并有报警声(1监听但无报警), 0为不watch
  "exclude": "(\/|\\\\)_|^_|include"
}
```

__注意__: 使用config文件之后，程序的current word dir 切换到config文件的所在目录!!!



### 浏览器端
Browser环境时, 除了可以使用对应的API, mcss还会自动解释在mcss.js所在script标签前的所有`style[type='text/mcss']`与`link[rel='stylesheet/mcss']`的标签, 而其后的mcss文件不会生效. 如:

```html
<link rel="stylesheet/mcss" href="test.mcss"/>
<style type = 'text/mcss'>
  $color = #fff;
  $border-radius = ($radius = 5px){
    -webkit-border-radius: 5px;
    -moz-border-radius: 5px;
    border-radius: 5px;
  }
  p{
    border: 2px solid hsla(10, 90%, 21%, 0.1);
    $border-radius: 5px; 
  }
</style>
<script src="../../dist/mcss-0.0.1.js"></script>
<link rel="stylesheet/mcss" href="test2.mcss"/>
```
其中test2.mcss不会生效 

## 语言特性描述
了解特性之前，需要了解下mcss的基本数据类型(与css syntax对应) [MCSS的数据类型](#value)

有时也需要了解下选择器的基本概念, 可以去[nes的选择器科普页](https://github.com/leeluolee/nes/wiki/Selector)了解下

需要注意的是，由于mcss是css的超集， __ 标准css即标准mcss__

### nested ruleset

mcss支持层级嵌套的ruleset以及 & (父引用符号)
<!-- {{nested_ruleset.mcss}} -->

```css
.m-home{
    display: block;
    div, ul{
        + div{
            margin-top: 20px;
        }
        border: 2px solid #ccc;
        > a{
            color: #fff;
            &:hover{
               text-decoration: none; 
            }
            ~ span{
                display: block;
            }
        }
    }
}

```

__输出__

```css
.m-home{
  display:block;
}
.m-home div,.m-home ul{
  border:2px solid #cccccc;
}
.m-home div + div,.m-home ul + div{
  margin-top:20px;
}
.m-home div >a,.m-home ul >a{
  color:#ffffff;
}
.m-home div >a:hover,.m-home ul >a:hover{
  text-decoration:none;
}
.m-home div >a ~ span,.m-home ul >a ~ span{
  display:block;
}

```

mcss支持另外一种预置符`%`, 代表除最外层选择器之外的选择器序列 如:

```css
.ms-form{
    // 真不想重复写这么多啊
    input[type="text"],
    input[type="password"],
    input[type="email"],
    input[type="url"],
    input[type="date"],
    input[type="month"],
    input[type="time"],
    input[type="range"],
    select{
      display: inline-block;
      .ms-form-stack %{
        display: block;
      }
    }
    // other ruleset
}

```

__输出__

```css
.ms-form input[type="text"],.ms-form input[type="password"],.ms-form input[type="email"],.ms-form input[type="url"],.ms-form input[type="date"],.ms-form input[type="month"],.ms-form input[type="time"],.ms-form input[type="range"],.ms-form select{
  display:inline-block;
}
.ms-form-stack  input[type="text"],.ms-form-stack  input[type="password"],.ms-form-stack  input[type="email"],.ms-form-stack  input[type="url"],.ms-form-stack  input[type="date"],.ms-form-stack  input[type="month"],.ms-form-stack  input[type="time"],.ms-form-stack  input[type="range"],.ms-form-stack  select{
  display:block;
}
```
和类似[NEC](http://nec.netease.com/)的解决方案相契合



### 赋值操作

mcss中的variable与以 `$` 开头(与SCSS一致如$length), 这也是mcss引入的唯一一个非css规范的词法类型, 目的是 __防止潜在冲突__ 和 __视觉上更易识别__
mcss支持三种赋值操作`^=`, `=` 与 `?=`, 其中`?=` 只在变量未赋值或null时生效, 所有的值类型都可以被赋值,包括函数, `^=` 表示将赋值操作提升到全局作用域, 

```css
// $variable has scope
$a = 10px;
$a ?= 20px;

body{
    left: $a; // exports left: 10px;
}

// override before
$a = 30px;

body{
    left: $a; // exports left: 30px;
}

// function is also a value can be assigned
$fn ?= ($name) {
    left: $name;
}
```

__输出__ 

```css
body{
  left:10px;
}
body{
  left:30px;
}
```


由于mcss有严格作用域划分，所以有时候你想跳脱作用域限制时'^='这个赋值符可以解决一些封装的问题, 让几乎所有形式的组件都可以封装成函数的形式，比如

```
$import-raw = false;

$reset-var = (){
  $import-raw ^= true; //这个会影响到外层
}

$reset-var();//调用

body{
  left: $import-raw;
}
```

__输出__:

```css
body{
  left:true;
}
```




### 强大的function (mixin)
函数是mcss中除了css syntax中定义的值类型之外, 引入的唯一一种数据类型, 与js一样 mcss中的函数, 可以传递给函数，也可以在函数中被返回, 并保留定义时的作用域链(所谓的闭包)。

mcss中函数可以是一个block, 它可以有参数列表也可以没有

#### 1. 作为mixin混入使用
当function没有返回值时，函数成为一个mixin, 会将解释后的 function block输出，实现SCSS中的@include, 这也是最常用的方式

```
// 带参数
$size = ($width, $height){
    $height ?= $width;
    height: $height; 
    width: $width; 
}
// 不带参数, 可视为一个block模版  
$clearfix = {
    *zoom: 1;
    &:before, &:after {
        display: table;
        content: "";
        line-height: 0; 
    }
    &:after {
        clear: both; 
    }
}
body{
    $clearfix();
    $size(5px);
}
```

__输出__: 
```css
body{
    *zoom:1;
    height:5px;
    width:5px;
}
body:before,body:after{
    display:table;
    content:"";
    line-height:0;
}
body:after{
    clear:both;
}
```


#### 2. 作为函数使用

在解释function block时, 遇到了 @return 语句, 则中断返回. 注意返回值可以是另外一个函数. mcss 函数本质上与mcss的javascript实现的[内建函数](...)是一致的，优势是 __不需要树节点操作__ 。并且维护在mcss file中更易模块化。

```
$abs = ($value){
    @if $value < 0 {
        @return -$value; }
    @return $value;
}
$min = (){
    $res = index($arguments, 0);
    @for $item of $arguments{
        @if $item < $res {
            $res = $item; }}
    @return $res;
}
@debug $min(1, 2, 3, 4, 0); // -> 0

@debug $abs(-100px);   // 100px
```

#### 3. transparent call

mcss支持类似 **stylus** 的transparent call (只适用于作为mixin使用的function)的调用方式 

```
$border-radius = ($args...){
    @if !len($args) { 
        error('$border-radius Requires at least one paramete')}
    $value = join($args, ' / ');
    -webkit-border-radius: $value;
       -moz-border-radius: $value;
            border-radius: $value;
}
body{
    $border-radius: 10px 20px;
    $border-radius: 10px 20px 100% , 20px; 
}
```

输出为
```css
body{
  -webkit-border-radius:10px 20px;
  -moz-border-radius:10px 20px;
  border-radius:10px 20px;
  -webkit-border-radius:10px 20px 100% / 20px;
  -moz-border-radius:10px 20px 100% / 20px;
  border-radius:10px 20px 100% / 20px;
}

```



#### 4. 参数

mcss支持丰富的参数类型: __rest param__ 以及 __default param__ 、__named param__;

```

// 缺省值
$default-param = ($left, $right = 30px ){
    default-param: $right;
}
// named param 一般用在大量default 只需要传入部分参数的情况下
$named-param = ($color = 30px, $named){
    named: $named;
}

$rest-at-middle = ($left, $middle... , $right){
    rest-at-middle: $middle;
}
$rest-at-left = ($left... , $right){
    rest-at-left: $left;
}
$rest-at-right = ($left,$right...){
    rest-at-right: $right;
}

body{
    $named-param($named = 30px);
    $default-param(10px);
    $rest-at-middle(1, 2, 3, 4);
    $rest-at-left(1, 2, 3, 4);
    $rest-at-right(1, 2, 3, 4);
}

```

__输出__ :
```css
body{
  named: 30px;
  default-param:30px;
  rest-at-middle:2,3;
  rest-at-left:1,2,3;
  rest-at-right:2,3,4;
}

```

注意rest param 不能有默认值, 在参数有named param时 这个参数会被从参数列表中剔除，剩余的参数再进行赋值




#### 5. 作为一种数据类型的函数
函数可以被传入函数, 也可以被函数返回. __并且保留当前完整作用域链__


__函数可以被返回__:

```css
$pos = ($position, $top, $left){
    @if len($arguments) == 1{
        // 返回函数
        @return ($top, $left){
            $pos($position, $top, $left);
        }
    }
    position: $position;
    left: $left;
    top: $top;
}

$relative = $pos(relative);
$fixed = $pos(fixed);
$absolute = $pos(absolute);

body{
    $absolute(10px, 20px);
    // ==   $pos(relative, 10px, 20px);
}

```

__输出__:

```css
body{
  position:absolute;
  left:20px;
  top:10px;
}
```



#### 6. $arguments以及其他
在进入function block时, mcss会在当前作用域定义一个变量叫$arguments(Type: `valueslist`), 代表传入的所有参数

mcss不支持类似`arguments[0]`下标操作, 不过你可以通过[内建函数](#bif) `args(0)`来得到同样的效果

```
$foo = {
  first: args(0);
  seconed: args(1);
  arguments: $arguments
}
body{
    $foo: 10px, 20px
}
```

__输出__

```css
body{
  first:10px;
  seconed:20px;
  arguments:10px,20px;
}
```


### 注释
支持行注释`//` 和块注释`/**/`


### Atrule
除了变量之外，所有的功能扩展，mcss都采用扩展@atkeyword的方式, 对于规范外的atrule(SCSS称之为directive)并且mcss也未定义, 开发者如果传入了对应的函数则根据传入函数的策略解释这个片段(), 否则按css基本规则输出(比如mcss中的-moz-document、charset等都没有进行定义 但是仍可以正确输出)

以下介绍: mcss中定义了的atruleset

### @extend

继承由输入的complexselector指定的base ruleset， 表现为在在另一个base ruleset中组合进的selector. 

@extend是css preprocessor中另一个较重要的特性,可以帮助我们缓解在html写入过多类名的泥潭

mcss中的@extend 有以下特性:

#### 1. 需完整描述complex selector

这样做首先是为了避免歧义, 如:

```css
.class-1 span{
    name: class-1;
}
.body-1{
    // need specify the full complex selector
    // if only `span` will not work( but work in scss)
    @extend .class-1 span;
}
```

__输出__:

```css
.class-1 span,.body-1{
  name:class-1;
}
```

#### 2. 有作用域
与参数一样, 会优先获取内层作用域的的base ruleset, 并且只能使用定义过的base ruleset(也就是说无法后向引用), 这个是为了规避循环@extend;

```css
class-1{
    name: class-1 in global;
}

div.body-4, .other-body{
    class-1{
        name: class-1 in body-4;
    }
    // base class has scope
    @extend class-1;
}
```

__输出__ : @TODO

```css
class-1{
  name:class-1 in global;
}
div.body-4 class-1,.other-body class-1,div.body-4,.other-body{
  name:class-1 in body-4;
}

```


#### 3. 支持多重extend

多个complex以 `,` 分割(selectorlist),视为多重@extend;

```css
.class-1{
    name: class-1 in global;
}
.class-2{
    name: class-2 in global;
}
body{
  .class-3{
    name: class-3 in local;
  }
  @extend .class-1, .class-2, .class-3;
}
```

__输出__:

```css
.class-1,body{
  name:class-1 in global;
}
.class-2,body{
  name:class-2 in global;
}
body .class-3,body{
  name:class-3 in local;
}
```


#### 4. 支持nested extend
mcss的extend支持层级继承， 输出符合预期的结构

```css
// nested @extend
.class-3{
  name: class-3 in global;
}

.class-2{
  name: class-2 in global;
  @extend .class-3;
}
.class-1{
  name: class-1 in global;
  @extend .class-2;
}
body{
  @extend .class-1;
}
```

__输出__:

```css
.class-3,.class-2,.class-1,body{
  name:class-3 in global;
}
.class-2,.class-1,body{
  name:class-2 in global;
}
.class-1,body{
  name:class-1 in global;
}
```


总体来讲mcss将scss中的@extend概念简化了，而功能上各有偏重 

### @import

mcss中的import很灵活，可以在各个block中引入. 如果引入文件为`.css`后缀 则不做修改，原样输出.

考虑有如下文件 `_markdown.mcss`

```css
body {
    font-family: "Avenir Next", Helvetica, Arial, sans-serif;
    padding:1em;
    background:#fefefe;
}
h1, h2, h3, h4, h5, h6 {
    font-weight: bold;
}
```

以如下方式import后

```css
// import in global
@import './_markdown.mcss';

.m-markdown {
    // import in block
    left: 20px;
    @import './_markdown.mcss';
}

// import as media type
@import './_markdown.mcss' screen and (max-width: 200px);

// import raw css
@import './_raw.css';
```

输出

```css
body{
  font-family:"Avenir Next",Helvetica,Arial,sans-serif;
  padding:1em;
  background:#fefefe;
}
h1,h2,h3,h4,h5,h6{
  font-weight:bold;
}
.m-markdown{
  left:20px;
}
.m-markdown body{
  font-family:"Avenir Next",Helvetica,Arial,sans-serif;
  padding:1em;
  background:#fefefe;
}
.m-markdown h1,.m-markdown h2,.m-markdown h3,.m-markdown h4,.m-markdown h5,.m-markdown h6{
  font-weight:bold;
}
@media screen and (max-width: 200px){
  body{
    font-family:"Avenir Next",Helvetica,Arial,sans-serif;
    padding:1em;
    background:#fefefe;
  }
  h1,h2,h3,h4,h5,h6{
    font-weight:bold;
  }
}
@import  url("./_raw.css");
```

这个特性，可以使得markdown.mcss可以抽离成一个模块

此外, 如果产生循环引用，mcss会给出错误提示

<a name='abstract'></a>
### @abstract

作用如其名, 被修饰的ruleset成为抽象ruleset, 不会输出, 但是仍然可以被@extend; 

如

```css
// simple @abstract ruleset
@abstract abs1{
    name: abs1;
}
body{
    // then abs1 exports
    @extend abs1;
    left: 10px;
}
```

__输出__

```css
body{
  name:abs1;
}
body{
  left:10px;
}

```

即原selector消失 只留@extend 它的selector


这个scss也有对应的解决方案(引入%前缀)值得关注的是mcss中的@abstract可以接受一个block, 并且由于mcss中的@import的灵活性, 结合使用可以解决less、scss等等预处理器无法有效控制输出css的缺陷

```
@abstract {
    // @abstract block 没有独立作用域, 注册在外围作用域
    $left = 20px; 
    .abs3{
        name: abs3;        
        left: $left;
    }
    .abs4{
        name: abs4;
        left: $left;
    }
}
body{
    // then .abs2 exports
    @extend .abs3;
    left: $left;
}

```

__输出__ :


```
body{
  name:abs3;
  left:20px;
}
body{
  left:20px;
}
```

即abstract block中只有被@extend 的class的内容被输出了


@abstract block只影响内部的ruleset的输出 ,而不影响块内的其它部分 可以正常进行对block内的变量读取，函数调用, @extend等


鉴于有抽象整个import 的 mcss file的需求, 也提供了一个简单写法, 抽象化引入的mcss file;

```css
@abstract 'path/to/xx.mcss';
```

正确控制@abstract, 可以避免不需要的样式输出 less等预处理器导致的输出样式过大的问题, 被引入的mcss文件如何表现完全取决于 @abstract、@import、@media等特性的结合使用


### @media

mcss中的@media 层级组合的特性(与ruleset的层级相互独立), 并且 media expression中的键值都接受mcss表达式(即可以是参数，也可以进行计算等)

```css
// 较复杂的ruleset media 相互嵌套
body2{
    left: 20px;
    @media screen and (max-width: 10px), print{
        left: 10px;
        body{
            right: 20px;
            $minw = 100px;
            $prop = min-width; 
            // expression 的属性键与值 都可以是表达式
            @media($prop: $minw + 100px){
                div{
                    right: 20px;
                }
            }
        }
    }
}
```

__输出__:


```
body2{
  left:20px;
}
@media screen and (max-width: 10px),print{
  body2{
    left:10px;
  }
  body2 body{
    right:20px;
  }
}
@media screen and (max-width: 10px) and (min-width: 200px),print and (min-width: 200px){
  body2 body div{
    right:20px;
  }
}

```

__mcss中expresion__

需要注意的是由于@media的语法要求 不能有两个mediaType在一个mediaquery中, 所以mcss会忽略不符合要求的层级嵌套, 如:

```
@media screen{
  @media print{ //这种情况无法组合,mcss会忽略组合仅将其推到外层嵌套
  
  }
}
```



### @if, @ifelse , @else, @for


#### 条件语句@if, @ifelse , @else
语法 @if test block (@elseif test block)* (@else block)?

```
$name = 0px;
@if $name != 0px {
    body{
        name: if;
    }
}@elseif !$name2 {
    body{
        name: elseif;
    }
}@else{
    body{
        name: else;
    }
}
```

__输出__: 

```css
body{
  name:elseif;
}
```



#### 循环语句 @for of ,  @for in

mcss中只有一种Loop语句----`@for`语句，除了实现SCSS中的所有Loop语句的功能(@each @for @while)也可以组合出比SCSS更强大遍历语句


语法 `@for item:VAR[, index:VAR]? ['by' step:expression]? [('of'|'in') valueslist] block`

mcss支持两种Loop语句，分别是遍历列表，和hashmap(利用valuesList 模拟, mcss并不存在这种数据结构), 并且可以通过by关键字 控制步近

##### 1. @for of 

```css
@for $item, $i of test, hello, hoho{
    .name-#{$item}{
        width: 10px * $i;
    }
}
```

__输出__: 

```css
.name-test{
  width:0px;
}
.name-hello{
  width:10px;
}
.name-hoho{
  width:20px;
}
```

利用'by'关键字控制step,  step 可以是一个负值 实现后序遍历.

```css
@for $item, $indx by -1 of one, two, three{
  .m-module-#{$item} {
    left: $index * 30px + 20px;
  }
}

```

__Outport__

```css
.m-module-three{
  left:80px;
}
.m-module-two{
  left:50px;
}
.m-module-one{
  left:20px;
}
```


__结合range实现@while__ (valueslist的简写方式, mcss本身并没有range这种数据结构)__:

```
$max = 12;
@for $item of 1...$max{
  span-#{$item} {
    left: 30px * $item;
  }
}

```

__Outport__

```css
span-1{
  left:30px;
}
span-2{
  left:60px;
}
span-3{
  left:90px;
}
span-4{
  left:120px;
}
```





##### 2. @for in 
,mcss中可以利用一定格式的valueslist模拟hashmap(但仍然是valueslist，你仍然可以用for of来遍历它), 使得其可以用@for in 来遍历

格式形如:

```
$hashmap = key1 value1, key2 value2 ..., keyn value
```

为避免格式冲突，你可以使用()将list类型的值包裹起来

__Exmaple__

```
$fakehash = left 20px, top 30px, width 40px;

body{
  @for $item, $prop in $fakehash {
    #{$prop} : $item;
  }
}

```
 
__Outport__

```
body{
  left:20px;
  top:30px;
  width:40px;
}
```



### Operator
mcss支持一元运算符(- ! +), 二元运算符( + - * / %), 逻辑运算符(|| 和 &&), 关系运算符(== >= <= > < !=)以及括号'()' 运算符优先级与javascript完全一致

```css
// simple + - 
body{
    add1: 10 + 20;   
    add2: 10px + 20px; 
    add3: 10pt + 20;  
    add4: 10 + 20em; 
    add5: 10 + 'px';
    add6: 10 + px; 
    add7: px + 10;
    add8: 'px' + 10; 
    add9: 'px' + hello;
    add10: hello+'px';
    add11: hello+px; 
    add12: 'hello'+px;
}

// simple * / % 
body{
    mult1: 10*10;    
    mult2: 10px*10; 
    mult3: 10*10pt;
    mult4: 10pt*10px;
}

// simpe ||  &&   logic
body{
    or1: 0 || 1;
    or2: 0 || '' || true;  
    and1: 0px && 1;
    and2: 1 && 2 && false;
    // && have high proprioty verus ||
    andor: 0 || 1 && 2;

}

// simpe unary - !
body{
    $num = 1;
    neg: -$num;
    reverse: !$num;
}


// relation
body {
    gt: 10>5;
    lt: 9<6;
    ge1: 9>=8;
    ge2: 9>=10;
    le1: 9<=10;
    le1: 9>=10;
    eq1: 9==9;
    eq2: 9==19;
    nq1: 9!=9;
    nq2: 9!='da';
}

// paren
body{
    paren1: (10 + 9) * 10;
    paren2: 10 + 9 * 10; 
    paren3: ('' || 10px) + 20px;
}

```

__输出__:

```css
body{
  add1:30;
  add2:30px;
  add3:30pt;
  add4:30em;
  add5:"10px";
  add6:10px;
  add7:px10;
  add8:"px10";
  add9:"pxhello";
  add10:hellopx;
  add11:hellopx;
  add12:"hellopx";
}
body{
  mult1:100;
  mult2:100px;
  mult3:100pt;
  mult4:100pt;
}
body{
  or1:1;
  or2:true;
  and1:0px;
  and2:false;
  andor:2;
}
body{
  neg:-1;
  reverse:false;
}
body{
  gt:true;
  lt:false;
  ge1:true;
  ge2:false;
  le1:true;
  le1:false;
  eq1:true;
  eq2:false;
  nq1:false;
  nq2:true;
}
body{
  paren1:190;
  paren2:100;
  paren3:30px;
}
body{
  complex1:"name10px20px";
  complex2:1px;
}
```

在使用时，需要注意的是 `-` ， `/`, `'%'` 两个作为二元操作符时， 由于在css中 分数(14px/12) 以及 负数(10px -10px) 以及10%  都是一种合法的输出。mcss中定义操作符周围留空视为算术操作， 而取消空格则保留原输出.

```css
body{
    // beacuse css support neg number 
    // so - operator should have WS after it
    sub1: 10 - 20;     
    sub2: 10px - 20px; 
    sub3: 10pt - 20;   
    sub4: 10 - 20em; 
    sub5: 10 -20;     
    sub6: 10px -20px; 
    sub7: 10pt -20;   
    sub8: 10 -20em;
    // the '/' operation at least has one WS around it
    // beacuse font: 14px/2   is valid in css;  
    div1: 10/10;      
    div2: 10px/10;    
    div3: 10/10pt;    
    div4: 10pt/10px;  
    div1: 10 / 10;     
    div2: 10px/ 10;     //1px
    div3: 10 / 10pt;     //1pt
    div4: 10pt /10px;   //1pt
    // if a number literal, remenber to insert a WS before % to avoid be tokenized as a percent
    remain: 21 %6;       //  3
    remain: 21%6;       //  21%6
    remain: 21px%6;     // 3px
    remain: 21 %6px;     // 3px
    remain: 21%6px;     // 21% 6px
    remain: 21px%6pt;   // 3px
}

```

__输出__: 

```css
body{
  sub1:-10;
  sub2:-10px;
  sub3:-10pt;
  sub4:-10em;
  sub5:10 -20;
  sub6:10px -20px;
  sub7:10pt -20;
  sub8:10 -20em;
  div1:10/10;
  div2:10px/10;
  div3:10/10pt;
  div4:10pt/10px;
  div1:1;
  div2:1px;
  div3:1pt;
  div4:1pt;
  remain:3;
  remain:21% 6;
  remain:3px;
  remain:3px;
  remain:21% 6px;
  remain:3px;
}
```


mcss的运算符优先级与javascript的表现一致

__注意__ : `(`, `)`在mcss中还有一个作用就是将list型的值(values, valueslist)包裹起来成为一个表达式来解决格式上可能的冲突(比如函数不允许传入valueslist的值，但是你可以用括号包裹起来)

### 插值intepolate

MCSS的插值语法与SCSS一致，使用`#{ .. }`, 可在任何表达式、选择器、属性中使用

__常规插值__
插值内容可以是一个变量，也可以是一个mcss 表达式

```
$border-radius = ($radius, $direction){
    @if !$direction{
        $join = '';
    }@else{
        $join = '-' + join($direction);
    }
    -webkit-border#{$join}-radius: $radius;
       -moz-border#{$join}-radius: $radius;
            border#{$join}-radius: $radius;
}

body{
    $border-radius: 5px, top left;
}
body2{
    $border-radius: 5px 10px;
}
```

__输出__

```css
body{
  -webkit-border-top-left-radius:5px;
  -moz-border-top-left-radius:5px;
  border-top-left-radius:5px;
}
body2{
  -webkit-border-radius:5px 10px;
  -moz-border-radius:5px 10px;
  border-radius:5px 10px;
}

```

__选择器插值__
选择器插值与表达式插值一直，区别是此时可以传入一个list类型的插值,简化我们的迭代操作, 采用列表插值时, 会在块内注册两个变量`$item`, `$i`代表被迭代的元素和下标

```
/**
 * bootstrap icon genneroter example
 */
$ilist = glass,music,search,envelope,heart,star, film,ok,remove,off,signal,cog,trash, home,file,time,road,download,upload,inbox,play,repeat,refresh,list,lock,flag,headphones,volume;
$path = 'path/to/icon.png';
$basesize = -24px;
[class*=icon-]{
    background-image: url('http://www.163.com/#{$path}') -9999px -9999px; 
}
.icon-#{$ilist} {
    background-position: $basesize * ($i % 20)     $basesize * floor($i / 20);
}
```


__输出__:

```css
[class*=icon-]{
  background-image:url("http://www.163.com/path/to/icon.png") -9999px -9999px;
}
.icon-glass{
  background-position:0px 0px;
}
.icon-music{
  background-position:-24px 0px;
}
/* ....省略n行..... */
.icon-headphones{
  background-position:-144px -24px;
}
.icon-volume{
  background-position:-168px -24px;
}

```



__字符串插值 and printf__
当作为字串插值时， 只接受 __变量插值__, 字符串同时可以进行字符格式化操作

printf支持5种格式, %s,%x,%X,%d, %f

```
simple-format{
    s-format: 'haha %s heihei' % 'hello';
    x-format: 'haha #%x heihei' %  16711422;
    X-format: 'haha #%X heihei' %  16711422;
    d-format: 'haha %d heihei' % '20dada';
    f-format: 'haha %f heihei' % 12.36;
    // 多个值请用(), 保证求值为一个值
    mult-format: 'haha %f %d heihei' % (12.36 12.36);
}

// 两种格式化可以同时使用
$inp = 20;
format-with-interplation{
    s-format: 'haha #{$inp} %s heihei' % 'hello';
}
```

__输出__:

```css
simple-format{
  s-format:"haha hello heihei";
  x-format:"haha #fefefe heihei";
  X-format:"haha #FEFEFE heihei";
  d-format:"haha 20 heihei";
  f-format:"haha 12.36 heihei";
  mult-format:"haha 12.36 12 heihei";
}
format-with-interplation{
  s-format:"haha 20 hello heihei";
}
```

### Scope

mcss有完整的作用域概念，都是静态作用域
例如:

```mcss

// ruleset have local scope
$name= global;
.local-1{
    $name = local-1;
    .local-2{
        $name = local-2;
        name: $name;
    }
    name: $name;
}
body{
    name: $name;
}

// some atrule have own block scope ,like @media
// some not like @if、@for 、@import and other@atrule
@media print{
    $left = 10px;
    @media (min-width: 30px){
        $left = 20px;
        body{
            left: $left;
        }
    }
    body{
        left: $left;
    }
}

$local = global;
@if 1 {
    $local = ifstmt;
}
body{
    local: $local;
}
```


__输出__:

```css
.local-1{
  name:local-1;
}
.local-1 .local-2{
  name:local-2;
}
body{
  name:global;
}
@media print{
  body{
    left:10px;
  }
}
@media print and (min-width: 30px){
  body{
    left:20px;
  }
}
body{
  local:ifstmt;
}
```



<a href="" name='bif'></a>
### 丰富的buildin function

MCSS拥有丰富的内建函数，旨在提供语法提供不了的操作, 内建函数会在未来适量增加也解决可能的语法不足

#### __color操作__

mcss支持三种格式的色值 1. hash: #ffffff 2. rgba or rgb   3. hsl or hsla 但是最终的输出视alpha通道是否为1输出 hash 或者 rgba.

```css
body{
    // hex3
    color: #ccc;
    // hex6
    color: #cccfff;
    // color keyword
    color: white;
    // rgb
    color: rgb(1,1,1);
    // rgba
    color: rgba(#fff, .1);
    color: rgba(1,1, 1, 0.1);
    //hsl
    color: hsl(100, 20%, 20%);
    //hsla
    color: hsla(100, 20%, 20%, 0.1);
}

```
输出

```css
body{
  color:#cccccc;
  color:#cccfff;
  color:#ffffff;
  color:#111111;
  color:rgba(255,255,255,0.1);
  color:rgba(1,1,1,0.1);
  color:#303d29;
  color:rgba(48,61,41,0.1);
}

```


mcss 支持rgb概念中的red、green、 blue 和 hsl概念中 的hue、saturation、lightness  以及alpha 这7个通道的调节，函数名分别为`r-adjust`,`g-adjust`,`b-adjust`,`h-adjust`,`s-adjust`,`l-adjust`,`a-adjust`   全部支持相对和绝对调节以及get操作(根据输入参数的不同)

正值代表正相调节，负值代表反向调节 以lightness为例:

```
body{
    // 第3个参数判断为真说明是绝对调节
    color: l-adjust(#eeccdd, 30%, true);
    // 相对调节
    color: l-adjust(#eeccdd, -10%);
    // get操作
    $lightness = l-adjust(#eeccdd) + 10%;
}

```

__输出__:

```css
body{
  color:#73264d;
  color:#e1a6c4;
  lightness:96.666667%;
}

```

同时通道名也是对应的别名如 `r-adjust()`与 `red()` 是一致的, 例外是alpha通道的别名是fade, 因为alpha同时也是ie下的方法名

```

body{
    color: r-adjust(#eeccdd, -10);
    color: red(#eeccdd, -10);

    color: a-adjust(#eeccdd, -0.1);
    color: fade(#eeccdd, -0.1);
}

```

__输出__:

```css
body{
  color:#e4ccdd;
  color:#e4ccdd;
  color:rgba(238,204,221,0.9);
  color:rgba(238,204,221,0.9);
}
```


通道的取值范围分别是

1. red green blue:   0~ 255
2. hue      0 ~ 360
3. lightness saturation 0% ~ 100%
4. alpha   0 ~ 1

单位不符会报错，取值不符会被截断到范围内(例外 hue会取 与360的余数，因为色相为一个圈)


mcss也支持一些其它的Color函数, 比如 

__mix__: 

```
$color = mix(#ccc, #def, 50%);
```


#### 列表相关

mcss中有两种列表（其它预处理器可能是一种类型，把`，`作为元素的一种，比如Sass 这难免会引起误区）, 一种`values`，如`1px solid #fff` 另一种`valueslist`,如`color .1s ease-in-out, height`。它们分别对应css规范中的componentValues与 commaSepValues。它们都可以使用数据相关的方法，都可以使用@for遍历等等。



__push、unshift、shift、pop__
对传入的列表参数进行相关操作, 作用与js的同名方法一致, 如

```
$fn = (){
unshift($arguments, 2);
unshift2: $arguments;

}

body{
  $fn: 1,2,3,4,5;
}

```

__输出__

```css
$fn = (){
unshift($arguments, 2);
unshift2: $arguments;

}

body{
  $fn: 1,2,3,4,5;
}

```

另外几个函数也是类似


__index(list, n, [value])__: 
获得列表类型(values valueslist)的第n个值， 如果没有则为null
如果传入了第三个参数则对第n个元素进行复写

```
$list = 1px 2em 3pt;
$list2 = 1px, 2em 2pt, 3%;
p{
  left: index($list, 0);
  right: index($list2, 1);
}
```

__输出__

```css
p{
  left:1px;
  right:2em 2pt;
}
```

__len(list)__ : 获得列表的长度

略...


__args(n)__ : 获得函数中$arguments的第n个参数
实际是 __index(list, n)__ 的包装而已，只能在函数中使用


#### 常用类


__define(name, value, isGlobal=false)__
注册变量，与使用`$var = value` 等价， 区别是name是字符串，即是动态的，这让你通过动态绝对函数名成为可能, 如

```

$prefix = ($name){
  @return (){
    -webkit-#{$name}: $arguments;
    -moz-#{$name}: $arguments;
    -o-#{$name}: $arguments;
    #{$name}: $arguments;
  }
}
@for $name of border-radius, box-sizing {
  define('$' + $name, $prefix($name));
  
}

// 动态生成了$border-radius等方法.

p{
  $border-radius: 5px;
}

```

__输出__

```css
p{
  -webkit-border-radius:5px;
  -moz-border-radius:5px;
  -o-border-radius:5px;
  border-radius:5px;
}
```

这个例子来自于基于mcss构建的官方函数库[`mass`](https://github.com/leeluolee/mass)的css3 部分的简单版，你会惊讶于mcss的强大特性。


__error(message)__ : 
主动抛出异常, 一般在函数中使用, 例如:

```

$fn = ($required){
  @if !$required { error('$required is needed!!!')}
}
$fn();
```

报错

```bash
McssError:$required is needed!!!
  at (/home/luobo/code/mcss/test/mcss/bif_util.mcss : 3)
      1.| 
      2.| $fn = ($required){
>>    3.|   @if !$required { error('$required is needed!!!')}
      4.| }
      5.| $fn();
      6.| 
      7.| 

```


__t()__: 
t函数可以将任意其他值转换为TEXT类型(即原样输出), 一般会用在去掉STRING的引用，从而可以支持某些浏览器需要的hack，如:

```css
p{
  _filter: t('progid:DXImageTransform.Microsoft.BasicImage(rotation=3);');
}
```

__输出__:

```css
p{
  _filter:progid:DXImageTransform.Microsoft.BasicImage(rotation=3);;
}
```


__typeof(x)__: 获得传入值的类型, 返回string值

```css
p{
  type1: typeof(text1) typeof('string1') typeof(1 2 3); 
  type2: typeof(1, 2 3 , 4) typeof({left: 10}) typeof(10px);
  type3: typeof(true) typeof(null) typeof(white) typeof(rgba(1,1,1,.1));
}

```

输出

```css
p{
  type1:"text" "string" "values";
  type2:"dimension" "func" "dimension";
  type3:"boolean" "null" "color" "color";
}
```




范例略


__js(string)__: 运行一个js的表达式并返回其值


__data-uri()__: 将一个图片转换为base64格式(前提小于5kb，并且图片存在)







#### [其他内建函数](/#)


### @keyframe 以及其它 标准css atrule

@keyframe 以及其他标准atrule 输出与css预想中一致 未来对于@keyframe 可能会有简化模型的推出

### @debug 以及其它 非标准atrule

#### @debug
会在控制台打印出对应信息, 你可以用来测试mcss中的一些表达式;

```css
// debug will accept a expression
@debug 10px + 20px * 30px;
@debug 'a string';
@debug a-text;
@debug rgb(10, 10, 10);
@debug hsla(10, 10%, 10%, 0.2);
@debug hsla(10, 10%, 10%, 0.2);
@debug 'text' + text;
```

会输出

```
DEBUG 610px  (DIMENSION)
DEBUG a string  (STRING)
DEBUG a-text  (TEXT)
DEBUG #aaaaaa  (color)
DEBUG rgba(28,24,23,0.2)  (color)
DEBUG rgba(28,24,23,0.2)  (color)
DEBUG 'texttext'  (STRING)

```

括号中为节点类型


### 友好的error输出

![错误输出](http://leeluolee.github.io/mcss/img/error.png)

### sourcemap支持
MCSS的sourcemap 不是类似stylus、less是基于@sass-debug-info的伪装形势, 而是标准的[sourcemap v3](https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1) 格式, 可提供更小的格式和更精确的对应(同时也是未来趋势) 这个在chrome 的开发者工具中刚刚被启用为支持css，所以暂时只支持chrome 最新版本, __并且需要在控制台选项中开启sourcemap支持__ (注意不是 support for SASS选项)

![sourcemap支持](http://leeluolee.github.io/mcss/img/sm.png)


### 多种输出格式
mcss默认支持三种输出格式 1. 常规; 2. 压缩 ; 3. 单行

对应如下这段mcss

```css
.m-home{
  display: block;
  div, ul{
    border: 2px solid #ccc;
    a{
      color: #fff;
      &:hover{
        text-decoration: none; 
      }
      span{
        display: block;
      }
    }
  }
}

```


__1. 常规__

```css
.m-home{
  display:block;
}
.m-home div,.m-home ul{
  border:2px solid #cccccc;
}
.m-home div a,.m-home ul a{
  color:#ffffff;
}
.m-home div a:hover,.m-home ul a:hover{
  text-decoration:none;
}
.m-home div a span,.m-home ul a span{
  display:block;
}
```

__2. 压缩__ : 无空格压缩到一行

```css
.m-home{display:block;}.m-home div,.m-home ul{border:2px solid #cccccc;}.m-home div a,.m-home ul a{color:#ffffff;}.m-home div a:hover,.m-home ul a:hover{text-decoration:none;}.m-home div a span,.m-home ul a span{display:block;}
```

__3. 隔行__ : [NEC](http://nec.netease.com/)的推荐css书写格式

```css
.m-home{display:block;}
.m-home div,.m-home ul{border:2px solid #cccccc;}
.m-home div a,.m-home ul a{color:#ffffff;}
.m-home div a:hover,.m-home ul a:hover{text-decoration:none;}
.m-home div a span,.m-home ul a span{display:block;}
```





## API
### 接口风格
mcss的接口都是promise风格(通过内部的微型mcss.promise封装), 帮助我们在各个部件间传递断言对象, 同时输出一致的API,
支持类似(done, fail, always, when, then, or, not)等操作。



### 接口详解

以下建造中.... 

### 参数详解

一般构建完实例后, 我们只需要调用translate方法. 值得注意的是参数
``` javascript
var mcss = require('mcss') // browser 则直接在全局找到mcss;
var instance = mcss({
// filename 主要是用来error信息和sourcemap, 也是后续import的准则
// 是最重要的参数
  filename: '/absolute/path/to/xx.file'
  options.....
})// get a mcss instance

.set('filename', '/path/to/foo.mcss')// 后续修改options
.include('/build/in/path')// 使用include引入对应, 后续import会先从这些目录开始寻找



// 直接翻译输出为目标文件, 如果text参数不存在, 则为filename对应的文件
instance.translate(text).done(function(text){
  
  // blalalala........
}).fail(function(error){

})


// 解释并输出AST
instance.interpret(text).done(function(text){
  // blalalal.......
}).fail(function(error){

})

// 词法分析是一个同步的过程，所以可以直接获得tokens
var tokens = instance.tokenize()

```

此外, mcss也暴露了内部的组成部分 `mcss.Tokenizer`, `mcss.Parser`, `mcss.Interpreter`, `mcss.Translator`分别对应内部词法分析、解析器、解释器、翻译器的构造函数 

__稍等正在建设中... __

#### 作为CSS Parser 的MCSS
MCSS天生就是一个CSS parser, 你可以在构建mcss实例时 传入walker来实现改写和读取节点

mcss的walker作用在interpret的上升阶段，此时经过解释后的节点类型已经全部是CSS的节点类型(即不存在 操作符、参数等信息)

例如[test/parser.js](https://github.com/leeluolee/mcss/blob/master/test/parser.js) 中的例子, 你只需传入一个节点名和对应的action;

```

var path = require('path');
//每次生成都修改后缀
var instance = mcss({
    filename: path.join(__dirname, 'mcss/_large.mcss'),
    walkers: [{
        'url': function(ast){
            ast.value += '?timestamp=' + Date.now();
        }
    }]
})

instance.walk('url', function(){
  ast.value += '?timestamp=' + Date.now();
})
// or passed a object to walk multi nodes
instance.walk({
  'url':function(){//
    ast.value += '?timestamp=' + Date.now();
  },
  'block': function(){
  }
})
// 获取节点
instance.interpret().done(function(ast){
    // the ast is changed
})

// 输出修改后的css
instance.translate().done(function(css){
    // the css is changed
})

```

#### 参数
这里介绍下构建mcss 实例的详细参数, 稍等片刻...

```css
//所有的参数都在构建mcss实例时候传入, 以下是参数类型以及默认参数
var instance = mcss({
  importCSS: false,// 默认不会引入.css file 而是输出 @import 'xx.css';
  pathes: [],      // @import时，mcss会优先查找pathes下的目录
  walkers: [],     //节点游历的监听
  format: 1,       // 输出格式,如上面所示 1. common  2. compress, 3. lines mode
  sourcemap:false, //是否输出sourcemap(css同一目录)
  indent: '\t'     //缩进符号, 默认是制表符
})

//所有的参数都可以后续通过instance.set来进行赋值
instance.set('sourcemap', true)
//对于数组型参数，可以使用instance.add来进行增加
instance.add('pathes', folderpath)
```


#### 指令(directive)重写
稍等片刻.......


<a name='value'></a>
## 数据类型
在使用mcss时, 首先把数据类型理清楚是非常重要的。作为一门简单的DSL, mcss的数据的类型设定是简单的, 并且是基于原著(css)的syntax的扩展. 
数据类型几乎就奠定了整个mcss的表现，所以了解这一块非常重要。

### 1. TEXT
例如: left, right
对应css token中的 IDENT, 为何mcss不直接设定为IDENT， 因为mcss中的IDENT是可以插值的, 

### 2. STRING:                       
如: 'hello', "heelo" 

### 3. color:
如: #fff, #ffffff, rgba(), rgb(), hsl(), hsla(), 暂时不考虑添加其它格式的色值

### 4. FUNCTION:
函数分类
1. css内置函数如calc 等，这些会原封不懂的输出(但是你仍可以控制参数)
2. mcss bif(build in function) 如s-adjust、u、data-url等等, 这些会输出运算后的值
3. mcss文件中定义的 function, 这些与bif是等价的 ，既可以做mixin 也可以返回值(当存在@return时)

函数可以作为参数传递

函数可以作为返回值在函数中返回,并保留作用域链.即可以实现闭包


### 5. DIMENSION:
mcss只有一种数值类型DIMENSION 而不是css中的 DIMENSION、PERCENT(可以堪为unit为 % 的DIMENSION)、Number(unit为null);

### 6. values 
以上几种值的空白分割组成的列表  对应 css syntax 的component values。如10px solid #fff

### 7. valuesList
对应css 中的comma separate values 如 10px, 10px solid ,#fff;
可以使用range 快速创建一个valuesList 比如:
```
$s = 1...5;  // ==   1,2,3,4,5
```

__注意__, mcss中的直接量只包含类型1,2,3,4,5, 如果要values与 valueslist成为一个直接量，请用()包裹，会强制成为一个直接量
比如你想要传入一个valueslist参数时,

```
 foo((1,2,3,4)) // 强制成为一个直接量 ,因为单个参数只支持values(为了避免与valueslist的'，'冲突)
```

再比如

```
body: '%d %d' % (10 100);
```
因为mcss只会获取紧接一个表达式的值(避免与其它冲突)你需要强制后续成为一个值

__两种mcss的扩展类型__ 

### 8. BOOLEAN

如`true`, `false`.

### 9. NULL

如`null`.

8, 9是后续引入的两种数据结构来方便我们进行编程操作






## 感谢



## 如何参与
MCSS目前仍在开发阶段, 如果你能提出宝贵意见甚至贡献代码, 万分感谢。不过仍要说明贡献代码时的须知

1. 较大修改请开一个issue, 详细说明情况, 并加入测试案例
2. 提交前确定`mocha`无误


## Contributors
1. [@leeluolee | http://weibo.com/luobolee]
2. __you...__


## 工具

1. [mcss的sublime语法高亮（保存成MCSS.tmLanguage文件并放入你的User目录）](https://gist.github.com/leeluolee/6421229)


## Changelog

### 0.4.x

1. 增加了命令行参数 watch=2时的 出错提示; 目前同一份文件的错误只提示一次错误(比如多个文件引用了一个出错文件);
2. Fixed Color 百分比参数时，应该视为合法  除以100；
3. outport 错别字修改为output, 原outport 仍然可用，同时将input参数显式配置(-i --input) 去掉了--indent 的短参数i(被input占据)。

### 0.3.x

增加了 `^=` 操作符, 



### 0.2.x

1. 增加对 Named param的支持  `2013/7/14 18:09:55`
2. 色值输出三位#fff  六位#fffaaa 而不是同一个6位
3. 支持远程import，最多缓存远程文件20个(内存中)
4. 支持配置文件
5. 增加了`define`、`applay`函数, 配置文件不再合并参数


### >= 0.1.8

1. `%`标识符添加 (类似`&` );
2. 深层ruleset对外层ruleset的@extend支持
3. sourcemap
4. advanced @for stmt;

### 0.1.0(对外初版)

1. <del>@module</del> 移除
2. 命令行工具初版发布 `npm install -g mcss`
3. function valueType
4. js-like operation
5. [`@abstract`](#abstract)、[`@media`](#media)、[@import](#import), 适量的buildin function
6. 多种格式输出
7. 浏览器版本
7. other common feature...



## License

(The MIT License)

Copyright (c) 2012-2013 NetEase, Inc. and MCSS contributors

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
