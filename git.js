var Command = require('./lib/command'),
    parse = require('./lib/parser');

module.exports = function(Promise, vars) {

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