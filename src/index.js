var Stateman;

if( typeof window === 'object' ){
  Stateman = require("./manager/client.js");
  stateman.History = require("./history.js");
  stateman.util = require("./util.js");
  stateman.isServer = false;
}else{
  stateman = require("./manager/server.js");
  stateman.isServer = true;
}


stateman.State = require("./state.js");

stateman.isServer = !(typeof window === 'object')

module.exports = stateman;
