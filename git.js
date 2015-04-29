var parse = require('./lib/parser');

module.exports = function(Promise, vars, Command) {

    return { 
        fetch: function(dirs) {
            return dirs.map(function(d) {
                return new Promise(function(fulfill, reject) {
                    var dir = d.value();

                    var cmd = new Command(vars.relativePath + dir, 'fetch --all', []);

                    cmd.exec(function(err, stdout, stderr) {
                        if (err)
                            reject(err);

                        fulfill(dir);
                    });
                });
            });
        },

        merged: function(dirs) {
            return dirs.map(function(d) {
                return new Promise(function(fulfill, reject) {
                    var dir = d.value(),
                        cmd = new Command(vars.relativePath + dir, 'branch --merged', [], vars.remote + '/' + vars.target + ' -r');
                    cmd.exec(function(err, stdout, stderr) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        var branches = parse.branch(stdout);

                        fulfill({name: dir, isMerged: branches.others.indexOf(vars.remote + '/' + vars.source) > -1});
                    });
                });
            });
        },

        doesRevisionExist: function(revision) {

            return new Promise(function(fulfill, reject) {

                var cmd = new Command(vars.relativePath + 'Mozu.Config', 'rev-parse --verify ' + revision, [], '');

                cmd.exec(function(err, stdout, stderr) {

                    if (arguments[2]) {
                      return console.log('Revision', revision, 'does not exist. Please try a new revision.');
                    }

                    fulfill(revision);
                });
            });
        },

        checkout: function(branch, revision) {

            return new Promise(function(fulfill, reject) {

                var cmd = new Command(vars.relativePath + branch, 'checkout ' + revision, [], '');

                cmd.exec(function(err, stdout, stderr){
                    if (!err) return fulfill(stdout);

                    reject(err);
                });
            });

        },

        contains: function(vars, revision, dir) {
            return new Promise(function(fulfill, reject) {
                var cmd = new Command(vars.relativePath + dir, 'branch --contains ' + revision, [], '');

                cmd.exec(function(err, stdout, stderr) {
                    fulfill(stdout);
                });
            });
        },

        branchesExist: function(dirs) {

            return dirs.map(function(d) {
                return new Promise(function(fulfill, reject) {
                    var dir = d.value(),
                        cmd = new Command(vars.relativePath + dir, 'branch -r', [], '');

                    cmd.exec(function(err, stdout, stderr) {
                        if (err) {
                            reject(err);
                            return;
                        }

                        var branches = parse.branch(stdout),
                            sourceExists = branches.others.indexOf(vars.remote + '/' + vars.source) > -1,
                            targetExists = branches.others.indexOf(vars.remote + '/' + vars.target) > -1;

                        if (!sourceExists) {
                            return reject(dir + ' - Branch ' + vars.source + ' does not exist');
                        }

                        if (!targetExists) {
                            return reject(dir + ' - Branch ' + vars.target + ' does not exist');
                        }

                        fulfill(dir);
                    });
                });
            });
        }
    };
};