'use strict';

const _ = require('underscore');

/**
 * Enum of recognized default styles
 * @type {Object}
 */
const Style = {
  ASCII: 'ascii',
  ASTERIX: 'asterix',
  DINGBATS: 'dingbats',
  NEXTWAVE: 'nextwave',
  REDACTED: 'redacted',
  UNICODE: 'unicode',
  UNDERSCORE: 'underscore'
};

/**
 * Class representing a style of grawlix
 * @param {String}          name                  Name of style
 * @param {Object}          options               Options object. See #configure 
 *                                                method for more details.
 * @param {String|Function} options.randomChars   String of characters to 
 *                                                generate a random grawlix 
 *                                                from; or a function that will 
 *                                                generate a random grawlix of a 
 *                                                given length.
 * @param {String}          options.char          Single character for a single 
 *                                                character style.
 * @param {Object}          options.fixed         Map of fixed replacement 
 *                                                strings to draw on when 
 *                                                replacing content
 * @param {Boolean}         options.allowOverride Whether or not to allow this 
 *                                                style to be overridden by 
 *                                                filter properties
 */
const GrawlixStyle = function(name, options) {
  this.name = name;
  this.chars = null;
  this.fixed = {};
  this.isOverrideAllowed = true;

  /**
   * Returns whether or not the style is valid
   * @return {Boolean}
   */
  this.isValid = function() {
    return (
      _.isString(this.name) && !_.isEmpty(this.name) && 
      (
        (_.isString(this.chars) && !_.isEmpty(this.chars)) ||
        _.isFunction(this.chars) ||
        (!_.isEmpty(this.fixed) && _.keys(this.fixed).length > 0)
      )
    );
  };

  /**
   * Returns whether or not this style supports random grawlix generation
   * @return {Boolean}
   */
  this.canRandomize = function() {
    return (_.isFunction(this.chars) || 
           (_.isString(this.chars) && this.chars.length > 1));
  };

  /**
   * Generates a random grawlix (if supported)
   * @param  {Number} len Length of grawlix
   * @return {String}     
   */
  this.getRandomGrawlix = function(len) {
    if (!this.canRandomize()) {
      throw new GrawlixStyleError({
        msg: 'Random grawlixes not supported',
        style: this,
        styleName: this.name
      });
    }
    if (_.isFunction(this.chars)) {
      return this.chars(len);
    }
    // if instead have a string of characters to draw randomly from
    var result = [];
    var char;
    var prev;
    while (result.length < len) {
      char = this.chars.charAt(_.random(this.chars.length-1));
      // make sure not to repeat characters
      if (char === prev) {
        continue;
      // make sure never to end on a !
      } else if (char === '!' && result.length === (len-1)) {
        continue;
      }
      // add to result, remember as prev character
      result.push(char);
      prev = char;
    }
    return result.join('');
  };

  /**
   * Repeats the same character over and over again to produce a string of the 
   * requested length
   * @param  {Number} len Length of string to return
   * @return {String}
   */
  this.getFillGrawlix = function(len) {
    var char;
    if (this.chars.length > 1) {
      char = this.chars.charAt(0);
    } else {
      char = this.chars;
    }
    var fill = [];
    for (var i=0; i<len; i++) {
      fill.push(char);
    }
    return fill.join('');
  };

  /**
   * Returns whether or not style has a fixed replacement for the given word
   * @param  {String}  word Word
   * @return {Boolean}      True if replacement found, false otherwise
   */
  this.hasFixed = function(word) {
    return (_.has(this.fixed, word) && !_.isEmpty(this.fixed[word]));
  };

  /**
   * Gets a fixed replacement string from the map
   * @param  {String} word Word
   * @return {String}      Replacement string
   */
  this.getFixed = function(word) {
    return this.fixed[word];
  };

  /**
   * Adds characters to the string of random characters the style uses
   * @param  {String|Array} newChars Characters to add
   * @return {Number}                Number of characters added
   */
  this.addChars = function(newChars) {
    var self = this;
    var adds = _.isArray(newChars) ? newChars : newChars.split('');
    var added = 0;
    _.each(adds, function(newChar) {
      // only add char if it isn't already part of the collection
      if (self.chars.indexOf(newChar) === -1) {
        self.chars += newChar;
        added++;
      }
    });
    return added;
  };

  /**
   * Removes characters from the string of random characters used by the style
   * @param  {String|Array} remove Characters to remove
   * @return {Number}              Number of characters removed
   */
  this.removeChars = function(remove) {
    var chars = this.chars.split('');
    var notRemoved = _.filter(chars, function(char) {
      return (remove.indexOf(char) === -1);
    });
    this.chars = notRemoved.join('');
    return (chars.length - notRemoved.length);
  };

  /**
   * Replaces characters in the string of random characters used by the style
   * @param  {Object} replaceMap Map of characters to replace, in the form: 
   *                             { "charToReplace": "replacement" }
   * @return {Number}            Number of characters replaced
   */
  this.replaceChars = function(replaceMap) {
    var chars = this.chars.split('');
    var replaceCount = 0;
    var replaced = _.map(chars, function(char) {
      if (_.has(replaceMap, char) && _.isString(replaceMap[char])) {
        replaceCount++;
        return replaceMap[char];
      }
      return char;
    });
    this.chars = replaced.join('');
    return replaceCount;
  };

  /**
   * Configures the style from the given options object
   * @param  {Object} options Options object
   * @param  {String}                 options.char                Single character to replace content with (if a single 
   *                                                              character style)
   * @param  {String|Function|Object} options.randomChars         Either a string of characters or a function used to 
   *                                                              generate random grawlixes to replace content; or a 
   *                                                              object used to configure an existing style's character 
   *                                                              string.
   * @param  {String|Array}           options.randomChars.add     Characters to add to a style's string of random 
   *                                                              characters
   * @param  {String|Array}           options.randomChars.remove  Characters to remove from a style's string of random 
   *                                                              characters
   * @param  {Object}                 options.randomChars.replace Map of characters to replace within a style's string 
   *                                                              of random characters
   * @param  {Object}                 options.fixed               Map of fixed replacement strings to draw on when 
   *                                                              replacing content
   * @param  {Boolean}                options.allowOverride       Whether or not to allow specific styles set on filters 
   *                                                              to override this one when instance is set as main 
   *                                                              style 
   * @return {void}
   */
  this.configure = function(options) {
    // get random characters
    if (_.has(options, 'char') && _.isString(options.char)) {
      this.chars = options.char;
    } else if (_.has(options, 'randomChars') && 
              (_.isString(options.randomChars) || 
               _.isFunction(options.randomChars))) {
      this.chars = options.randomChars;
    }
    // check for randomChar adds, removes or replaces
    if (_.isString(this.chars) && _.has(options, 'randomChars') && 
        _.isObject(options.randomChars)) {

      // add characters
      if (_.has(options.randomChars, 'add')) {
        this.addChars(options.randomChars.add);
      }

      // remove characters
      if (_.has(options.randomChars, 'remove')) {
        this.removeChars(options.randomChars.remove);
      }

      // replace characters
      if (_.has(options.randomChars, 'replace') && 
          _.isObject(options.randomChars.replace)) {
        this.replaceChars(options.randomChars.replace);
      }
    }
    // get fixed replacements (if any)
    if (_.has(options, 'fixed') && _.isObject(options.fixed)) {
      _.each(options.fixed, function(val, word) {
        if (_.has(this.fixed, word) && (val === false || !_.isString(val))) {
          delete this.fixed[word];
        } else {
          this.fixed[word] = val;
        }
      }, this);
    }
    // get isOverrideAllowed
    if (_.has(options, 'allowOverride') && _.isBoolean(options.allowOverride)) {
      this.isOverrideAllowed = options.allowOverride;
    }
  };

  /**
   * Returns an exact duplicate of the GrawlixStyle instance
   * @return {GrawlixStyle}
   */
  this.clone = function() {
    var clone = new GrawlixStyle(this.name);
    clone.chars = this.chars;
    clone.fixed = _.clone(this.fixed);
    clone.isOverrideAllowed = this.isOverrideAllowed;
    return clone;
  };

  // configure style
  if (!_.isUndefined(options)) {
    this.configure(options);
  }
};
GrawlixStyle.prototype = {};

