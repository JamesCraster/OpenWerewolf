grawlix
=======
> Make the Internet swear like a cartoon

`grawlix` is a configurable `RegExp`-based profanity filter that swaps out obscene words for [grawlixes](https://en.wiktionary.org/wiki/grawlix) -- long strings of emoticons or typographical symbols often used to represent swearing in comic strips and cartoons. Primarily aimed at George Carlin's ["Seven Dirty Words"](https://en.wikipedia.org/wiki/Seven_dirty_words), the library's default filters have been [rigorously tested](https://github.com/tinwatchman/grawlix/blob/master/spec/filter-spec.js#L412) against potential false positives and [Scunthorpe problems](https://en.wikipedia.org/wiki/Scunthorpe_problem). It's highly extensible, allowing new words and grawlix styles to be easily added as needed.

Please note that, due to the subject matter, the `grawlix` source code may be considered **NSFW/Not Safe For Work**, depending on an individual reader's circumstances. To see the full list of the words the library currently targets, see [this file](https://github.com/tinwatchman/grawlix/blob/master/WORDS.json).

## Installation

```sh
npm install grawlix --save
```

## Usage

```javascript
var grawlix = require('grawlix');
var censored = grawlix(text, { /* options go here */ }); // outputs '%!@*'
```

Alternately, if you prefer not having to pass in options with every call, you can also configure the library's default settings with the `setDefaults` method:

```javascript
grawlix.setDefaults({
  // set default options here
});
// options will apply to every call made after this point
var censored = grawlix(text); // outputs '@$^!#@%@!#'
```

### Options

```javascript
grawlix.setDefaults({
  style: 'ascii',
  randomize: true,
  filters: [],
  allowed: [],
  plugins: []
});
```

For even more options, see the [full API documentation](https://github.com/tinwatchman/grawlix/blob/master/docs/API.md).

##### style

Type: `String` or `Object`<br>
Default: `'ascii'`

What style of grawlix the function should use when replacing curse words. To see the list of available styles, see the [Grawlix Styles](#styles) section below. To learn how to create your own styles, see the [full Styles documentation](https://github.com/tinwatchman/grawlix/blob/master/docs/STYLES.md).

##### randomize

Type: `Boolean`<br>
Default: `true`

Sets whether or not grawlixes should be built by randomly selecting from a list of characters, or taken directly from a map of fixed replacements. Ignored when using a single-character style.

##### filters

Type: `Array`<br>
Default: `[]`

An optional `Array` of objects, representing either new words that should be replaced or configuration options for existing filters. For more information on how to use this property, see [Adding New Filters](#adding_new_filters) below.

##### allowed

Type: `Array`<br>
Default: `[]`

An optional `Array` of strings, representing a whitelist of words that shouldn't be replaced. Passing in a word or list of words that's [targeted by default](https://github.com/tinwatchman/grawlix/blob/master/WORDS.json) will deactivate their associated filters.

For example -- the following code deactivates the filter `grawlix` uses to replace the word 'bastard':

```javascript
var censored = grawlix(text, {
  allowed: [ 'bastard' ]
});
```

##### plugins

Type: `Array`<br>
Default: `[]`

An optional `Array` of plugins to include. See [Using Plugins](#using_plugins) below for more details.

<a name="styles"></a>

## Grawlix Styles

Seven different styles of grawlixes are available within the library by default. The three primary styles are:

+ `'ascii'`: the default style. Generates grawlixes from the following standard typographical symbols: `@!#$%^&*`.
+ `'dingbats'`: Generates grawlixes from this list of Unicode-only symbols: `★☒☎☠☢☣☹♡♢♤♧⚓⚔⚑⚡♯✓☝`.
+ `'unicode'`: Generates grawlixes from this combined list of standard typographical and Unicode-only symbols: `!@#$%★☒☎☠☢☣☹♡♢♤♧⚓⚔⚑⚡`.

In addition, the following 'single-character' styles are also available:

+ `'asterix'`: Replaces targeted words with asterixes, e.g. `*`.
+ `'nextwave'`: Replaces targeted words with skull (`☠`) symbols. Requires Unicode support.
+ `'redacted'`: Replaces targeted words with `█` symbols. Requires Unicode support.
+ `'underscore'`: Replaces targeted words with underscores, e.g. `_`.

To use one of these styles, simply pass in the desired style's name in the `options` object:

```javascript
var censored = grawlix(text, {
  style: 'nextwave'
});
// outputs '☠☠☠☠☠☠'
```

For information on advanced options, including on how to create new grawlix styles, see the [full Styles documentation](https://github.com/tinwatchman/grawlix/blob/master/docs/STYLES.md).

<a name="adding_new_filters"></a>

## Adding New Filters

To ease the process of adapting to new demands (such as targeting obscene words not supported by default, or supporting languages other than English), `grawlix` accepts new filters via the `options` object. Let's say, for example, that you decide you want to prevent your forum users from discussing Unix's [File System Consistency ChecK](https://en.wikipedia.org/wiki/Fsck) tool. You can add a filter targeting the word to the library's default settings like so:

```javascript
grawlix.setDefaults({
  filters: [
    {
      word: 'fsck',
      pattern: /fsck/i
    }
  ]
});
```

For more information on creating and configuring filters, see the [full Filters documentation](https://github.com/tinwatchman/grawlix/blob/master/docs/FILTERS.md).

<a name="using_plugins"></a>

## Using Plugins

Plugins are modules with additional functionality (such as new filters and styles) for `grawlix` that can be easily shared among developers. Here's a running list of the plugins that are currently available:

+ [grawlix-racism](https://www.npmjs.com/package/grawlix-racism): targets racial and ethnic slurs.

To use a plugin, install the module into your project and pass it in as part of your `grawlix` options:

```javascript
var plugin = require('grawlix-example-plugin-module');
grawlix.setDefaults({
  plugins: [
    {
      plugin: plugin,
      options: {
        // plugin-specific options go here
      }
    }
  ]
});
// or alternately
grawlix.loadPlugin(plugin, {
  // plugin-specific options go here
});
```

For more information on plugins (including how to create your own), see the [full Plugin documentation](https://github.com/tinwatchman/grawlix/blob/master/docs/PLUGINS.md).

## Testing

```sh
npm test
```

## Contributing

Forks and pull requests welcome.

Depending on community response, the following areas and/or features could potentially be explored in the future:

- [ ] Default support for more curse words (depending on community needs)
- [ ] Browser support
- [ ] Internationalization / support for languages other than English
- [ ] Regular expression optimization
- [X] Plugin framework
- [X] Improve test coverage for util.js

## Release History

- 1.0.6
  * 100% complete test coverage achieved (as rated by [istanbul](https://www.npmjs.com/package/istanbul).)
  * Added documentation on the [custom Error subclasses](https://github.com/tinwatchman/grawlix/blob/master/docs/ERRORS.md) thrown by the package.
- 1.0.5
  * Switched to using [style objects](https://github.com/tinwatchman/grawlix/blob/master/docs/STYLES.md#style-objects) for consistency.
  * Different styles can now be set on individual filters. [See here](https://github.com/tinwatchman/grawlix/blob/master/docs/FILTERS.md#style) for details.
  * New plugin: [grawlix-racism](https://github.com/tinwatchman/grawlix-racism)
- 1.0.4
  * First draft of plugin framework. Feedback would be appreciated.
- 1.0.3
  * Added `grawlix.isObscene` function as per the suggestion of /u/calsosta on [/r/node](https://www.reddit.com/r/node/).
  * Removed tests from package as per [issue #1](https://github.com/tinwatchman/grawlix/issues/1).
- 1.0.2
  * Added digits to separator checks in filter regex patterns.

## Credits and Licensing

Created by [Jon Stout](http://www.jonstout.net). Licensed under [the MIT license](http://opensource.org/licenses/MIT).
