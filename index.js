const util = require('util');
const debug = require('debug');
const axios = require('axios');
const { authenticator } = require('otplib');
const crypto = require('crypto');
const diff = require('recursive-deep-diff');

const algorithm = 'aes-128-cbc';

const log = debug('rest-session-store:log');
log.error = debug('rest-session-store:error');
log.debug = debug('rest-session-store:debug');

module.exports = function(session) {
    function RestSessionStore(options) {
        log('init');
        if (!options || !options.url || !options.secret) {
            log.error('incomplete config');
            throw 'incomplete config';
        }
        this.options = options;
        this.iv = crypto.createHash('sha1').update(options.secret).digest('hex').substr(0, 16);
        this.password = crypto.createHash('sha256').update(options.secret).digest('hex').substr(0, 16);
    }

    RestSessionStore.prototype.all = function(cb) {
        log('all');
        this.request({method: 'GET'})
            .then(data => {
                Object.values(data).forEach(s => s.ORIGINAL = s);
                cb(null, data);
            }).catch(cb);
    }

    RestSessionStore.prototype.destroy = function(url, cb) {
        log('destroy', url);
        this.request({
            url,
            method: 'DELETE'
        }).then(cb)
        .catch(cb);
    }

    RestSessionStore.prototype.clear = function(cb) {
        log('clear');
        this.request({method: 'DELETE'})
            .then(cb)
            .catch(cb);
    }

    RestSessionStore.prototype.length = function(cb) {
        log('length');
        this.all((err, all) => cb(err, err || Object.keys(all).length));
    }

    RestSessionStore.prototype.get = function(url, cb) {
        log('get', url);
        this.request({
            url,
            method: 'GET',
        }).then(data => {
            log.debug('get', data);
            data.ORIGINAL = data;
            cb(null, data);
        }).catch(cb);
    }

    RestSessionStore.prototype.set = function(url, session, cb) {
        log('set', url);
        log.debug('set', session);
        const _orig = session.ORIGINAL;
        delete session.ORIGINAL;
        this.request({
            url,
            method: 'POST',
            data: {next: encrypt(JSON.stringify(diff(_orig, session), (_, v) => v === undefined ? '__undefined' : v))}
        }).then(cb)
        .catch(cb);
    }

    RestSessionStore.prototype.request = function(opts) {
        return axios({
            baseUrl: this.options.url,
            url: '/',
            params: {otp: authenticator.generate(this.options.secret)},
            ...opts
        }).then(({data}) => data && JSON.parse(this.decrypt(data)));
    }
    
    RestSessionStore.prototype.encrypt = function(text) {
        var cipher = crypto.createCipheriv(algorithm, this.password, this.iv);
        var crypted = cipher.update(text, 'utf8', 'base64');
        crypted += cipher.final('base64');
        return crypted;
    }

    RestSessionStore.prototype.decrypt = function (text) {
        var decipher = crypto.createDecipheriv(algorithm, this.password, this.iv);
        var dec = decipher.update(text, 'base64', 'utf8');
        dec += decipher.final('utf8');
        return dec;
    }

    util.inherits(RestSessionStore, session.Store);
   
    return RestSessionStore;
};
