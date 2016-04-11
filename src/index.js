var stateman;

if( typeof window === 'object' ){
  stateman = require("./manager/client.js");
  stateman.History = require("./history.js");
  stateman.util = require("./util.js");
  stateman.isServer = false;
}else{
  stateman = require("./manager/server.js");
  stateman.isServer = true;
}


stateman.State = require("./state.js");

module.exports = stateman;
