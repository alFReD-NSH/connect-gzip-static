var send = require('send');
var connect = require('connect');
var debug = require('debug')('connect:gzip-static');
var utils = connect.utils;
var fs = require('fs');
var path = require('path');
var mime = send.mime;


function setHeader(res, path) {
  var type = mime.lookup(path);
  var charset = mime.charsets.lookup(type);

  debug('content-type %s', type);
  res.setHeader('Content-Type', type + (charset ? '; charset=' + charset : ''));
  res.setHeader('Content-Encoding', 'gzip');
  res.setHeader('Vary', 'Accept-Encoding');
}

module.exports = function(root, options) {
  var static;

  options = options || {};
  static = connect.static(root, options);

  return function gzipStatic(req, res, next) {
    var acceptEncoding, passToStatic, name = {};

    passToStatic = static.bind(this, req, res, next);

    acceptEncoding = req.headers['accept-encoding'] || '';
    if (!~acceptEncoding.indexOf('gzip')) {
      debug('Passing %s', req.url);
      return passToStatic();
    }

    name.orig = utils.parseUrl(req).pathname;
    name.gz = name.orig + '.gz';
    name.full = path.join(root, name.gz);

    fs.stat(name.full, function(err, stat) {
      var exists = !err && stat.isFile();
      if (!exists) {
        debug('Passing %s', req.url);
        return passToStatic();
      }
      debug('Sending %s', name.full);
      setHeader(res, name.orig);
      send(req, name.gz)
        .maxage(options.maxAge || 0)
        .root(root)
        .hidden(options.hidden)
        .on('error', next)
        .pipe(res);
    });
  };
};