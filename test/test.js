var fs = require('fs');
var macroProcess = require('../macro');

var input = '' + fs.readFileSync(process.argv[2]);
var defines = {
  ABC: false, 
  DEF: true,
  NO: false,
  BIG_DEFINES: 'something',
  DEBUG: true
};

console.log(macroProcess.js(input, defines, {
  filename: process.argv[2]
}));
