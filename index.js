var fs = require('fs');
var path = require('path');
var macro = require('./macro');
var loaderUtils = require('loader-utils');

function readDefines(filename){
  var data = JSON.parse(fs.readFileSync(filename));
  if (Array.isArray(data)){
    var result = {};
    for (var i = 0; i < data.length; i++){
      result[data[i]] = true;
    }
    return result;
  } else if (typeof data === 'object') {
    return data || {};
  } else {
    return {};
  }
}

module.exports = function(content) {
  this.cacheable && this.cacheable();

  var query = loaderUtils.parseQuery(this.query);
  var params = {
    mode: null,
    filename: this.resourcePath,
    prefix: '#'
  };

  for (var n in query){
    if (query.hasOwnProperty(n) && n !== 'defines'){
      params[n] == query[n];
    }
  }

  var defines = null;
  if (query.defines){
    try {
      defines = readDefines(query.defines);
    } catch(err) {
      throw new Error('Cannot read defines: ' + err);
    }
  }

  var config = null;
  if (query.config){
    try {
      config = JSON.parse(fs.readFileSync(query.config));
    } catch(err) {
      throw new Error('Cannot read defines: ' + err);
    }
  }

  return config ?
      macro(config, content, defines || {}, params) :
      macro[params.mode || 'js'](content, defines || {}, params);
};
