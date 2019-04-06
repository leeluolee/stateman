/**
 * Created by slanska on 2016-09-16.
 */

declare module stateman
{
    /*
     Document title. String or function that returns a string.
     */
    export type StringResult = string | (()=>string);

    /*
     Parameter for Stateman constructor
     */
    export interface StatemanCtorOptions
    {
        /*
         Default: false. whether only the leaf state can be visited
         */
        strict?:boolean;

        /*
         document.title
         */
        title?:StringResult;
    }

    export interface Promise
    {
        then:()=>Promise;
        "catch":()=>Promise;
        "finally":()=>Promise;
    }

    /*
     Parameter for callbacks (enter, leave, canEnter etc.)
     */
    export interface RouteInfo
    {
        /*
         represent which phase the navigation is
         */
        phase:'permission'|'navigation'|'completion';

        /*
         captured param
         */
        param:Object;

        /*
         previous state
         */
        previous:State;

        /*
         target state
         */
        current:State;

        /*
         fallback for async navigating.
         If you must run application in the runtime that doesn’t support Promise (old IE without Promise polyfill),
         you can use option.async for asynchronous navigation.
         Returns function which accepts boolean as a parameter.
         Example:
         var f = async();
         ...
         f(false); // to reject
         */
        async:()=>(result?:boolean)=>void;

        /*
         function used to stop the navigating
         */
        stop:Function;

        /*
         TODO Typo: should be backward
         */
        basckward:boolean;
    }

    export type StateOptionHandler = (option:RouteInfo)=> (void | boolean | Promise);

    export interface StateConfigObject
    {
        enter?:StateOptionHandler;
        leave?:StateOptionHandler;
        update?:StateOptionHandler;
        canEnter?:StateOptionHandler;
        canLeave?:StateOptionHandler;
        url?:string;

        /*
         if title is a Function, document.title will use its returnValue
         */
        title?:StringResult;
    }

    export type StateConfig = StateConfigObject | StateOptionHandler | string;

    export interface StatemanStartOptions
    {
        /*
         (default false) whether to open the html5 history support.
         If html5=true (need html5 pushState support), but browser doesn’t support this feature.
         stateman will fallback to hash-based routing.
         */
        html5?:boolean;

        /*
         (default ‘/’) the root of the url , only required when html5 is actived. default is '/'
         */
        root?:string;

        /*
         for the hash prefix , default is ‘’ (you can pass ! to make the hash like
         #!/contact/100), works in hash mode.
         */
        prefix?:string;

        /*
         (default true) whether to delegate all link(a[href])’s navigating,
         only needed when html5 is supported, default is true.
         */
        autolink?:boolean;
    }

    /*
     Options for navigation (Stateman.nav and Stateman.go)
     */
    export interface StatemanNavOptions
    {
        /*
         if silent is true, only the location is change in browser,
         but will not trigger the stateman’s navigating process
         */
        silent?:boolean;

        /*
         if replace is true. the previous path in history will be replace by url
         ( means you can’t back to or go to the previous path)
         */
        replace?:boolean;

        /*
         default is true. if encode is false, url will not change at location, only state is change (means will trigger
         the stateman’s navigating process). stateman use the encode method to compute the real url.
         */
        encode?:boolean;

        /*
         the big difference between nav and go is param:
         'go' may need param to compute the real url, and place it in location.
         */
        param?:Object;
    }

    /*
     Individual state of routing
     */
    export class State
    {
        constructor(options?);

        visited:boolean;

        state(stateName:string, config:StateConfigObject):State;
        state(stateName:string):State;
        state(stateName:string, enter:StateOptionHandler):State;

        /*
         Adds child state

         Url rules:
         Absolute url - if you dont need the url that defined in parents, use a prefix ^ to make it absolute . all children of the state will also be affect
         Empty url - if you pass url:"", the captured_url will be the same as its parent. (but it have higher priority than parent)
         */
        state(stateName:string, url:string):State;

        config(configure);

        decode(path:string):{name:string, param:Object};

        encode(stateName:string, param?:Object):string;

        manager:Stateman;
        parent:State | Stateman;
        name:string;
        currentName:string;
    }

    /*
     Main class. Manager for all states and routing.
     Typical usage:
     var StateMan = require("stateman");

     var stateman = new StateMan({
     title: "Application",
     strict: true
     });
     // or...
     var stateman = StateMan();
     */
    class Stateman // extends State
    {
        static State:{
            new (options?):State;
        };

        static util:{
            bind(fn, context);
            cleanPath(path);
            emitable(obj):boolean;
            eql(o1, o2):boolean;
            extend(o1, o2, override:boolean);
            isPromise(obj):boolean;
            log(msg, type);
            normalize(path);
            slice(arr, index);
            typeOf(obj);
        };

        /*
         TODO Typo: Should be History
         */
        static Histery:{

        };

        /*
         Creates a new instance of stateman
         */
        constructor(options ?:StatemanCtorOptions);

        /*
         to add/update a state or get particular state(if param config is undefined).
         Example:
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
         */
        state(states:{
            [stateName:string
                ]:StateConfig
        }):Stateman;
        state(stateName:string, config:StateConfig):Stateman;
        state(stateName:string):State;

        decode(path:string):{
            name:string, param:Object
        }
        ;

        encode(stateName:string, param ?:Object):string;

        async();

        start(options ?:StatemanStartOptions):Stateman;

        stop();

        /*
         Recommended (vs 'nav')
         */
        go(stateName:string, option ?:StatemanNavOptions, callback ?):Stateman;

        nav(url:string, options ?:StatemanNavOptions, callback ?)
        ;

        /*
         determine if the current state is equal to or is the child of the state.
         If any params are passed then they will be tested for a match as well.
         not all the parameters need to be passed, just the ones you’d like to test for equality.
         */
        is(stateName:string,
           param ?:Object,
           /*
            Whether the target state need strict equals to current state.
            */
           isStrict ?:boolean):boolean;

        /*
         Register event handler
         Events can be standard or custom.
         Standard events include:
         'begin' - Emitted when a navigating is start. every listener got a special param : evt.
         'end' - Emitted when a navigating is end.
         'notfound' - Emitted when target state is not founded.
         you can register a 'notfound' listener to redirect the page to default state
         (stateman.go)
         */
        on(event:string, handle:(state:State)=>void):Stateman;

        off(event:string, handle:(state:State)=>void):Stateman;

        emit(event:string, param):Stateman;

        /*
         The active state, represent the state that still in pending.
         */
        active:State;

        /*
         The previous state. the same as option.previous
         */
        previous:State;

        /*
         The target state. the same as option.current
         */
        current:State;

        /*
         The current param captured from url
         or be passed to the method stateman.go or stateman.nav
         */
        param:Object;
    }

    class St extends Stateman.State
    {
    }
}

declare module "stateman"
{
    export = stateman.Stateman;
}