/**
 * Custom Error subclass for grawlix style exceptions
 * @param {Object} args           Parameters object
 * @param {String} args.msg       Error message. Required.
 * @param {String} args.message   Alias for args.msg
 * @param {Object} args.style     Problematic style object or GrawlixStyle 
 *                                instance. Optional.
 * @param {String} args.styleName Name of problematic object. Optional.
 * @param {Object} args.plugin    Source plugin (if applicable.) Optional.
 * @param {Error}  args.trace     New Error object to take stack trace from. 
 *                                Optional.
 */
const GrawlixStyleError = function(args) {
  this.name = 'GrawlixStyleError';
  this.styleName = _.has(args, 'styleName') ? args.styleName : null;
  this.style = _.has(args, 'style') ? args.style : null;
  this.plugin = _.has(args, 'plugin') ? args.plugin : null;
  if (_.has(args, 'trace') && args.trace instanceof Error) {
    this.stack = args.trace.stack;
  } else {
    this.stack = (new Error()).stack;
  }
  // construct message
  var msg;
  if (_.has(args, 'msg')) {
    msg = args.msg;
  } else if (_.has(args, 'message')) {
    msg = args.message;
  } else {
    msg = args;
  }
  if (this.styleName !== null) {
    this.message = '[style ' + this.styleName + '] ' + msg; 
  } else if (this.style !== null && _.has(this.style, 'name')) {
    this.styleName = this.style.name;
    this.message = '[style ' + this.style.name + '] ' + msg;
  } else {
    this.message = msg;
  }
};
GrawlixStyleError.prototype = Object.create(Error.prototype);
GrawlixStyleError.prototype.constructor = GrawlixStyleError;

