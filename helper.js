module.exports = function(Promise, fs, Mkdirp, Exec, Command, git) {
    return {
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

        buildAndCopyConfigs: function(vars, revision, dir, contains) {

            return new Promise(function(fullfill, reject) {

                contains(vars, '1.17', dir).then(function(result) {

                    var revType = Object.keys(revision)[0];

                    if (result.indexOf(revision[revType]) !== -1) {
                        console.log('Building Legacy Configs');
                        
                        Exec(vars.diffConfigVars.buildConfigCommand, function() {

                            fs.copy(vars.relativePath + dir + '/Configs/_legacy', vars.diffConfigVars[revType], function() {
                                fullfill(arguments);
                            });

                        });
                    }

                    else {
                        console.log('Copying Legacy Configs, Repo does not need to be built');

                        ['ci', 'dev', 'qa', 'qa2', 'si', 'perf', 'prod'].forEach(function(d){
                
                            fs.copySync(vars.relativePath + dir + '/Configs/' + d, vars.diffConfigVars[revType] + '/' + d);

                        });

                        fullfill(arguments);
                    }

                });

            });
        },

        diffConfigs: function(vars) {
            Exec(vars.diffConfigVars.diffCommand + ' "../../sourceDir" "../../targetDir"', function() {
                console.log('Ready to Compare');
                process.exit();
            });
        },

        mkdir: function(path) {
            return Mkdirp.sync(path);
        },
 
        getVars: function(cmdargs, variables) {
            return {
                source: cmdargs.source || variables.source,
                target: cmdargs.target || variables.target,
                remote: cmdargs.remote || variables.remote,
                relativePath: cmdargs.path || variables.path,
                operation: cmdargs._[0] || variables.defaultOperation,
                diffConfigVars: variables. diffConfigVars
            };
        }
    };
};