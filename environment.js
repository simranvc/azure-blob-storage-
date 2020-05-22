module.exports = {
    development: {
        port: 9494  , // assign your own port no
        mongoUrl: 'mongodb://13.233.186.167:27017/azure-storage',
        logs: 'dev',
    },
    production: {
        port: 9494, // assign your own port no
        mongoUrl: 'mongodb://13.233.186.167:27017/azure-storage',
        logs: 'combined',
    },
    test: {
        port: 9494,
        mongoUrl: 'mongodb://13.233.186.167:27017/azure-storage',
        logs: 'dev',
    }
};