/**
 * GrawlixStyle factory function. Converts style object to GrawlixStyle.
 * @param  {Object}  obj               Style object with parameters
 * @param  {String}  obj.name          Style name. Required.
 * @param  {String}  obj.char          See GrawlixStyle#configure
 * @param  {*}       obj.randomChars   See GrawlixStyle#configure
 * @param  {Object}  obj.fixed         See GrawlixStyle#configure
 * @param  {Boolean} obj.allowOverride See GrawlixStyle#configure
 * @return {GrawlixStyle}              GrawlixStyle instance
 */
const toGrawlixStyle = function(obj) {
  if (!_.has(obj, 'name') || !_.isString(obj.name) || _.isEmpty(obj.name)) {
    throw new GrawlixStyleError({
      msg: 'name parameter is required',
      style: obj,
      trace: new Error()
    });
  }
  if (!_.has(obj,'char') && !_.has(obj,'randomChars') && !_.has(obj,'fixed')) {
    throw new GrawlixStyleError({
      msg: 'char, randomChars or fixed parameter required',
      style: obj,
      trace: new Error()
    });
  }
  return new GrawlixStyle(obj.name, obj);
};

/**
 * Default style configurations
 * @type {Array}
 */
const Styles = [
  // default style
  new GrawlixStyle(Style.ASCII, {
    randomChars: '@!#$%^&*',
    fixed: {
      fuck: '%!&#',
      motherfuck: '%*^##*%!&#',
      motherfucker: '%*^##*%!&##&',
      shit: '$$#!%',
      dick: '%!&#',
      piss: '&!$$$$', // note: due to how String.replace works, '$' must be escaped by repeating them twice. '$$' in a fixed replacement string will render as a single '$'.
      cunt: '#^&%',
      cocksuck: '#*#%$$!#%',
      cocksucker: '#*#%$$!#%#&',
      ass: '@**',
      asses: '@**#*',
      asshole: '@**#%!&',
      assholes: '@**#%!&*',
      dumbass: '@**', // note: due to the particular way this filter works, only 'ass' is replaced by this string. The 'dumb' part will be taken from the original string.
      bastard: '%@$$%@*#',
      bitch: '%!#*%',
      tit: '%!%',
      tits: '%!%$$',
      titty: '%!%%^',
      tittie: '%!%%!#',
      titties: '%!%%!#$$'
    }
  }),
  // dingbats (unicode-only) style
  new GrawlixStyle(Style.DINGBATS, {
    randomChars: '★☒☎☠☢☣☹♡♢♤♧⚓⚔⚑⚡♯✓☝',
    fixed: {
      fuck: '⚑☠♧⚔',
      motherfuck: '★☹⚓♯⚡☢⚑☠♧⚔',
      motherfucker: '★☹⚓♯⚡☢⚑☠♧⚔⚡☢',
      shit: '☠♯☝⚓',
      dick: '♢☝♧⚔',
      piss: '☣☝☠☠',
      cunt: '♧♡⚔⚓',
      cocksuck: '♧☹♧⚔☠♡♧⚔',
      cocksucker: '♧☹♧⚔☠♡♧⚔⚡☢',
      ass: '☹☠☠',
      asses: '☹☠☠♯☠',
      asshole: '☹☠☠♯☢✓⚡',
      assholes: '☹☠☠♯☢✓⚡☠',
      dumbass: '☹☠☠',
      bastard: '☣☹☠⚓@☢♢',
      bitch: '☣☝⚓♧♯',
      tit: '⚓☝⚓',
      tits: '⚓☝⚓☠',
      titty: '⚓☝⚓⚓⚔',
      tittie: '⚓☝⚓⚓☝♯',
      titties: '⚓☝⚓⚓☝♯☠'
    }
  }),
  // unicode style
  new GrawlixStyle(Style.UNICODE, {
    randomChars: '!@#$%★☒☎☠☢☣☹♡♢♤♧⚓⚔⚑⚡',
    fixed: {
      fuck: '⚑☠♧⚔',
      motherfuck: '★☹⚓#⚡☢⚑☠♧⚔',
      motherfucker: '★☹⚓#⚡☢⚑☠♧⚔⚡☢',
      shit: '$$#!⚓',
      dick: '♢!♧⚔',
      piss: '☣!$$$$',
      cunt: '♧♡⚔⚓',
      cocksuck: '♧☹♧⚔$$♡♧⚔',
      cocksucker: '♧☹♧⚔$$♡♧⚔⚡☢',
      ass: '@$$$$',
      asses: '@$$$$#$$',
      asshole: '@$$$$#☢!⚡',
      assholes: '@$$$$#☢!⚡$$',
      dumbass: '@$$$$',
      bastard: '☣@$$⚓@☢♢',
      bitch: '☣!⚓♧#',
      tit: '⚓!⚓',
      tits: '⚓!⚓$$',
      titty: '⚓!⚓⚓⚔',
      tittie: '⚓!⚓⚓!#',
      titties: '⚓!⚓⚓!#$$'
    }
  }),
  // single-character styles
  new GrawlixStyle(Style.ASTERIX, { char: '*' }),
  new GrawlixStyle(Style.NEXTWAVE, { char: '☠' }),
  new GrawlixStyle(Style.REDACTED, { char: '█' }),
  new GrawlixStyle(Style.UNDERSCORE, { char: '_' })
];

module.exports = {
  'styles': Styles,
  'Style': Style,
  'GrawlixStyle': GrawlixStyle,
  'GrawlixStyleError': GrawlixStyleError,
  'toGrawlixStyle': toGrawlixStyle
};
