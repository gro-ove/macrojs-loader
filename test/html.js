var fs = require('fs');
var macroProcess = require('../macro');

var input = '' + fs.readFileSync(process.argv[2]);
console.log(macroProcess.html(input, null, {
  filename: process.argv[2]
}));
