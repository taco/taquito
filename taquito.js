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
    git = require('./git')({
        source: source,
        target: target,
        remote: remote,
        relativePath: relativePath,
        skipFetch: skipFetch
    });

//git.printLogo();

//console.log('Is ' + source + ' merged into ' + target + '?');
//
//

var operations = {
    fetch: function() {
        
        console.log('Fetching all branches \n');

        fs.readdirAsync(relativePath)
            .each(function(dir) {
                
                if (dir.indexOf('Mozu.') !== 0 || !fs.statSync(path.join(relativePath, dir)).isDirectory()) return;

                git.fetch(dir)
                    .catch(function(e) {
                        console.log(e);
                    });
            });
    },

    checkMerge: function() {
        
        console.log('Checking Merge: Is', source, 'merged into', target, '\n');

        fs.readdirAsync(relativePath)
            .each(function(dir) {
                
                if (dir.indexOf('Mozu.') !== 0 || !fs.statSync(path.join(relativePath, dir)).isDirectory()) return;

                git.branchesExist(dir)
                    .then(git.merged)
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
                    });
            });
    }
}

var helpers = {
    printLogo: function() {
        console.log('\n  ______                  _ __      \n /_  __/___ _____ ___  __(_) /_____ \n  / / / __ `/ __ `/ / / / / __/ __ \\\n / / / /_/ / /_/ / /_/ / / /_/ /_/ /\n/_/  \\__,_/\\__, /\\__,_/_/\\__/\\____/ \n             /_/                    \n');
    }
}

helpers.printLogo();

if (operations[operation]) {
    operations[operation]();
} else {
    console.log('unknown command', operation);
}



