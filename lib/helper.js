module.exports = function(Promise, fs, Mkdirp, Exec, Command, git) {
    var helpers;
    helpers =  {
        printLogo: function() {
            console.log('\n  ______                  _ __      \n /_  __/___ _____ ___  __(_) /_____ \n  / / / __ `/ __ `/ / / / / __/ __ \\\n / / / /_/ / /_/ / /_/ / / /_/ /_/ /\n/_/  \\__,_/\\__, /\\__,_/_/\\__/\\____/ \n             /_/                    \n');
        },

        correctDir: function(dir) {
            return dir.indexOf('Mozu.') !== -1; 
        },

        sort: function(val) {
            return val.isFulfilled() && !val.value().isMerged;
        },

        repoWrapper: function(relativePath, fn) {
            Promise.settle(fs.readdirAsync(relativePath).filter(this.correctDir)).then(fn);
        },

        nugetRestore: function(path) {
            return new Promise(function(fullfill, reject) {
                Exec('nuget restore', {cwd: path}, function(err, stdout, stderr) {
                   if (err) return console.log('Error restoring nugets');
                   fullfill(stdout);
                });
            });
        },

        buildAndCopyConfigs: function(vars, revision, branchname, root) {

            return new Promise(function(fullfill, reject) {

                var revType = Object.keys(revision)[0],
                    path = root + vars.scratchDir + '\\' + branchname;
                
                console.log('Building Legacy Configs for ' + revType + ': ' + revision[revType]);

                helpers.nugetRestore(path)
                    .then(function(){
                        Exec(vars.diffConfigVars.buildConfigCommand, {cwd: path + '/Configs'}, function() {
                            
                            fs.copy(path + '/Configs/_legacy', root + vars.diffConfigVars[revType], function() {
                                fullfill(arguments);
                            });

                        });
                    });
            });
        },

        diffConfigs: function(vars, root) {
            console.log('Ready to Compare');

            Exec([vars.diffConfigVars.diffCommand, '"' + root + vars.diffConfigVars.sourceDir + '"', '"' + root + vars.diffConfigVars.targetDir + '"',].join(' '), function() {
                console.log('Deleting temp directories');
                helpers.tempDir(root + vars.diffConfigVars.targetDir);
                helpers.tempDir(root + vars.diffConfigVars.sourceDir);
                helpers.tempDir(root + vars.scratchDir);
            });
        },

        tempDir: function(path, create) {
            fs.removeSync(path);
            if (create) Mkdirp.sync(path);
        },
 
        getVars: function(cmdargs, config) {
            return {
                source: cmdargs.source || config.get('source'),
                target: cmdargs.target || config.get('target'),
                remote: cmdargs.remote || config.get('remote'),
                relativePath: cmdargs.path || config.get('path'),
                scratchDir: config.get('scratchDir'),
                operation: cmdargs._[0] || config.get('defaultOperation'),
                diffConfigVars: config.get('diffConfigVars')
            };
        }
    };

    return helpers;
};