var _fs, _path;

function macro(config, source, defines, options){
  if (config == null) config = {};
  if (config.macroPrefix && config.macroPrefix.length != 1){
    throw new Error('config.macroPrefix has invalid length');
  }

  var context = {};
  var macroPrefix = config.macroPrefix[0] || '#';
  var singleLine = !!config.singleLine; // allows to use macros like #if A# … #endif#
  var stringQuotes = config.stringQuotes || [ '\'', '"', '`' ];
  var tabWidth = config.tabWidth == null ? 2 : (config.tabWidth || 0);
  var tabSpaces = new Array(tabWidth + 1).join(' ');
  var trimSingleLine = config.trimSingleLine == null ? true : !!config.trimSingleLine;

  var singleLineComment = config.singleLineComment === false ? null : 
      (config.singleLineComment || '//');
  var multiLineCommentStart = config.multiLineComment === false ? null : 
      (config.multiLineComment && config.multiLineComment.start || '/*');
  var multiLineCommentEnd = config.multiLineComment === false ? null : 
      (config.multiLineComment && config.multiLineComment.end || '*/');

  if (defines == null) defines = {};
  if (options == null) options = {};
  if (options.baseModules == null) options.baseModules = true;
  if (options.baseModules || options.filename){
    _fs = require('fs');
    _path = require('path');
  }

  options.filename = options.filename ? _path.resolve('' + options.filename) : null;

  function readString(source, index){
    var opening = source[index];
    for (var i = index + 1; i < source.length; i++){
      var c = source[i];
      if (c == opening) break;
      else if (c == '\\') i++;
    }
    return i;
  }

  function readLine(source, index){
    return source.indexOf('\n', index + 2);
  }

  function readCommentary(source, index){
    var end = source.indexOf(multiLineCommentEnd, index + multiLineCommentStart.length);
    return end === -1 ? source.length : end + multiLineCommentEnd.length;
  }

  function readJsCommentary(source, index){
    var end = source.indexOf('*/', index + 2);
    return end === -1 ? source.length : end + 2;
  }

  function readJsBrakets(source, index){
    var n = 0;
    for (var i = index + 1; i < source.length; i++){
      switch (source[i]){
        case '{':
          i = readJsBrakets(source, i);
          break;

        case '/':
          var n = source[i + 1];
          if (n === '/'){
            i = readLine(source, i);
          } else if (n === '*'){
            i = readJsCommentary(source, i);
            continue;
          }
          break;

        case '\'':
        case '"':
        case '`':
          i = readString(source, i);
          break;

        case '}':
          return i;
      }
    }

    return i;
  }

  function readToken(source, index){
    var token = null;
    for (var i = index + 1; i <= source.length; i++){
      var c = source[i];
      if (c == '{'){
        i = readJsBrakets(source, i);
      } else if (c == null || c == '\n' || singleLine && c == macroPrefix){
        token = source.substring(index, i).match(/^.(?:(if|elif|exec)[ \t]+([\s\S]+)|(else|endif))$/);
        i++;
        break;
      }
    }

    if (token){
      var key = token[2] != null ? token[1] : token[3];
      return {
        key: key,
        arg: token[2],
        start: index,
        singleLine: c == macroPrefix,
        end: key == 'exec' && c == '\n' ? i - 1 : i
      };
    }

    return null;
  }

  function tokenArg(token){
    var body = token.arg.trim();
    var args = options.baseModules ? [ 'fs', 'path' ] : [];
    var call = options.baseModules ? [ _fs, _path ] : [];

    var dirname = null;
    if (options.filename){
      var dirname = options.filename ? _path.dirname(options.filename) : null;
      args.push('__dirname');
      call.push(dirname);
      args.push('__filename');
      call.push(options.filename);
    }

    for (var n in defines){
      if (defines.hasOwnProperty(n)){
        args.push(n);
        call.push(defines[n]);
      }
    }

    body.replace(/\b(?!JSON)[A-Z_][A-Z0-9_]+\b/g, x => {
      if (!defines.hasOwnProperty(x)){
        args.push(x);
        call.push(undefined);
      }
    });

    args.push(body[0] == '{' || body[body.length - 1] == '}' ? body : 'return ' + body);

    if (dirname){
      var original = process.cwd();
      try {
        process.chdir(dirname);
        return Function.apply(this, args).apply(context, call);
      } finally {
        process.chdir(original);
      }
    } else {
      return Function.apply(this, args).apply(context, call);
    }
  }

  function deTab(piece, singleLine){
    if (trimSingleLine && singleLine) piece = piece.trim();
    if (!tabWidth) return piece;
    if (piece.substr(0, tabWidth) == tabSpaces) piece = piece.substr(tabWidth);
    return piece.replace('\n' + tabSpaces, '\n');
  }

  function readBlock(source, index){
    var start = index;
    var result = '';
    var previousCondition = null;

    for (var i = index; i < source.length; i++){
      var c = source[i];

      if (stringQuotes.indexOf(c) !== -1){
        i = readString(source, i);
        continue;
      } else if (c == singleLineComment[0] && 
          source.substr(i, singleLineComment.length) === singleLineComment){
        i = readLine(source, i);
      } else if (c == multiLineCommentStart[0] && 
          source.substr(i, multiLineCommentStart.length) === multiLineCommentStart){
        i = readCommentary(source, i);
      } else if (c == macroPrefix){
        var token = readToken(source, i);
        // console.log('token: ' + JSON.stringify(token))
        if (token == null) continue;

        var behind = source.substring(start, i);
        result += token.singleLine ? behind : behind.replace(/ +$/, '');

        switch (token.key){
          case 'endif':
          case 'else':
          case 'elif':
            if (index == 0) continue;
            return {
              result: result,
              ended: token
            };
            break;

          case 'exec':
            result += tokenArg(token);
            start = token.end;
            break;

          case 'if':
            var previousCondition = false;
            while (true){
              var condition;
              switch (token.key){
                case 'if':
                  condition = tokenArg(token);
                  break;
                case 'elif':
                  condition = !previousCondition && tokenArg(token);
                  break;
                case 'else':
                  condition = !previousCondition;
                  break;
              }

              var inside = readBlock(source, token.end);
              // console.log('inside: ' + JSON.stringify(inside) + ', condition: ' + condition);

              if (condition){
                result += deTab(inside.result, token.singleLine);
              }

              if (!inside.ended){
                return { result: result, ended: null };
              }

              if (inside.ended.key == 'endif'){
                start = inside.ended.end;
                i = inside.ended.end - 1;
                break;
              } else {
                previousCondition = condition || previousCondition;
                token = inside.ended;
              }
            }
            break;

          default:
            start = i;
        }
      }
    }

    result += source.substring(start, i);
    return { result: result, ended: null };
  }

  var data = readBlock(source, 0);
  return data.result;
}

macro.jsConfig = {
  macroPrefix: '#',
  stringQuotes: [ '\'', '"', '`' ],
  singleLineComment: '//',
  multiLineComment: { start: '/*', end: '*/' },
  singleLine: true,
  tabWidth: 2,
  trimSingleLine: true
};

macro.cssConfig = {
  macroPrefix: '@',
  stringQuotes: [ '\'', '"' ],
  singleLineComment: '//',
  multiLineComment: { start: '/*', end: '*/' },
  singleLine: true,
  tabWidth: 2,
  trimSingleLine: true
};

macro.htmlConfig = {
  macroPrefix: '^',
  stringQuotes: [ '\'', '"' ],
  singleLineComment: null,
  multiLineComment: { start: '<!--', end: '-->' },
  singleLine: true,
  tabWidth: 2,
  trimSingleLine: true
};

macro.js = macro.bind(this, macro.jsConfig);
macro.css = macro.bind(this, macro.cssConfig);
macro.html = macro.bind(this, macro.htmlConfig);

module.exports = macro;