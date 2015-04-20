var cmdargs = require('yargs').argv,
    Promise = require('bluebird'),
    fs = Promise.promisifyAll(require('fs')),
    variables = require('./variables'),
    path = require('path');

var operation = cmdargs._[0] || 'help',
    relativePath = cmdargs.path || variables.path,
    source = cmdargs.source || variables.source,
    target = cmdargs.target || variables.target,
    remote = cmdargs.remote || variables.remote,
    skipFetch = cmdargs.skipfetch || false,
    settle = Promise.settle,
    git = require('./git')({
        source: source,
        target: target,
        remote: remote,
        relativePath: relativePath,
        skipFetch: skipFetch
    });

var operations = {
    fetch: function() {
        
        console.log('Fetching all branches \n');

        helpers.repoWrapper(function(dirs) {

            settle(git.fetch(dirs))
                .then(function(values) {
                    values.forEach(function(val){ 
                        console.log(val.value());
                    });
                });
        });
    },

    checkMerge: function() {
        
        console.log('Checking Merge: Is', source, 'merged into', target, '\n');

        helpers.repoWrapper(function(dirs) {
            
            settle(git.branchesExist(dirs))
                .then(function(res){return settle(git.merged(res));})
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
    }
};

var helpers = {
    
    printLogo: function() {
        console.log('\n  ______                  _ __      \n /_  __/___ _____ ___  __(_) /_____ \n  / / / __ `/ __ `/ / / / / __/ __ \\\n / / / /_/ / /_/ / /_/ / / /_/ /_/ /\n/_/  \\__,_/\\__, /\\__,_/_/\\__/\\____/ \n             /_/                    \n');
    },

    correctDir: function(dir) {
        return dir.indexOf('Mozu.') !== -1; 
    },

    sort: function(val) {
        return val.isFulfilled() && !val.value().isMerged;
    },

    repoWrapper: function(fn) {
        settle(fs.readdirAsync(relativePath).filter(this.correctDir)).then(fn);
    }
};

helpers.printLogo();

if (operations[operation]) {
    operations[operation]();
} else {
    console.log('unknown command', operation);
}



