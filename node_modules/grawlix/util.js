'use strict';

const _ = require('underscore');

const defaultFilters = require('./filters').filters;
const defaultStyles = require('./styles').styles;
const FilterSort = require('./filters').FilterSort;
const GrawlixFilter = require('./filters').GrawlixFilter;
const toGrawlixFilter = require('./filters').toGrawlixFilter;
const GrawlixStyle = require('./styles').GrawlixStyle;
const toGrawlixStyle = require('./styles').toGrawlixStyle;
const GrawlixStyleError = require('./styles').GrawlixStyleError;
const GrawlixPlugin = require('./plugin').GrawlixPlugin;
const GrawlixPluginError = require('./plugin').GrawlixPluginError;

/**
 * Parse grawlix options
 * @param  {Object}          options  Options object. See grawlix.js#grawlix for 
 *                                    details.
 * @param  {Object}          defaults Default options. Optional.
 * @return {GrawlixSettings}
 */
exports.parseOptions = function(options, defaults) {
  if (!_.isUndefined(defaults)) {
    _.defaults(options, defaults);
  }
  // get settings
  var settings = new GrawlixSettings();
  settings.isRandom = options.randomize;
  // load default filters
  _.each(defaultFilters, function(filter) {
    // check to see if word is on whitelist
    var isAllowed = _.contains(options.allowed, filter.word);
    // check to see if options has a replacement filter
    var isReplaced = _.some(options.filters, function(optFilter) {
      return (
        _.has(optFilter, 'word') && 
        optFilter.word === filter.word &&
        _.has(optFilter, 'pattern')
      );
    });
    if (!isAllowed && !isReplaced) {
      settings.filters.push( filter.clone() );
    }
  });
  // load default styles
  _.each(defaultStyles, function(style) {
    settings.styles.push( style.clone() );
  });
  // load plugins (if we have any)
  if (options.plugins.length > 0) {
    _.each(options.plugins, function(pluginInfo) {
      loadPlugin(settings, pluginInfo, options);
    });
  }
  // add option filters (if any) and/or configure filter options
  loadFilters(settings, options.filters, options.allowed);
  // sort filters
  settings.filters.sort(FilterSort);
  // add option styles / configure style options
  loadStyles(settings, options.styles);
  // get main style
  if (!_.has(options, 'style') || options.style === null) {
    throw new GrawlixStyleError({
      msg: 'main style not found',
      style: options.style,
      trace: new Error()
    });
  }
  // try to find style
  var style;
  if (_.has(options.style, 'name')) {
    // if options.style is a style object
    style = _.findWhere(settings.styles, { name: options.style.name });
    if (!_.isUndefined(style)) {
      // if style is found, configure style with object
      style.configure(options.style);
    } else {
      // if style not found, try to create a new style with object
      style = toGrawlixStyle(options.style);
    }
  } else {
    // try to treat options.style as string
    style = _.findWhere(settings.styles, { name: options.style });
  }
  if (style instanceof GrawlixStyle) {
    settings.style = style;
  } else {
    throw new GrawlixStyleError({
      msg: 'main style not found',
      styleName: options.style,
      style: options.style,
      trace: new Error()
    });
  }
  // return settings
  return settings;
};

/**
 * GrawlixSettings class
 * Class for settings object returned by parseOptions
 */
var GrawlixSettings = function() {
  this.isRandom = true;
  this.filters = [];
  this.style = null;
  this.styles = [];
  this.loadedPlugins = [];
  this.loadedModules = [];
};
GrawlixSettings.prototype = {};
exports.GrawlixSettings = GrawlixSettings;

/**
 * Loads the given plugin into the given GrawlixSettings object
 * @param  {GrawlixSettings} settings   GrawlixSettings object
 * @param  {Object|Function} pluginInfo Either a factory function, a 
 *                                      GrawlixPlugin object, or an object 
 *                                      wrapping a factory function or 
 *                                      GrawlixPlugin with additional 
 *                                      plugin-specific config options
 * @param  {Object}          options    Main grawlix options object
 * @return {GrawlixSettings}            Settings object with plugin loaded
 */
