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
                    values.forEach(function(val){ 
                        console.log(val.value());
                    });
                });
        });
    },

    diffConfig: function() {

        // source for this operation will default to current version of configs -- whatever is in the working dir
        // target will be the SHA or branch provided --, if target is not provided it will default to master

        console.log('Diffing Configs for', vars.source, 'and', vars.target);

        Promise.settle([git.doesRevisionExist(vars.source), git.doesRevisionExist(vars.target)]).then(function(){

            helpers.mkdir(vars.diffConfigVars.targetDir);
            helpers.mkdir(vars.diffConfigVars.sourceDir);

            git.checkout('Mozu.Config', vars.source)
                .then(helpers.buildAndCopyConfigs.bind(this, vars, {sourceDir: vars.source}, 'Mozu.Config', git.contains)).then(
            git.checkout.bind(this, 'Mozu.Config', vars.target))
                .then(helpers.buildAndCopyConfigs.bind(this, vars, {targetDir: vars.target}, 'Mozu.Config', git.contains))
                .then(helpers.diffConfigs.bind(this, vars));

        });

    },

    checkMerge: function() {
        
        console.log('Checking Merge: Is', vars.source, 'merged into', vars.target, '\n');

        helpers.repoWrapper(vars.relativePath, function(dirs) {
            
            Promise.settle(git.branchesExist(dirs))
                .then(git.merged)
                .then(Promise.settle)
                .then(function(values){
                    values.sort(helpers.sort)
                        .forEach(function(val){

                            var str;

                            if (val.isFulfilled()) {
                                str = val.value().name;

                                for (var i = 0; i < 30 - val.value().name.length; i++) {
                                    str += ' ';
                                }

                                str += '[' + (val.value().isMerged ? 'X' : ' ') + ']';

                                console.log(str);
                            }

                            else {
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



