path = require 'path'
fs = require 'fs'
{spawn, exec} = require 'child_process'

globule = require 'globule'
chokidar = require 'chokidar'
color = require './lib/helper/color'

# npm information
info = JSON.parse fs.readFileSync __dirname + '/package.json', 'utf8'


option '-m', '--mode [Mode]', 'watcher mode'
option '-t', '--test', 'build with test'

test = (callback) ->
  exec 'mocha' ,(err)->
    return callback err if callback
    throw err if err
  
  
build = () ->
  wrup = do require "wrapup"
  wrup.require("mcss", __dirname + "/lib/browser.js")
    .options(
      # sourcemap: __dirname + "/sm.sourcemap"
      # sourcemapURL: "/sm.sourcemap"
      # sourcemapRoot: "/"
    ).up (err, source) -> 
      fs.writeFile path.join(__dirname, "dist/#{info.name}-#{info.version}.js"), source, (err) ->
        if err 
          console.error(err)
      fs.writeFile path.join(__dirname, "dist/#{info.name}-latest.js"), source, (err) ->
        if err 
          console.error(err)
        else 
          console.log 'build complele'

todo = () ->
  res = []
  (globule.find __dirname + '/lib/**/*.js').forEach (file) ->
    extract = extractTodo(fs.readFileSync file, 'utf8')
    extract.unshift color(file, 'red') + '\n=================' if extract.length
    res = res.concat extract
  console.log(res.join('\n'))
  
extractTodo = (content) -> 
  res = []
  content.replace /@(TODO)[\s:]*([^@\n]*)\n/, (all, title, txt)->
    res.push title + ':' + txt
  res




task 'doc', 'Generate annotated source code with Docco', ->
  docco = exec 'docco lib/*.js -o docs/annotated', (err) ->
    throw err if err
  docco.stdout.on 'data', (data) -> console.log data.toString()
  docco.stderr.on 'data', (data) -> console.log data.toString()
  docco.on 'exit', (status) -> callback?() if status is 0

task 'build', '', (options)->
  build()
  do test if options.test;
    


task 'watch', 'run the test when lib files modified', (options) ->
  console.log "watcher on in #{options.mode} mode"
  watcher = chokidar.watch __dirname + '/lib', persistent: true
  watcher.add __dirname + '/test/mcss' if options.mode is 'test'
  watcher.on 'change', build if options.mode isnt 'test'
  # watcher.on 'change', buildTestMcss 

task 'test', 'Run the test suite', ->
  do test

task 'todo', 'extract todo', ->
  do todo

