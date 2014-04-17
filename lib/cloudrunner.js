'use strict';

var AWS = require('aws-sdk');
var pty = require('pty.js');

var Ssh = require('ssh2');
var debug = require('debug')('cloudrunner');
var async = require('async');
var Mustache = require('mustache');
var shellquote = require('shell-quote');
var spawn = require('child_process').spawn;
var parse = require('shell-quote').parse;

function getAWSConfig(options) {
  var awsId = process.env['AWS_ACCESS_KEY'] || options['awsAccessKey'];
  var awsKey = process.env['AWS_SECRET_ACCESS_KEY'] || options['awsSecretAccessKey'];
  var awsRegion = process.env['AWS_REGION'] || options['awsRegion'];

  var o = {
    "accessKeyId": awsId,
    "secretAccessKey": awsKey,
    "region": awsRegion
  };

  return o;
};

function getElb(options) {
  var awsconfig = getAWSConfig(options);
  return new AWS.ELB(awsconfig);
};

function getEc2(options) {
  var awsconfig = getAWSConfig(options);
  return new AWS.EC2(awsconfig);
};

function getInstanceInfo(ids, options, callback) {
  var params = {
    InstanceIds: ids
  };

  var ec2 = getEc2(options);
  ec2.describeInstances(params, function(err, data) {
    if (err) {
      return callback(new Error(err));
    } else {
      var reservations = data.Reservations;
      if (reservations) {
        var meta = {
        };
        reservations.forEach(function(reservation) {
          reservation.Instances.forEach(function(instance) {
            var nameTag = instance.Tags.filter(function(tag) {
              return (tag.Key === 'Name');
            }).map(function(tag) {
              return tag.Value
            })[0];
            meta[nameTag] = {
              ip: instance.PublicIpAddress,
              name: nameTag,
              state: instance.State.Name
            };
          });
        });
        debug(JSON.stringify(meta));
        return callback(null,meta);
      } else {
        return callback( new Error("no reservations found"));
      };
    }
  });

}
function getVmsByNamePrefix(prefix, options, callback) {
  var ec2 = getEc2(options);

  var params = {
  };

  ec2.describeInstances(params, function (err, data) {
    if (err) {
      return callback(err); // an error occurred
    } else     {
      var reservations = data.Reservations;           // successful response
      var results = [];
      reservations.forEach(function(reservation) {
        var instances = reservation.Instances;
        instances.forEach(function(instance) {
          var tags = instance.Tags;
          tags.forEach(function(tag) {
            var tagName = tag.Key ;
            var tagValue = tag.Value ;

            if (tagName === 'Name' && (tagValue.indexOf(prefix) === 0) ) {
              //console.log(instance, tags);
              var publicIp = instance.PublicIpAddress;
              var privateIp = instance.PrivateIpAddress;
              results.push({
                ip: publicIp,
                name: tagValue
              });
            }
          });
        });
      });
      return callback(null,results);
    }
  });

};

function getVmsByLb(name, options, callback) {
  getLbVms(name, options, function(err, metas) {
    if (err) {
      return callback(err);
    } else {
      var vms = [];
      var names = Object.keys(metas);
      names.forEach(function(name) {
        vms.push(metas[name]);
      });

      return callback(null, vms);
    }
  });
};

function getLbVms(name, options,callback) {
  getElbInstanceIds(name, options, function(err, ids) {
    if (err) {
      return callback(err);
    } else {
      getInstanceInfo(ids, options, function(err,meta) {
        return callback(err,meta);
      });
    }
  });
};

function getElbInstanceIds(name,options, callback) {
  var params = {
    LoadBalancerNames: [ name ],
  };

  var elb = getElb(options);
  elb.describeLoadBalancers(params, function(err, data) {
    if (err) {
      debug(err, err.stack); 
      return callback(err);
    } else {
      if ((data.LoadBalancerDescriptions) && (data.LoadBalancerDescriptions[0])) {
        var instances = data.LoadBalancerDescriptions[0].Instances;
        if (instances) {
          var ids = instances.map(function(instance) {
            return instance.InstanceId;
          });
          return callback(null,ids);
        }
      } else {
        return callback(new Error('no loadbalancer description found for ELB'+name));
      }
    }
  });

};

function getElbs(options,callback) {
  var params = {};

  var elb = getElb(options);
  elb.describeLoadBalancers(params, function(err, data) {
    if (err) {
      debug(err, err.stack); 
      return callback(err);
    } else {
      var descriptions = data.LoadBalancerDescriptions;
      if (descriptions) {
        var elbNames = [];
        descriptions.forEach(function(description) {
          elbNames.push(description.LoadBalancerName);
        });
        return callback(null,elbNames);
      } else {
        return callback(new Error('no loadbalancer description found for ELB'+name));
      }
    }
  });
};

