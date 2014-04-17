'use strict';

var cloudrunner = require('./cloudrunner');

function run(command,options, callback) {
  cloudrunner.run(command,options,callback);
};

function vms(options, callback) {
  cloudrunner.vms(options,callback);
};

function lbs(options, callback) {
  cloudrunner.lbs(options,callback);
};

module.exports = {
  run: run,
  vms: vms,
  lbs: lbs
};
