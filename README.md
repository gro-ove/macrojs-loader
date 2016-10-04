# MacroJS Loader

Customizable macro preprocessor with inlineable JS for webpack. Could be used for basically everything: JavaScript, CSS, HTML, etc.

### Install

```
$ npm i macrojs-loader --save-dev
```

### Usage

For common conditions, use it like this:

```js
#if DEBUG
  console.log(inputData.detailedDebugDescription());
#elif PRODUCTION
  /* do nothing */
#else
  console.log(inputData.shortDescription());
#endif
```

In webpack configuration, add this module to `preloaders` or `loaders`:

```js
module: {
  preLoaders: [
    {
      test: /\.jsx?$/,
      loader: `macrojs-loader?defines=${path.join(__dirname, 'macros.json')}`,
      include: path.join(__dirname, 'src')
    }
  ],
  …
}
```

And add a configuration json file (`macros.json`):

```json
[ 'DEBUG' ]
```

### More examples

Single-line usage (optional):

```js
var debugMode = #if DEBUG# true #else# false #endif#;
```

HTML-files (use `macrojs-loader?mode=html` to change the mode):

```html
<!DOCTYPE html>
<html>
<head>
  ^if DEBUG
    <title>Example (Debug)</title>
  ^else
    <title>Example</title>
  ^endif

  <!-- single-line usage (optional): -->
  ^if UTF8^ <meta charset="utf-8"> ^endif^

  <!-- ^if example^ comments/strings will be ignored ^endif^ -->
</head>
<body>
</body>
</html>
```

Complex conditions (basically, it’s just JavaScript):

```js
var wasBuiltInMidnight = #if new Date().getHours() == 0# true #else# false #endif#;
```

Multiline conditions (works with curly braces):

```js
var wasBuiltInMidnight = #if {
  var hours = new Date().getHours();
  return hours == 0
}# true #else# false #endif#;
```

And inlineable JavaScript:

```js
var wasBuiltAt = #exec Date.now()#;

#exec {
  return `var listOfFilesNextToJsFile = ${JSON.stringify(fs.readdirSync(__dirname))};`
}

#exec fs.readdirSync(__dirname).filter(x => /incl_.+\.js/.test(x)).map(x => {
  var name = path.basename(x, '.js');
  return `var ${name} = require('./${name}');`
}).join('\n')
```

Also, you can change language-related params:

```js
/* macrojs-custom-html.json */
{
  "macroPrefix": "&",
  "stringQuotes": [ "'", "\"" ],
  "singleLineComment": null,
  "multiLineComment": { start: "<!--", end: "-->" },
  "singleLine": false,
  "tabWidth": 0,
  "trimSingleLine": false
}
```

```js
module: {
  preLoaders: [
    {
      test: /\.jsx?$/,
      loader: `macrojs-loader?defines=${path.join(__dirname, 'macros.json')}&config=${path.join(__dirname, 'macrojs-custom-html.json')}`,
      include: path.join(__dirname, 'src')
    }
  ],
  …
}
```


### License

MIT