function execTask(task, callback) {
  debug("Executing Command", task.command);
  debug("Executing VerifyCommand", task.verify);

  async.series([function(callback) {
    var commandArgs = parse(task.command);
    execCommand(task.name, task.command, callback);
  }, function(callback) {
    if (task.verify) {
      var verifyArgs = parse(task.verify);
      execCommand(task.name,task.verify, callback);
    } else {
      return callback(null);
    }
  }],function(err, results) {
    return callback(err);
  });
}

function execCommandX(vmName,command,  callback) {

  // Inherit for unbuffered output
  var env = JSON.parse(JSON.stringify(process.env));
  var shell = pty.spawn('bash', [ '-c' ,  command ] , { env: env , cwd: process.cwd()});

     shell.on('data', function (data) {
       process.stdout.write("["+vmName+"] " + data);
     });

  shell.on('error', function (data) {
    console.log('lalalalal', data);
    //return callback(new Error(data));
  });


  shell.on('close', function (code, signal) {
    console.log(shell.status);
    if (code !== 0) {
      debug('child process terminated due to receipt of code '+code);
      return callback(new Error('command '+command + ' failed with exit code '+code));
    } else {
      return callback(null);
    }
  });

};

function execCommand(vmName,command,  callback) {

  // Inherit for unbuffered output
  var env = JSON.parse(JSON.stringify(process.env));
  var shell = spawn('bash', [ '-c' ,  command ] , { env: env , cwd: process.cwd()}, {customFds:[0,1,2]});

 shell.stderr.setEncoding('utf8');
 shell.stdout.setEncoding('utf8');

     shell.stdout.on('data', function (data) {
       console.log("["+vmName+"] " + data);
     });
     shell.stderr.on('data', function (data) {
       console.log("["+vmName+"] " + data);
     });

  shell.on('error', function (data) {
    console.log('lalalalal', data);
    //return callback(new Error(data));
  });


  shell.on('close', function (code, signal) {
    if (code !== 0) {
      debug('child process terminated due to receipt of code '+code);
      return callback(new Error('command '+command + ' failed with exit code '+code));
    } else {
      return callback(null);
    }
  });

};

function runOnAll(vms, commandTemplate, options, callback) {

  var verifyTemplate = options.verify;
  var concurrency = options.concurrency;
  var q = async.queue(execTask ,concurrency);

  var reachableVms = vms.filter(function(vm) {
    return (vm.ip !== undefined)
  });

  var errors = [];

  q.drain = function() {
    console.log('done run ALL', errors);
    if (errors.length > 0) {
      return callback(new Error("failed"));
    } else {
      return callback(null);
    }
  };

  var tasks = reachableVms.map(function(vm) {

    var vmName = vm.name;
    var namespace = options.namespace;

    if (namespace) {
      if (vmName.indexOf(namespace + '-') === 0) {
        vmName = vmName.slice(namespace.length + 1);
      }
    }

    var context = { 'name': vmName, 'ip': vm.ip};

    var command = Mustache.render(commandTemplate, context);
    var verify;

    if (verifyTemplate) {
      verify = Mustache.render(verifyTemplate, context);
    }

    return { 'name': vmName, 'ip': vm.ip, 'command': command, 'verify': verify };
  });

  q.push(tasks, function(err){
    if (err) {
      errors.push(err);
      q.kill();
      return callback(err);
    }
  });
};

function run(command ,options, callback) {

  getVms(options, function(err, vms) {
    var canaryVms = vms.slice(0,options.canary);
    debug('canaryVms',canaryVms);

    var restVms = vms.slice(options.canary);
    debug('restVms',restVms);

    debug('running command', command);

    if (err) {
      return callback(err) 
    } else {
      async.series([function(callback) {
        runOnAll(canaryVms, command, options ,callback);
      },function(callback) {
        runOnAll(restVms, command, options ,callback);
      }], function(err, results) {
        callback(err);
      });
    }
  });
}

function getVms(options,callback) {
  async.parallel([function(callback){
    var elbName = options.selectLbMembers;
    if (elbName) {
      getVmsByLb(elbName, options,callback);
    } else {
      callback(null);
    }
  }, function(callback) {
    var namePrefix = options.selectNamePrefix;
    if (namePrefix) {
      getVmsByNamePrefix(namePrefix ,options,callback);
    } else {
      callback(null);
    }
  }], function(err, results) {
    var array = require("array-extended");
    var ips = [];
    results.forEach(function(result) {
      if (result) {
        result.forEach(function(ip) {
          ips.push(ip);
        })
      }
    });
    callback(err, array.unique(ips));
  });
};

function vms(options, callback) {
  getVms(options,function(err, vms) {
    console.log(vms);
    return callback(err);
  });
}

function lbs(options, callback) {
  getElbs(options, function(err, names) {
    console.log(names);
    return callback(err);
  });
}

module.exports = {
  run: run,
  lbs: lbs,
  vms: vms
};
