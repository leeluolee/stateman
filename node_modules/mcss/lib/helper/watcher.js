
var _ = require('./util'),
    options = require('./options'),
    Event = require('./Event'),
    fs = require('fs');

function Watcher(options){
    this.set({
        persistent: false,
        // ignored:null,
        // matched:null,

    })
    this.set(options);
    this._files = options.files;
    this.files = {}
    this.running = false;
}


var w = options.mixTo(Watcher);
Event.mixTo(Watcher);


w.add = function(file){
    var files = []
    _.flatten(arguments).forEach(function(fullpath){
        try{
            var stat = fs.statSync() 
        }catch(e){}
        // is directory
        if(stat.isDirectory()){

        }
        // is file
        if(stat.isFile()){

        }
        
    });
    return _.flatten(files);
}

w._add = function(fullpath){
    this._files.push(file)
    if(this.running){

    }
}
w.remove = function(fullpath){

}

w.watch = function(){
    if (!this.running){
        this.running = true

        process.on("SIGINT", function(){
            process.exit()
        })
        process.on("exit", function(){
            self.emit("end")
            ;(callback || util.noop)()
        })
    }
}

w._watch = function(callback){
    var self = this, watchers = {},
        files = this.files,
        persistent = this.get('persistent');

    var changed = function(file){
        for (var p in watchers) watchers[p].close()
        self.trigger("change", file)
        callback()
    }
    for(var fullpath in files) if(files.hasOwnProperty(fullpath)){
        var file = files[fullpath];
        fs.readFile(fullpath, "utf-8", function(err, src){
            if (err) return callback(err)
            watchers[fullpath] = fs.watch(fullpath,{persistent: persistent}, 
                _.throttle(function(){
                fs.readFile(fullpath, "utf-8", function(err, now){
                    // the file was removed
                    if (err && err.code == 'ENOENT') changed(fullpath)
                    // something else gone wrong
                    else if (err) callback(err)
                    // file has changed its content
                    else if (now != src) changed(fullpath)
                })
            },100))

        })

    }


}





