var cmdargs = require('yargs').argv,
    Promise = require('bluebird'),
    fs = Promise.promisifyAll(require('fs')),
    variables = require('./variables'),
    path = require('path');

var relativePath = cmdargs.path || variables.path,
    source = cmdargs.source || variables.source,
    target = cmdargs.target || variables.target,
    remote = cmdargs.remote || variables.remote,
    skipFetch = cmdargs.skipfetch || false,
    utils = require('./utils')({
        source: source,
        target: target,
        remote: remote,
        relativePath: relativePath,
        skipFetch: skipFetch
    });

utils.printLogo();

console.log('Is ' + source + ' merged into ' + target + '?');

fs.readdirAsync(relativePath)
    .each(function(dir) {
        
        if (dir.indexOf('Mozu.') !== 0 || !fs.statSync(path.join(relativePath, dir)).isDirectory()) return;

        utils.fetch(dir)
            .then(utils.branchesExist)
            .then(utils.merged)
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