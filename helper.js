var Promise = require('bluebird'),
    fs = Promise.promisifyAll(require('fs'));

module.exports = function(fs) {
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
        }
    };
};