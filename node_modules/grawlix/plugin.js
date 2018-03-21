'use strict';

/**
 * Contains the specification class for grawlix plugins
 */

const _ = require('underscore');

/**
 * Defines a grawlix plugin.
 * @param {Object}   obj         Constructor options
 * @param {String}   obj.name    Plugin name. Required.
 * @param {Array}    obj.filters Array of filter objects. Optional.
 * @param {Array}    obj.styles  Array of grawlix styles. Optional.
 * @param {Function} obj.init    Initialization function override. Optional.
 */
const GrawlixPlugin = function(obj) {
  /**
   * Plugin name
   * @type {String}
   */
  this.name = null;

  /**
   * Array of filter objects
   * @type {Array}
   */
  this.filters = [];

  /**
   * Array of GrawlixStyle objects
   * @type {Array}
   */
  this.styles = [];

  /**
   * Optional initialization function. Called when plugin first loaded. Can be
   * overridden in subclasses or via the `obj` argument. Value of `this` inside 
   * the function will always be the `GrawlixPlugin` instance.
   * @param  {Object} options Options object of the main `grawlix` instance.
   * @return {void}
   */
  this.init = function(options) {
    // can override in subclasses
  };

  if (!_.isUndefined(obj)) {
    if (_.has(obj, 'name') && _.isString(obj.name)) {
      this.name = obj.name;
    } else if (_.isString(obj)) {
      this.name = obj;
    }
    if (_.has(obj, 'filters') && _.isArray(obj.filters)) {
      this.filters = obj.filters;
    }
    if (_.has(obj, 'styles') && _.isArray(obj.styles)) {
      this.styles = obj.styles;
    }
    if (_.has(obj, 'init') && _.isFunction(obj.init)) {
      this.init = _.bind(obj.init, this);
    }
  }
};
GrawlixPlugin.prototype = {};

/**
 * Custom Error subclass for Grawlix plugin exceptions
 * @param {Object} args            Arguments
 * @param {String} args.msg        Error message. Required.
 * @param {String} args.message    Alias of args.msg
 * @param {Object} args.plugin     Plugin object or plugin. Optional.
 * @param {Error}  args.trace      New Error object to take stack trace from. 
 *                                 Optional.
 */
const GrawlixPluginError = function(args) {
  this.name = 'GrawlixPluginError';
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
  if (this.plugin !== null && _.has(this.plugin, 'name')) {
    this.message = '[plugin ' + this.plugin.name + '] ' + msg;
  } else {
    this.message = msg;
  }
};
GrawlixPluginError.prototype = Object.create(Error.prototype);
GrawlixPluginError.prototype.constructor = GrawlixPluginError;

/**
 * Exports
 */
module.exports = {
  GrawlixPlugin: GrawlixPlugin,
  GrawlixPluginError: GrawlixPluginError
};
