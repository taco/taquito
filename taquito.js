var cmdargs = require('yargs').argv,
    Promise = require('bluebird'),
    fs = Promise.promisifyAll(require('fs-extra')),
    Exec = require('child_process').exec,
    Mkdirp = require('mkdirp'),
    cliff = require('cliff'),
    clc = require('cli-color'),
    Command = require('./lib/command'),
    helpers = require('./lib/helper')(Promise, fs, Mkdirp, Exec, Command),
    config = require('config'),
    persist = require('node-persist'),
    inquirer = require('inquirer');

var vars = helpers.getVars(cmdargs, config),
    git = require('./lib/git')(Promise, vars, Command),
    octopus = require('./lib/octopus');

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

    deploys: function() {

        if (!Array.prototype.find) {
            console.log(clc.red('ERROR:'), 'Must run node in --harmony mode to run this function');
            return;
        }


        octopus.dashboard()
            .then(function(data) {

                helpers.repoWrapper(vars.relativePath, function(dirs) {

                    var rows = [
                            [clc.red('Repository')]
                        ],
                        environments = [],
                        projects;


                    data.Environments.forEach(function(env) {
                        env.Name = env.Name.toUpperCase();
                        if (vars.env.some(function(envName) {
                                return envName.trim() === env.Name || env.Name.indexOf(envName.trim() + '-') === 0;
                            }) && env.Name.indexOf('-A') < 0 && env.Name.indexOf('-B') < 0 && env.Name.indexOf('-INT') < 0) {
                            rows[0].push(clc.red(env.Name));
                            environments.push(env);
                        }
                    });

                    projects = dirs.map(function(dir) {
                        return data.Projects.find(function(proj) {
                            return proj.Name === dir.value();
                        });
                    }).filter(function(proj) {
                        return proj && (vars.repo[0] === 'ALL' || vars.repo.some(function(name) {
                            //console.log(name, proj.Name)
                            return proj.Name.toUpperCase().indexOf(name.trim()) > -1;
                        }));
                    });

                    projects.forEach(function(proj) {
                        if (!proj) {
                            return;
                        }

                        rows.push([proj.Name].concat(environments.map(function(env) {
                            var item = data.Items.find(function(item) {
                                    //console.log(item.EnvironmentId);
                                    return item.EnvironmentId === env.Id && item.ProjectId === proj.Id;
                                }),
                                release;

                            return item ? item.ReleaseVersion : '';

                        })));

                    });

                    console.log(cliff.stringifyRows(rows));
                });
            });
    },

    clone: function() {
        helpers.repoWrapper(vars.relativePath, function(dirs) {
            var repoInformation = config.get('repoInformation'),
                dirValues = dirs.map(function(dir) {
                    return dir.value()
                }),
                diff = repoInformation.repos.filter(function(name) {
                    return dirValues.indexOf(name) < 0
                }),
                choices = diff.map(function(repo) {
                    return {
                        name: repo
                    };
                });

            if (!choices.length) {
                console.log('There are no repos to clone');
                return;
            }

            inquirer.prompt([{
                type: 'checkbox',
                message: 'Select Repos to Clone:',
                name: 'repos',
                choices: choices
            }], function(answers) {
                if (!answers.repos.length) {
                    return;
                }

                console.log('Cloning selected repositories');

                Promise.settle(answers.repos.map(function(repo) {
                        return git.clone('master', vars.relativePath, repoInformation.baseUrl + repo, repo);
                    }))
                    .then(function(results) {
                        results.forEach(function(r) {
                            if (r.isRejected()) {
                                console.log(r.reason());
                            }
                        });
                        console.log('Cloning complete');
                    });
            });
        });
    },

    listRepos: function() {
        helpers.repoWrapper(vars.relativePath, function(dirs) {
            dirs.map(function(dir) {
                    return dir.value();
                })
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