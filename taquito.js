var cmdargs = require('yargs').argv,
    Promise = require('bluebird'),
    fs = Promise.promisifyAll(require('fs-extra')),
    Exec = require('child_process').exec,
    Mkdirp = require('mkdirp'),
    Command = require('./lib/command'),
    helpers = require('./lib/helper')(Promise, fs, Mkdirp, Exec, Command),
    config = require('config');

var vars = helpers.getVars(cmdargs, config),
    git = require('./lib/git')(Promise, vars, Command);

var operations = {
    fetch: function() {

        console.log('Fetching all branches \n');

        helpers.repoWrapper(vars.relativePath, function(dirs) {

            Promise.settle(git.fetch(dirs))
                .then(function(values) {
                    values.forEach(function(val) {
                        console.log(val.value());
                    });
                });
        });
    },

    cloneRepos: function() {
        console.log('Cloning repositories:');
        helpers.repoWrapper(vars.relativePath, function(dirs) {
            var repoInformation = config.get('repoInformation'),
                dirValues = dirs.map(function(dir) { return dir.value() }),
                diff = repoInformation.repos.filter(function(name) {
                    return dirValues.indexOf(name) < 0
                }),
                promises = diff.map(function(repo) {
                    console.log('\tStarting', repo);
                    return git.clone('master', vars.relativePath, repoInformation.baseUrl + repo, repo);
                });

            Promise.settle(promises)
                .then(function(results) {
                    results.forEach(function(r) {
                        if (r.isRejected()) {
                            console.log(r.reason());
                        }
                    });
                    console.log('Cloning complete');
                })
        });
    },

    listRepos: function() {
        helpers.repoWrapper(vars.relativePath, function(dirs) {
            dirs.map(function(dir) { return dir.value(); })
                .sort()
                .forEach(function(name, i) {
                    console.log('\t' + (i + 1) + '.\t' + name);
                });
        });
    },

    diffConfig: function() {

        // source for this operation will default to current version of configs -- whatever is in the working dir
        // target will be the SHA or branch provided --, if target is not provided it will default to master

        console.log('Diffing Configs for', vars.source, 'and', vars.target);

        Promise.settle([git.doesRevisionExist(vars.source), git.doesRevisionExist(vars.target)]).then(function() {

            var tempbranchname = 'Configs';

            helpers.tempDir(__dirname + vars.diffConfigVars.targetDir, true);
            helpers.tempDir(__dirname + vars.diffConfigVars.sourceDir, true);
            helpers.tempDir(__dirname + vars.scratchDir, true);

            git.clone('1.17', __dirname + vars.scratchDir, 'http://tfs.corp.volusion.com:8080/tfs/VNext/v2Mozu/_git/Mozu.Config', tempbranchname)
                .then(git.checkout.bind(this, 'Mozu.Config', vars.source, __dirname + vars.scratchDir + '/' + tempbranchname))
                .then(helpers.buildAndCopyConfigs.bind(this, vars, {
                    sourceDir: vars.source
                }, tempbranchname, __dirname))
                .then(git.checkout.bind(this, 'Mozu.Config', vars.target, __dirname + vars.scratchDir + '/' + tempbranchname))
                .then(helpers.buildAndCopyConfigs.bind(this, vars, {
                    targetDir: vars.target
                }, tempbranchname, __dirname))
                .then(helpers.diffConfigs.bind(this, vars, __dirname));

        });

    },

    checkMerge: function() {

        console.log('Checking Merge: Is', vars.source, 'merged into', vars.target, '\n');

        helpers.repoWrapper(vars.relativePath, function(dirs) {

            Promise.settle(git.branchesExist(dirs))
                .then(git.merged)
                .then(Promise.settle)
                .then(function(values) {
                    values.sort(helpers.sort)
                        .forEach(function(val) {

                            var str;

                            if (val.isFulfilled()) {
                                str = val.value().name;

                                for (var i = 0; i < 30 - val.value().name.length; i++) {
                                    str += ' ';
                                }

                                str += '[' + (val.value().isMerged ? 'X' : ' ') + ']';

                                console.log(str);
                            } else {
                                // to do: get errored branches
                                // str = val;
                                // console.log(val.error());
                            }


                        });
                });
        });
    },

    help: function() {
        console.log('Possible Commands:', '\n', '-', Object.keys(this).join('\n - '));
    }
};


helpers.printLogo();

if (operations[vars.operation]) {
    operations[vars.operation]();
} else {
    console.log('Unknown Command: ', vars.operation, '\n');
    operations.help();
}