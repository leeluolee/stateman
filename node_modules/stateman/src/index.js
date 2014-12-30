var StateMan = require("./stateman.js");




function stateman( option ){
  return new StateMan( option );
}


stateman.Histery = require("./histery.js");
stateman.util = require("./util.js");
stateman.State = require("./state.js");
stateman.StateMan = StateMan;

module.exports = stateman;
