/**
 * switch to mocha
 */


var mcss = require('../'),
    fs = require('fs'),
    color = require('../lib/helper/color'),
    assert = require('assert'),
    path = require('path');

var not_compare = process.argv[2];
describe('MCSS TEST', function(){
    console.log()
    var cases = fs.readdirSync(__dirname + '/mcss').concat(fs.readdirSync(__dirname + '/mcss/issues').map(function(file){
                return 'issues/' + file;
            })).filter(function(file){
        return /(^|\/)[^_][-\w]*\.mcss$/.test(file);
    }).forEach(function(filename){
        var fullpath = __dirname + '/mcss/'+filename
        var content = fs.readFileSync(fullpath, 'utf8');
        var csspath = __dirname+'/css/'+ filename.replace('.mcss', '.css');
        try{
            var csscontent = fs.readFileSync(csspath, 'utf8');
        }catch(e){
            console.log(color('! the css file ' + csspath + ' is not found', 'yellow'));

        }
    it(fullpath + 'compile result should equal css outport', function(done){
        mcss({
            filename: fullpath
        }).include(__dirname+'/mcss/include')
            .translate(content)
            .done(function(content){
                if(csscontent && !not_compare){
                    assert.equal(content, csscontent );
                }else{
                    assert.ok(true)
                }
                done();
            }).fail(function(error){
                throw error;
                done();
            })
        })

    })
})



