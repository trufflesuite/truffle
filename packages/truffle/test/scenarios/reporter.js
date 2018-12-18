'use strict';

// This is a direct copy of the following reporter changed
// such that logger commands are switched to a configurable logger.
// We had to wrap the spec definition in the function for logger scoping.
// https://github.com/mochajs/mocha/blob/master/lib/reporters/spec.js

/**
var OS = require("os");
 * Module dependencies.
 */

var ms = require('mocha/lib/ms.js');
var Base = require('mocha/lib/reporters/base.js');
var utils = require('mocha/lib/utils');
var inherits = utils.inherits;
var color = Base.color;
var diff = require('diff');


/**
 * Expose `Spec`.
 */

exports = module.exports = function(logger) {
  /**
   * Inherit from `Base.prototype`.
   */
  inherits(Spec, Base);

  /**
   * Initialize a new `Spec` test reporter.
   *
   * @api public
   * @param {Runner} runner
   */
  function Spec (runner) {
    Base.call(this, runner);

    var self = this;
    var indents = 0;
    var n = 0;

    function indent () {
      return Array(indents).join('  ');
    }

    runner.on('start', function () {
      logger.log();
    });

    runner.on('suite', function (suite) {
      ++indents;
      logger.log(color('suite', '%s%s'), indent(), suite.title);
    });

    runner.on('suite end', function () {
      --indents;
      if (indents === 1) {
        logger.log();
      }
    });

    runner.on('pending', function (test) {
      var fmt = indent() + color('pending', '  - %s');
      logger.log(fmt, test.title);
    });

    runner.on('pass', function (test) {
      var fmt;
      if (test.speed === 'fast') {
        fmt = indent() +
          color('checkmark', '  ' + Base.symbols.ok) +
          color('pass', ' %s');
        logger.log(fmt, test.title);
      } else {
        fmt = indent() +
          color('checkmark', '  ' + Base.symbols.ok) +
          color('pass', ' %s') +
          color(test.speed, ' (%dms)');
        logger.log(fmt, test.title, test.duration);
      }
    });

    runner.on('fail', function (test) {
      logger.log(indent() + color('fail', '  %d) %s'), ++n, test.title);
    });

    runner.on('end', function() {
      self.epilogue();
    });
  };

  // This is a direct copy of Base.epilogue, replacing logger with logger.
  Spec.prototype.epilogue = function() {
    var stats = this.stats;
    var fmt;

    logger.log();

    // passes
    fmt = color('bright pass', ' ') +
      color('green', ' %d passing') +
      color('light', ' (%s)');

    logger.log(fmt,
      stats.passes || 0,
      ms(stats.duration));

    // pending
    if (stats.pending) {
      fmt = color('pending', ' ') +
        color('pending', ' %d pending');

      logger.log(fmt, stats.pending);
    }

    // failures
    if (stats.failures) {
      fmt = color('fail', '  %d failing');

      logger.log(fmt, stats.failures);

      this.list(this.failures);
      logger.log();
    }

    logger.log();
  };

  // The following three functions pulled from Mocha's Base reporter
  // so that we can change console with a configurable logger.
  // https://github.com/mochajs/mocha/blob/master/lib/reporters/base.js
  var objToString = Object.prototype.toString;

  function sameType (a, b) {
    return objToString.call(a) === objToString.call(b);
  }

  /**
   * Return a character diff for `err`.
   *
   * @api private
   * @param {Error} err
   * @param {string} type
   * @param {boolean} escape
   * @return {string}
   */
  function errorDiff (err, type, escape) {
    var actual = escape ? escapeInvisibles(err.actual) : err.actual;
    var expected = escape ? escapeInvisibles(err.expected) : err.expected;
    return diff['diff' + type](actual, expected).map(function (str) {
      if (str.added) {
        return colorLines('diff added', str.value);
      }
      if (str.removed) {
        return colorLines('diff removed', str.value);
      }
      return str.value;
    }).join('');
  }

  /**
   * Returns an inline diff between 2 strings with coloured ANSI output
   *
   * @api private
   * @param {Error} err with actual/expected
   * @param {boolean} escape
   * @return {string} Diff
   */
  function inlineDiff (err, escape) {
    var msg = errorDiff(err, 'WordsWithSpace', escape);

    // linenos
    var lines = msg.split('\n');
    if (lines.length > 4) {
      var width = String(lines.length).length;
      msg = lines.map(function (str, i) {
        return pad(++i, width) + ' |' + ' ' + str;
      }).join('\n');
    }

    // legend
    msg = '\n' +
      color('diff removed', 'actual') +
      ' ' +
      color('diff added', 'expected') +
      '\n\n' +
      msg +
      '\n';

    // indent
    msg = msg.replace(/^/gm, '      ');
    return msg;
  }


  /**
   * Color lines for `str`, using the color `name`.
   *
   * @api private
   * @param {string} name
   * @param {string} str
   * @return {string}
   */
  function colorLines (name, str) {
    return str.split('\n').map(function (str) {
      return color(name, str);
    }).join('\n');
  }

  /**
   * Returns a unified diff between two strings.
   *
   * @api private
   * @param {Error} err with actual/expected
   * @param {boolean} escape
   * @return {string} The diff.
   */
  function unifiedDiff (err, escape) {
    var indent = '      ';
    function cleanUp (line) {
      if (escape) {
        line = escapeInvisibles(line);
      }
      if (line[0] === '+') {
        return indent + colorLines('diff added', line);
      }
      if (line[0] === '-') {
        return indent + colorLines('diff removed', line);
      }
      if (line.match(/@@/)) {
        return null;
      }
      if (line.match(/\\ No newline/)) {
        return null;
      }
      return indent + line;
    }
    function notBlank (line) {
      return typeof line !== 'undefined' && line !== null;
    }
    var msg = diff.createPatch('string', err.actual, err.expected);
    var lines = msg.split('\n').splice(4);
    return '\n      ' +
      colorLines('diff added', '+ expected') + ' ' +
      colorLines('diff removed', '- actual') +
      '\n\n' +
      lines.map(cleanUp).filter(notBlank).join('\n');
  }


  Spec.prototype.list = function(failures) {
    logger.log();
    failures.forEach(function (test, i) {
      // format
      var fmt = color('error title', '  %s) %s:\n') +
        color('error message', '     %s') +
        color('error stack', '\n%s\n');

      // msg
      var msg;
      var err = test.err;
      var message;
      if (err.message && typeof err.message.toString === 'function') {
        message = err.message + '';
      } else if (typeof err.inspect === 'function') {
        message = err.inspect() + '';
      } else {
        message = '';
      }
      var stack = err.stack || message;
      var index = message ? stack.indexOf(message) : -1;
      var actual = err.actual;
      var expected = err.expected;
      var escape = true;

      if (index === -1) {
        msg = message;
      } else {
        index += message.length;
        msg = stack.slice(0, index);
        // remove msg from stack
        stack = stack.slice(index + 1);
      }

      // uncaught
      if (err.uncaught) {
        msg = 'Uncaught ' + msg;
      }
      // explicitly show diff
      if (err.showDiff !== false && sameType(actual, expected) && expected !== undefined) {
        escape = false;
        if (!(utils.isString(actual) && utils.isString(expected))) {
          err.actual = actual = utils.stringify(actual);
          err.expected = expected = utils.stringify(expected);
        }

        fmt = color('error title', '  %s) %s:\n%s') + color('error stack', '\n%s\n');
        var match = message.match(/^([^:]+): expected/);
        msg = '\n      ' + color('error message', match ? match[1] : msg);

        if (exports.inlineDiffs) {
          msg += inlineDiff(err, escape);
        } else {
          msg += unifiedDiff(err, escape);
        }
      }

      // indent stack trace
      stack = stack.replace(/^/gm, '  ');

      logger.log(fmt, (i + 1), test.fullTitle(), msg, stack);
    });
  };

  return Spec;
};
