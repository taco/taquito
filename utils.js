var Promise = require('bluebird'),
    Command = require('./lib/command'),
    parse = require('./lib/parser');

module.exports = function(vars) {

    return { 
        fetch: function(dir) {
            return new Promise(function(fulfill, reject) {
                if (vars.skipFetch) return fulfill(dir);

                var cmd = new Command(vars.relativePath + dir, 'fetch --all', []);

                cmd.exec(function(err, stdout, stderr) {
                    if (err)
                        reject(err);

                    fulfill(dir);
                });

            });
        },

        merged: function(dir) {
            return new Promise(function(fulfill, reject) {
                var cmd = new Command(vars.relativePath + dir, 'branch --merged', [], vars.remote + '/' + vars.target + ' -r');
                cmd.exec(function(err, stdout, stderr) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    var branches = parse.branch(stdout);

                    fulfill(branches.others.indexOf(vars.remote + '/' + vars.source) > -1);
                });
            });
        },

        branchesExist: function(dir) {
            return new Promise(function(fulfill, reject) {
                var cmd = new Command(vars.relativePath + dir, 'branch -r', [], '');

                cmd.exec(function(err, stdout, stderr) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    var branches = parse.branch(stdout);

                    var sourceExists = branches.others.indexOf(vars.remote + '/' + vars.source) > -1;
                    var targetExists = branches.others.indexOf(vars.remote + '/' + vars.target) > -1;

                    if (!sourceExists) {
                        return reject(dir + ' - Branch ' + vars.source + ' does not exist');
                    }

                    if (!targetExists) {
                        return reject(dir + ' - Branch ' + vars.target + ' does not exist');
                    }

                    fulfill(dir);
                });
            });
        },

        printLogo: function() {
            console.log('\n  ______                  _ __      \n /_  __/___ _____ ___  __(_) /_____ \n  / / / __ `/ __ `/ / / / / __/ __ \\\n / / / /_/ / /_/ / /_/ / / /_/ /_/ /\n/_/  \\__,_/\\__, /\\__,_/_/\\__/\\____/ \n             /_/                    \n');
        }
    };
};