var loadPlugin = function(settings, pluginInfo, options) {
  // resolve plugin and plugin options
  var plugin;
  if (_.has(pluginInfo, 'plugin')) {
    plugin = pluginInfo.plugin;
  } else if (_.has(pluginInfo, 'module')) {
    // make sure we don't load the same module twice
    if (_.contains(settings.loadedModules, pluginInfo.module)) {
      return settings;
    }
    // try to load module
    try {
      plugin = require(pluginInfo.module);
    } catch (err) {
      throw new GrawlixPluginError({
        msg: "cannot find module '" + pluginInfo.module + "'",
        plugin: pluginInfo,
        trace: new Error() 
      });
    }
    settings.loadedModules.push(pluginInfo.module);
  } else {
    plugin = pluginInfo;
  }
  var pluginOpts = _.has(pluginInfo, 'options') ? pluginInfo.options : {};
  // instantiate plugin if necessary
  if (_.isFunction(plugin)) {
    plugin = plugin(pluginOpts, options);
  }
  // validate plugin
  if (!(plugin instanceof GrawlixPlugin)) {
    throw new GrawlixPluginError({
      msg: 'invalid plugin',
      plugin: pluginInfo
    });
  } else if (plugin.name === null || _.isEmpty(plugin.name)) {
    throw new GrawlixPluginError({
      msg: 'invalid plugin - name property not provided',
      plugin: pluginInfo
    });
  } else if (_.contains(settings.loadedPlugins, plugin.name)) {
    // don't load the same plugin twice
    return settings;
  }
  // initialize plugin
  plugin.init(pluginOpts);
  // load filters
  if (!_.isUndefined(plugin.filters) && _.isArray(plugin.filters)) {
    try {
      loadFilters(settings, plugin.filters, options.allowed);
    } catch (err) {
      err.plugin = pluginInfo;
      throw err;
    }
  }
  // load styles
  if (!_.isUndefined(plugin.styles) && _.isArray(plugin.styles)) {
    try {
      loadStyles(settings, plugin.styles);
    } catch (err) {
      err.plugin = pluginInfo;
      throw err;
    }
  }
  // add name to loaded plugins
  settings.loadedPlugins.push(plugin.name);
  // return
  return settings;
};
exports.loadPlugin = loadPlugin;

/**
 * Loads an array of filter objects into the GrawlixSettings object
 * @param  {GrawlixSettings} settings GrawlixSettings object
 * @param  {Array}           filters  Array of filter objects
 * @param  {Array}           allowed  Whitelist of words to ignore
 * @return {GrawlixSettings}          Settings objects with filters added
 */
var loadFilters = function(settings, filters, allowed) {
  if (filters.length > 0) {
    _.each(filters, function(obj) {
      if (!_.has(obj, 'word')) {
        return;
      }
      if (!_.has(obj, 'pattern')) {
        // configure existing filter options
        var filter = _.findWhere(settings.filters, { word: obj.word });
        if (!_.isUndefined(filter)) {
          filter.configure(obj);
        }
      } else if (!_.contains(allowed, obj.word)) {
        // if filter word isn't whitelisted, add as new GrawlixFilter
        settings.filters.push( toGrawlixFilter(obj) );
      }
    });
  }
  return settings;
};
exports.loadFilters = loadFilters;

/**
 * Loads an array of style objects into the given GrawlixSettings instance
 * @param  {GrawlixSettings} settings GrawlixSettings object
 * @param  {Array}           styles   Array of style objects
 * @return {GrawlixSettings}
 */
var loadStyles = function(settings, styles) {
  if (_.isArray(styles) && styles.length > 0) {
    _.each(styles, function(obj) {
      if (!_.has(obj, 'name')) {
        return;
      }
      var style = _.findWhere(settings.styles, { name: obj.name });
      if (!_.isUndefined(style)) {
        style.configure(obj);
      } else {
        settings.styles.push( toGrawlixStyle(obj) );
      }
    });
  }
  return settings;
};
exports.loadStyles = loadStyles;

