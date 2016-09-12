var should         = require('should'),
    sinon          = require('sinon'),
    Promise        = require('bluebird'),
    moment         = require('moment'),
    path           = require('path'),
    fs             = require('fs'),
    _              = require('lodash'),

    testUtils      = require('../utils'),
    i18n           = require('../../server/i18n'),
    utils          = require('../../server/utils'),
    /*jshint unused:false*/
    db             = require('../../server/data/db/connection'),

    // Thing we are testing
    configUtils    = require('../utils/configUtils'),
    config         = configUtils.config,
    // storing current environment
    currentEnv     = process.env.NODE_ENV;

i18n.init();

describe('Config', function () {
    before(function () {
        configUtils.restore();
    });

    afterEach(function () {
        configUtils.restore();
    });

    describe('Theme', function () {
        beforeEach(function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com',
                theme: {
                    title: 'casper',
                    description: 'casper',
                    logo: 'casper',
                    cover: 'casper',
                    timezone: 'Etc/UTC'
                }
            });
        });

        it('should have exactly the right keys', function () {
            var themeConfig = config.theme;

            // This will fail if there are any extra keys
            themeConfig.should.have.keys('url', 'title', 'description', 'logo', 'cover', 'timezone');
        });

        it('should have the correct values for each key', function () {
            var themeConfig = config.theme;

            // Check values are as we expect
            themeConfig.should.have.property('url', 'http://my-ghost-blog.com');
            themeConfig.should.have.property('title', 'casper');
            themeConfig.should.have.property('description', 'casper');
            themeConfig.should.have.property('logo', 'casper');
            themeConfig.should.have.property('cover', 'casper');
            themeConfig.should.have.property('timezone', 'Etc/UTC');
        });
    });

    describe('Timezone default', function () {
        it('should use timezone from settings when set', function () {
            var themeConfig = config.theme;

            // Check values are as we expect
            themeConfig.should.have.property('timezone', 'Etc/UTC');
            themeConfig.should.have.property('url');

            configUtils.set({
                theme: {
                    timezone: 'Africa/Cairo'
                }
            });

            config.theme.should.have.property('timezone', 'Africa/Cairo');
            config.theme.should.have.property('url');
        });

        it('should set theme object with timezone by default', function () {
            var themeConfig = configUtils.defaultConfig;

            // Check values are as we expect
            themeConfig.should.have.property('theme');
            themeConfig.theme.should.have.property('timezone', 'Etc/UTC');
            themeConfig.theme.should.have.property('url');
        });
    });

    describe('Index', function () {
        it('should have exactly the right keys', function () {
            var pathConfig = config.paths;

            // This will fail if there are any extra keys
            pathConfig.should.have.keys(
                'appRoot',
                'subdir',
                'config',
                'configExample',
                'storagePath',
                'contentPath',
                'corePath',
                'themePath',
                'appPath',
                'internalAppPath',
                'imagesPath',
                'imagesRelPath',
                'adminViews',
                'helperTemplates',
                'clientAssets'
            );
        });

        it('should have the correct values for each key', function () {
            var pathConfig = config.paths,
                appRoot = path.resolve(__dirname, '../../../');

            pathConfig.should.have.property('appRoot', appRoot);
            pathConfig.should.have.property('subdir', '');
        });

        it('should not return a slash for subdir', function () {
            configUtils.set({url: 'http://my-ghost-blog.com'});
            config.paths.should.have.property('subdir', '');

            configUtils.set({url: 'http://my-ghost-blog.com/'});
            config.paths.should.have.property('subdir', '');
        });

        it('should handle subdirectories properly', function () {
            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            config.paths.should.have.property('subdir', '/blog');

            configUtils.set({url: 'http://my-ghost-blog.com/blog/'});
            config.paths.should.have.property('subdir', '/blog');

            configUtils.set({url: 'http://my-ghost-blog.com/my/blog'});
            config.paths.should.have.property('subdir', '/my/blog');

            configUtils.set({url: 'http://my-ghost-blog.com/my/blog/'});
            config.paths.should.have.property('subdir', '/my/blog');
        });

        it('should add subdir to list of protected slugs', function () {
            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            config.slugs.protected.should.containEql('blog');

            configUtils.set({url: 'http://my-ghost-blog.com/my/blog'});
            config.slugs.protected.should.containEql('blog');
        });

        it('should allow specific properties to be user defined', function () {
            var contentPath = path.join(config.paths.appRoot, 'otherContent', '/'),
                configFile = 'configFileDanceParty.js';

            configUtils.set({
                config: configFile,
                paths: {
                    contentPath: contentPath
                }
            });

            config.should.have.property('config', configFile);
            config.paths.should.have.property('contentPath', contentPath);
            config.paths.should.have.property('themePath', contentPath + 'themes');
            config.paths.should.have.property('appPath', contentPath + 'apps');
            config.paths.should.have.property('imagesPath', contentPath + 'images');
        });
    });

    describe('Storage', function () {
        it('should default to local-file-store', function () {
            config.paths.should.have.property('storagePath', {
                default: path.join(config.paths.corePath, '/server/storage/'),
                custom:  path.join(config.paths.contentPath, 'storage/')
            });

            config.storage.should.have.property('active', {
                images: 'local-file-store',
                themes: 'local-file-store'
            });
        });

        it('should allow setting a custom active storage as string', function () {
            var storagePath = path.join(config.paths.contentPath, 'storage', 's3');

            configUtils.set({
                storage: {
                    active: 's3',
                    s3: {}
                }
            });

            config.storage.should.have.property('active', {
                images: 's3',
                themes: 'local-file-store'
            });

            config.storage.should.have.property('s3', {});
        });

        it('should use default theme adapter when passing an object', function () {
            var storagePath = path.join(config.paths.contentPath, 'storage', 's3');

            configUtils.set({
                storage: {
                    active: {
                        themes: 's3'
                    }
                }
            });

            config.storage.should.have.property('active', {
                images: 'local-file-store',
                themes: 'local-file-store'
            });
        });

        it('should allow setting a custom active storage as object', function () {
            var storagePath = path.join(config.paths.contentPath, 'storage', 's3');

            configUtils.set({
                storage: {
                    active: {
                        images: 's2',
                        themes: 'local-file-store'
                    }
                }
            });

            config.storage.should.have.property('active', {
                images: 's2',
                themes: 'local-file-store'
            });
        });
    });

    describe('File', function () {
        var sandbox,
            readFileStub,
            overrideReadFileConfig,
            expectedError = new Error('expected bootstrap() to throw error but none thrown');

        before(function () {
            // Create a function to override what reading the config file returns
            overrideReadFileConfig = function (newConfig) {
                readFileStub.returns(
                    _.extend({}, configUtils.defaultConfig, newConfig)
                );
            };
        });

        beforeEach(function () {
            sandbox = sinon.sandbox.create();
            readFileStub = sandbox.stub(config, 'readFile');
        });

        afterEach(function () {
            sandbox.restore();
        });

        it('loads the config file if one exists', function (done) {
            // We actually want the real method here.
            readFileStub.restore();

            // the test infrastructure is setup so that there is always config present,
            // but we want to overwrite the test to actually load config.example.js, so that any local changes
            // don't break the tests
            configUtils.set({
                paths: {
                    appRoot: path.join(configUtils.defaultConfig.paths.appRoot, 'config.example.js')
                }
            });

            config.load().then(function (config) {
                config.url.should.equal(configUtils.defaultConfig.url);
                config.database.client.should.equal(configUtils.defaultConfig.database.client);

                if (config.database.client === 'sqlite3') {
                    config.database.connection.filename.should.eql(configUtils.defaultConfig.database.connection.filename);
                } else {
                    config.database.connection.charset.should.eql(configUtils.defaultConfig.database.connection.charset);
                    config.database.connection.database.should.eql(configUtils.defaultConfig.database.connection.database);
                    config.database.connection.host.should.eql(configUtils.defaultConfig.database.connection.host);
                    config.database.connection.password.should.eql(configUtils.defaultConfig.database.connection.password);
                    config.database.connection.user.should.eql(configUtils.defaultConfig.database.connection.user);
                }

                config.server.host.should.equal(configUtils.defaultConfig.server.host);
                config.server.port.should.equal(configUtils.defaultConfig.server.port);

                done();
            }).catch(done);
        });

        it('uses the passed in config file location', function (done) {
            // We actually want the real method here.
            readFileStub.restore();

            config.load(path.join(configUtils.defaultConfig.paths.appRoot, 'config.example.js')).then(function (config) {
                config.url.should.equal(configUtils.defaultConfig.url);
                config.database.client.should.equal(configUtils.defaultConfig.database.client);

                if (config.database.client === 'sqlite3') {
                    config.database.connection.filename.should.eql(configUtils.defaultConfig.database.connection.filename);
                } else {
                    config.database.connection.charset.should.eql(configUtils.defaultConfig.database.connection.charset);
                    config.database.connection.database.should.eql(configUtils.defaultConfig.database.connection.database);
                    config.database.connection.host.should.eql(configUtils.defaultConfig.database.connection.host);
                    config.database.connection.password.should.eql(configUtils.defaultConfig.database.connection.password);
                    config.database.connection.user.should.eql(configUtils.defaultConfig.database.connection.user);
                }
                config.server.host.should.equal(configUtils.defaultConfig.server.host);
                config.server.port.should.equal(configUtils.defaultConfig.server.port);

                done();
            }).catch(done);
        });

        it('creates the config file if one does not exist', function (done) {
            // trick bootstrap into thinking that the config file doesn't exist yet
            var existsStub = sandbox.stub(fs, 'stat', function (file, cb) { return cb(true); }),
                // ensure that the file creation is a stub, the tests shouldn't really create a file
                writeFileStub = sandbox.stub(config, 'writeFile').returns(Promise.resolve()),
                validateStub = sandbox.stub(config, 'validate').returns(Promise.resolve());

            config.load().then(function () {
                existsStub.calledOnce.should.be.true();
                writeFileStub.calledOnce.should.be.true();
                validateStub.calledOnce.should.be.true();
                done();
            }).catch(done);
        });

        it('accepts urls with a valid scheme', function (done) {
            // replace the config file with invalid data
            overrideReadFileConfig({url: 'http://testurl.com'});

            config.load().then(function (localConfig) {
                localConfig.url.should.equal('http://testurl.com');

                // Next test
                overrideReadFileConfig({url: 'https://testurl.com'});
                return config.load();
            }).then(function (localConfig) {
                localConfig.url.should.equal('https://testurl.com');

                // Next test
                overrideReadFileConfig({url: 'http://testurl.com/blog/'});
                return config.load();
            }).then(function (localConfig) {
                localConfig.url.should.equal('http://testurl.com/blog/');

                // Next test
                overrideReadFileConfig({url: 'http://testurl.com/ghostly/'});
                return config.load();
            }).then(function (localConfig) {
                localConfig.url.should.equal('http://testurl.com/ghostly/');

                done();
            }).catch(done);
        });

        it('rejects a fqdn without a scheme', function (done) {
            overrideReadFileConfig({url: 'example.com'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('rejects a hostname without a scheme', function (done) {
            overrideReadFileConfig({url: 'example'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('rejects a hostname with a scheme', function (done) {
            overrideReadFileConfig({url: 'https://example'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('rejects a url with an unsupported scheme', function (done) {
            overrideReadFileConfig({url: 'ftp://example.com'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('rejects a url with a protocol relative scheme', function (done) {
            overrideReadFileConfig({url: '//example.com'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('does not permit the word ghost as a url path', function (done) {
            overrideReadFileConfig({url: 'http://example.com/ghost/'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('does not permit the word ghost to be a component in a url path', function (done) {
            overrideReadFileConfig({url: 'http://example.com/blog/ghost/'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('does not permit the word ghost to be a component in a url path', function (done) {
            overrideReadFileConfig({url: 'http://example.com/ghost/blog/'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('does not permit database config to be falsy', function (done) {
            // replace the config file with invalid data
            overrideReadFileConfig({database: false});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('does not permit database config to be empty', function (done) {
            // replace the config file with invalid data
            overrideReadFileConfig({database: {}});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('requires server to be present', function (done) {
            overrideReadFileConfig({server: false});

            config.load().then(function (localConfig) {
                /*jshint unused:false*/
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('allows server to use a socket', function (done) {
            overrideReadFileConfig({server: {socket: 'test'}});

            config.load().then(function () {
                var socketConfig = config.getSocket();

                socketConfig.should.be.an.Object();
                socketConfig.path.should.equal('test');
                socketConfig.permissions.should.equal('660');

                done();
            }).catch(done);
        });

        it('allows server to use a socket and user-defined permissions', function (done) {
            overrideReadFileConfig({
                server: {
                    socket: {
                        path: 'test',
                        permissions: '666'
                    }
                }
            });

            config.load().then(function () {
                var socketConfig = config.getSocket();

                socketConfig.should.be.an.Object();
                socketConfig.path.should.equal('test');
                socketConfig.permissions.should.equal('666');

                done();
            }).catch(done);
        });

        it('allows server to have a host and a port', function (done) {
            overrideReadFileConfig({server: {host: '127.0.0.1', port: '2368'}});

            config.load().then(function (localConfig) {
                should.exist(localConfig);
                localConfig.server.host.should.equal('127.0.0.1');
                localConfig.server.port.should.equal('2368');

                done();
            }).catch(done);
        });

        it('rejects server if there is a host but no port', function (done) {
            overrideReadFileConfig({server: {host: '127.0.0.1'}});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('rejects server if there is a port but no host', function (done) {
            overrideReadFileConfig({server: {port: '2368'}});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('rejects server if configuration is empty', function (done) {
            overrideReadFileConfig({server: {}});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });
    });

    describe('Check for deprecation messages:', function () {
        var logStub,
            // Can't use afterEach here, because mocha uses console.log to output the checkboxes
            // which we've just stubbed, so we need to restore it before the test ends to see ticks.
            resetEnvironment = function () {
                process.env.NODE_ENV = currentEnv;
            };

        beforeEach(function () {
            logStub = sinon.spy(console, 'log');
            process.env.NODE_ENV = 'development';
        });

        afterEach(function () {
            logStub.restore();
            resetEnvironment();
        });

        it('doesn\'t display warning when deprecated options not set', function () {
            configUtils.config.checkDeprecated();
            logStub.calledOnce.should.be.false();
        });

        it('displays warning when updateCheck exists and is truthy', function () {
            configUtils.set({
                updateCheck: 'foo'
            });
            // Run the test code
            configUtils.config.checkDeprecated();

            logStub.calledOnce.should.be.true();

            logStub.calledWithMatch('updateCheck').should.be.true();
        });

        it('displays warning when updateCheck exists and is falsy', function () {
            configUtils.set({
                updateCheck: false
            });
            // Run the test code
            configUtils.config.checkDeprecated();

            logStub.calledOnce.should.be.true();

            logStub.calledWithMatch('updateCheck').should.be.true();
        });

        it('displays warning when mail.fromaddress exists and is truthy', function () {
            configUtils.set({
                mail: {
                    fromaddress: 'foo'
                }
            });
            // Run the test code
            configUtils.config.checkDeprecated();

            logStub.calledOnce.should.be.true();

            logStub.calledWithMatch('mail.fromaddress').should.be.true();
        });

        it('displays warning when mail.fromaddress exists and is falsy', function () {
            configUtils.set({
                mail: {
                    fromaddress: false
                }
            });
            // Run the test code
            configUtils.config.checkDeprecated();

            logStub.calledOnce.should.be.true();

            logStub.calledWithMatch('mail.fromaddress').should.be.true();
        });

        it('doesn\'t display warning when only part of a deprecated option is set', function () {
            configUtils.set({
                mail: {
                    notfromaddress: 'foo'
                }
            });

            configUtils.config.checkDeprecated();
            logStub.calledOnce.should.be.false();
        });

        it('can not modify the deprecatedItems on the config object', function () {
            configUtils.set({
                deprecatedItems: ['foo']
            });

            configUtils.config.deprecatedItems.should.not.equal(['foo']);
        });
    });
});
