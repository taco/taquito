var argv = require('yargs').argv;
var Promise = require('bluebird');
var Command = require('./lib/command');
var parse = require('./lib/parser');
var fs = Promise.promisifyAll(require('fs'));
var path = require('path');

var source = argv.source || '1.16';
var target = argv.target || 'master';
var remote = argv.remote || 'origin';


function fetch(dir) {
    return new Promise(function(fulfill, reject) {
        //return fulfill(dir);
        var cmd = new Command(dir, 'fetch --all', []);

        cmd.exec(function(err, stdout, stderr) {
            if (err)
                reject(err);

            fulfill(dir);
        });
    });
}

function merged(dir) {
    return new Promise(function(fulfill, reject) {
        var cmd = new Command(dir, 'branch --merged', [], remote + '/' + target + ' -r');
        cmd.exec(function(err, stdout, stderr) {
            if (err) {
                reject(err);
                return;
            }
            var branches = parse.branch(stdout);

            fulfill(branches.others.indexOf(remote + '/' + source) > -1);
        });
    });
}

function branchesExist(dir) {
    return new Promise(function(fulfill, reject) {
        var cmd = new Command(dir, 'branch -r', [], '');

        cmd.exec(function(err, stdout, stderr) {
            if (err) {
                reject(err);
                return;
            }

            var branches = parse.branch(stdout);

            var sourceExists = branches.others.indexOf(remote + '/' + source) > -1;
            var targetExists = branches.others.indexOf(remote + '/' + target) > -1;

            if (!sourceExists) {
                return reject(dir + ' - Branch ' + source + ' does not exist');
            }

            if (!targetExists) {
                return reject(dir + ' - Branch ' + target + ' does not exist');
            }

            fulfill(dir);
        });
    });
}

console.log('=============');
console.log('Is ' + source + ' merged into ' + target + '?');

fs.readdirAsync(".")
    .each(function(dir) {
        if (dir.indexOf('Mozu.') !== 0 || !fs.statSync(path.join('.', dir)).isDirectory()) return;

        fetch(dir)
            .then(branchesExist)
            .then(merged)
            .then(function(exists) {
                var str = dir;

                for (var i = 0; i < 30 - dir.length; i++) {
                    str += ' ';
                }

                str += '[' + (exists ? 'X' : ' ') + ']';

                console.log(str);
            })
            .catch(function(e) {
                console.log(e);
            })


    });