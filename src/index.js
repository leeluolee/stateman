var App = require('./app.js');
var StateMan = require("stateman");


var stateman = new StateMan();

stateman
  .state("contact",{})
    .state("contact.detail", {})
      .state("contact.detail.message", {})
      .state("contact.detail.order",{})
      .state("contact.detail.info",{})
      .state("contact.detail.setting",{})
  .state("contact.list",{})
  .state("user.detail.message", {})
  


var app =new App({
  data: {
    state: stateman
  },
  init: function(){
    stateman.start({html5:false})
  }
}).$inject("#app");