/**
 * Returns whether or not the given plugin has been added to the given options 
 * object.
 * @param  {String|GrawlixPlugin|Function}  plugin  Plugin name, GrawlixPlugin 
 *                                                  object, or factory function.
 * @param  {Object}                         options Options object.
 * @return {Boolean}
 */
exports.hasPlugin = function(plugin, options) {
  if (_.has(options, 'plugins') && _.isArray(options.plugins)) {
    // search for matching GrawlixPlugin
    if (plugin instanceof GrawlixPlugin) {
      return _.some(options.plugins, function(obj) {
        return (
          _.has(obj, 'plugin') &&
          obj.plugin instanceof GrawlixPlugin &&
          (obj.plugin === plugin || obj.plugin.name === plugin.name)
        );
      });
    }
    // search for matching factory function
    if (_.isFunction(plugin)) {
      return _.some(options.plugins, function(obj) {
        return (_.has(obj, 'plugin') && obj.plugin === plugin);
      });
    }
    // search by module and by GrawlixPlugin name
    if (_.isString(plugin)) {
      return _.some(options.plugins, function(obj) {
        return (
          (_.has(obj, 'module') && obj.module === plugin) ||
          (
            _.has(obj, 'plugin') && 
            obj.plugin instanceof GrawlixPlugin && 
            obj.plugin.name === plugin
          )
        );
      });
    }
  }
  // or, if all else fails...
  return false;
};

/**
 * Returns whether or not any of the given filters match the given string.
 * @param  {String}           str      Content string
 * @param  {GrawlixSettings}  settings GrawlixSettings object
 * @return {Boolean}                   Whether or not obscenity is found in the 
 *                                     given string
 */
exports.isMatch = function(str, settings) {
  if (settings.filters.length === 0) {
    return false;
  }
  return _.some(settings.filters, function(filter) {
    return filter.isMatch(str);
  });
};

/**
 * Replaces obscenities in the given string using the given settings.
 * @param  {String}          str      String to process
 * @param  {GrawlixSettings} settings Grawlix settings
 * @return {String}                   Processed string
 */
exports.replaceMatches = function(str, settings) {
  _.each(settings.filters, function(filter) {
    while (filter.isMatch(str)) {
      str = replaceMatch(str, filter, settings);
    }
  });
  return str;
};

/**
 * Replaces a filter match in a string
 * @param  {String}          str      Content string
 * @param  {GrawlixFilter}   filter   GrawlixFilter object
 * @param  {GrawlixSettings} settings GrawlixSettings object
 * @return {String}                   String with replacement applied
 */
var replaceMatch = function(str, filter, settings) {
  // get filter style if provided
  var style;
  if (filter.hasStyle() && settings.style.isOverrideAllowed) {
    style = _.findWhere(settings.styles, { name: filter.style });
  }
  if (_.isUndefined(style)) {
    // if filter style not found, or no filter style set, use main style
    style = settings.style;
  }
  // get replacement grawlix
  var repl;
  if (!settings.isRandom && style.hasFixed(filter.word)) {
    // if in fixed replacement mode and style has a defined fixed replacement 
    // string for the filter's word 
    repl = style.getFixed(filter.word);
  } else {
    // if single-character style
    repl = generateGrawlix(str, filter, style);
  }
  // apply filter template if necessary
  if (filter.hasTemplate()) {
    repl = filter.template(repl);
  }
  // replace the match
  return str.replace(filter.regex, repl);
};
exports.replaceMatch = replaceMatch;

/**
 * Replaces matched content with a grawlix, taking into account filter and style
 * settings.
 * @param  {String}        str       Content string
 * @param  {GrawlixFilter} filter    Filter object
 * @param  {GrawlixStyle}  style     Style object
 * @return {String}                  Grawlix replacement string
 */
var generateGrawlix = function(str, filter, style) {
  // determine length
  var len;
  if (filter.isExpandable) {
    len = filter.getMatchLen(str);
  } else {
    len = filter.word.length;
  }
  // generate grawlix
  if (!style.canRandomize()) {
    return style.getFillGrawlix(len);
  }
  return style.getRandomGrawlix(len);
};
exports.generateGrawlix = generateGrawlix;
