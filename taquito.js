var cmdargs = require('yargs').argv,
    Promise = require('bluebird'),
    fs = Promise.promisifyAll(require('fs')),
    helpers = require('./helper')(Promise, fs),
    variables = require('./variables');

var vars = helpers.getVars(cmdargs, variables),
    git = require('./git')(Promise, vars);

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



