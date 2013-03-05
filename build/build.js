;(function(){


/**
 * hasOwnProperty.
 */

var has = Object.prototype.hasOwnProperty;

/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(path, parent, orig) {
  var resolved = require.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.require = true;
    throw err;
  }

  var module = require.modules[resolved];

  // perform real require()
  // by invoking the module's
  // registered function
  if (!module.exports) {
    module.exports = {};
    module.client = module.component = true;
    module.call(this, module.exports, require.relative(resolved), module);
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);
  var index = path + '/index.js';

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (has.call(require.modules, path)) return path;
  }

  if (has.call(require.aliases, index)) {
    return require.aliases[index];
  }
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  if ('.' != path.charAt(0)) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */

require.register = function(path, definition) {
  require.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to) {
  if (!has.call(require.modules, from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * lastIndexOf helper.
   */

  function lastIndexOf(arr, obj) {
    var i = arr.length;
    while (i--) {
      if (arr[i] === obj) return i;
    }
    return -1;
  }

  /**
   * The relative require() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return require(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return require.normalize(p, path);

    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    var segs = parent.split('/');
    var i = lastIndexOf(segs, 'deps') + 1;
    if (!i) i = 0;
    path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
    return path;
  };

  /**
   * Check if module is defined at `path`.
   */

  localRequire.exists = function(path) {
    return has.call(require.modules, localRequire.resolve(path));
  };

  return localRequire;
};
require.register("calculator/index.js", function(exports, require, module){
'use strict';

/**
 * the JSCALC "namespace"
 *
 * @namespace
 */
var JSCALC = module.exports = {},
    calculators = {}, // an object containing all the calculators created
    nextID = 0,

    /**
     * A simple implementation of getElementsByClassName. Checks for one
     * class name and does not account for differences between NodeList and
     * Array.
     *
     * @param  {String}             className  the class name
     * @return {NodeList|Element[]}            the matching elements
     *
     * @function
     * @ignore
     */
    getElementsByClassName = document.getElementsByClassName ?
            function (className) {
                return document.getElementsByClassName(className);
            } :
            document.querySelectorAll ?
                    function (className) {
                        return document.querySelectorAll('.' + className);
                    } :
                    document.evaluate ?
                            function (className) {
                                var elems = document.evaluate(
                                        "//*[contains(concat(' ', @class, ' '), ' " +
                                            className + " ')]",
                                        document,
                                        null,
                                        0,
                                        null
                                    ),
                                    elem = elems.iterateNext(),
                                    results = [];
                                while (elem) {
                                    results[results.length] = elem;
                                    elem = elems.iterateNext();
                                }
                                return results;
                            } :
                            function (className) {
                                var i,
                                    elems = document.getElementsByTagName('*'),
                                    num = elems.length,
                                    pattern = new RegExp('(^|\\s)' + className + '(\\s|$)'),
                                    results = [];
                                for (i = 0; i < num; i += 1) {
                                    if (pattern.test(elems[i].className)) {
                                        results[results.length] = elems[i];
                                    }
                                }
                                return results;
                            };

/**
 * Creates a new calculator in the specified container element (module).
 *
 * @param  {Element}    calcMod  the element to contain the calculator
 * @return {Calculator}          a Calculator object
 *
 * @ignore
 */
function createCalc(calcMod) {
    var calcTemplate = require('./template'),
        forms,
        form,
        display,
        total = 0,
        operation,
        clearNext = true,
        dot = /\./,
        lastNum = null,
        getLastNum = false,
        lastKeyDown,
        operationPressed = false, // whether an operation was the last key pressed
        calcObj = {},
        id = nextID;

    /**
     * Performs the basic mathematical operations (addition, subtraction,
     * multiplication, division) on the current total with the given
     * value for the current operation.
     *
     * @param {Number} val  the value to use in the calculation with the total
     *
     * @ignore
     */
    function calculate(val) {
        switch (operation) {
        case '+':
            total += val;
            break;
        case '-':
            total -= val;
            break;
        case '*':
            total *= val;
            break;
        case '/':
            total /= val;
            break;
        }
        display.value = total;
    }

    /**
     * This function handles input for the form's keydown, keypress and
     * click events. Any keypresses that are not related to a calculator
     * function are not allowed.
     *
     * @return {Boolean}  whether the default action is allowed
     *
     * @ignore
     */
    function handleInput(e) {
        e = e || window.event;

        var key, // the key (char) that was pressed / clicked
            code, // the key code
            val, // the numeric value of the display
            target, // the target element of the event
            isOperation = false; // whether the button pressed is an operation

        // this switch statement sets the key variable
        switch (e.type) {
        case 'keydown':
            lastKeyDown = code = e.keyCode;

            switch (code) {
            case 27:
                // escape
                key = 'C';
                break;
            case 8:
                // backspace
                key = 'Backspace';
                break;
            case 46:
                // delete
                key = 'CE';
                break;
            default:
                // allow all other keys (enter, tab, numbers, letters, etc.)
                return true;
            }
            break;
        case 'keypress':
            // most browsers provide the charCode property when the keypress event is fired
            // IE and Opera provide the character code in the keyCode property instead
            code = e.charCode || e.keyCode;

            // this event is fired for all keys in Firefox and Opera
            // because of this, we need to check the last keyCode
            // from the keydown event for certain keys

            // allow enter, tab and left and right arrow keys
            // the enter key fires the keypress event in all browsers
            // the other keys are handled here for Firefox and Opera
            if (code === 13 || code === 9 || lastKeyDown === 37 || lastKeyDown === 39) {
                return true;
            }
            // these keys are handled on keydown (escape, backspace, delete)
            // this is for Firefox and Opera (and sometimes IE for the escape key)
            if (code === 27 || code === 8 || lastKeyDown === 46) {
                return false;
            }

            // get the key character in lower case
            if (lastKeyDown === 188) {
                key = '.'; // allow the comma key to be used for a decimal point
            } else {
                key = String.fromCharCode(code).toLowerCase();
            }
            break;
        case 'click':
            target = e.target || e.srcElement;
            if (target.tagName === 'INPUT' && target.type === 'button') {
                key = target.value;
            } else {
                return true;
            }
            break;
        case 'calculatorPressMethod':
            // special case for the press method of the calculator object
            key = e.calckey;
            break;
        default:
            // the switch statement should never make it here
            // this is just a safeguard
            return true;
        }

        val = parseFloat(display.value);

        switch (key) {
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
        case '.':
            // don't allow more than one decimal point
            if (!(key === '.' && dot.test(display.value))) {
                if (clearNext) {
                    display.value = '';
                    clearNext = false;
                }
                display.value += key;
            }
            break;
        case '*':
        case '+':
        case '-':
        case '/':
            // if an operation was the last key pressed,
            // do nothing but change the current operation
            if (!operationPressed) {
                if (total === 0 || lastNum !== null) {
                    total = val;
                } else {
                    calculate(val);
                }
                lastNum = null;
                getLastNum = true;
                clearNext = true;
            }
            operation = key;
            isOperation = true;
            break;
        case 'C':
            display.blur(); // so Firefox can clear display when escape key is pressed
            total = 0;
            operation = '';
            clearNext = true;
            lastNum = null;
            getLastNum = false;
            display.value = '0';
            break;
        case 'CE':
            display.value = '0';
            clearNext = true;
            break;
        case 'Backspace':
            display.value = display.value.slice(0, display.value.length - 1);
            break;
        case '+/-':
            display.value = val * -1;
            break;
        case '%':
            if (val) {
                display.value = total * val / 100;
            }
            break;
        case 'sqrt':
            if (val >= 0) {
                display.value = Math.sqrt(val);
            } else {
                display.value = 'Invalid input for function';
            }
            break;
        case 'a':
        case 'c':
        case 'v':
        case 'x':
            // allow select all, copy, paste and cut key combinations
            if (e.ctrlKey) {
                return true;
            }
            break;
        case '1/x':
        case 'r':
            if (val) {
                display.value = 1 / val;
            } else {
                display.value = 'Cannot divide by zero';
            }
            break;
        case '=':
            form.onsubmit();
            break;
        }

        operationPressed = isOperation;
        display.focus();
        return false;
    }

    // increment the ID counter
    nextID += 1;

    // create the calculator elements
    calcMod.innerHTML += calcTemplate;

    // get the calculator inputs
    forms = calcMod.getElementsByTagName('form');
    form = forms[forms.length - 1]; // make sure it's the one that was just added
    display = form.getElementsByTagName('input')[0];
    display.setAttribute('autocomplete', 'off');
    display.value = '0';
    display.onkeydown = display.onkeypress = form.onclick = handleInput;

    /**
     * Calculates the value of the last entered operation and displays the result.
     *
     * @return {Boolean}  always returns false to prevent the form from being submitted
     *
     * @ignore
     */
    form.onsubmit = function () {
        if (getLastNum) {
            lastNum = parseFloat(display.value) || 0;
            getLastNum = false;
        }
        calculate(lastNum);
        clearNext = true;
        display.focus();
        return false;
    };

    /**
     * the Calculator class - Calculator objects are returned by some
     * methods of the JSCALC object.
     *
     * @name Calculator
     * @class
     * @private
     */

    /**
     * Gives focus to the calculator display.
     *
     * @function
     * @name focus
     * @memberOf Calculator.prototype
     */
    calcObj.focus = function () {
        display.focus();
    };

    /**
     * Simulates pressing a button on the calculator.
     *
     * @param  {Number|String} button  the button(s) to press - A number can
     *                                 represent multiple buttons, but a
     *                                 string can only represent one.
     * @return {Calculator}            the Calculator object
     *
     * @function
     * @name press
     * @memberOf Calculator.prototype
     */
    calcObj.press = function (button) {
        var buttons,
            num,
            i;

        // if button is a number, convert it to an array of digits as strings
        if (typeof button === 'number') {
            buttons = button.toString().split('');
        } else if (typeof button === 'string' && button) {
            buttons = [button];
        } else {
            // invalid argument
            return this; // do nothing, but still allow method chaining
        }

        num = buttons.length;
        for (i = 0; i < num; i += 1) {
            handleInput({
                type: 'calculatorPressMethod',
                calckey: buttons[i]
            });
        }

        return this; // allow method chaining
    };

    /**
     * Removes the calculator and sets the Calculator object to null.
     *
     * @function
     * @name remove
     * @memberOf Calculator.prototype
     */
    calcObj.remove = function () {
        display.onkeydown = display.onkeypress = form.onclick = null;
        calcMod.removeChild(form.parentNode);
        delete calculators[id];
        calcObj = null;
    };

    /**
     * a reference to the element that contains the calculator
     *
     * @name container
     * @memberOf Calculator.prototype
     */
    calcObj.container = calcMod;

    calculators[id] = calcObj; // keep track of all calculators

    return calcObj;
}

/**
 * Gets the Calculator object associated with the calculator contained in
 * the specified element.
 *
 * @param  {Element}    container  the element containing the calculator
 * @return {Calculator}            the Calculator object or null if none exists
 */
JSCALC.get = function (container) {
    // if the container argument is not an element node, do nothing
    if (!container || container.nodeType !== 1) {
        return null;
    }

    var id,
        calcs = calculators,
        calc;

    for (id in calcs) {
        if (calcs.hasOwnProperty(id)) {
            if (container === calcs[id].container) {
                calc = calcs[id];
                break;
            }
        }
    }

    return calc || null;
};

/**
 * Gets the Calculator objects for all the calculators on the page.
 *
 * @return {Calculator[]}  an array of Calculator objects
 */
JSCALC.getCalcs = function () {
    var id,
        calcArray = [],
        calcs = calculators;

    // the calculators array may be sparse, so copy all objects from it
    // into a dense array and return that instead
    for (id in calcs) {
        if (calcs.hasOwnProperty(id)) {
            calcArray[calcArray.length] = calcs[id];
        }
    }

    return calcArray;
};

/**
 * Creates calculators.
 *
 * @param  {String|Element}          [elem]  the element in which to create the calculator -
 *                                           If the argument is a string, it should be the element id.
 *                                           If the argument is an object, it should be the element itself.
 * @return {Calculator|Calculator[]}         If an argument is specified, the Calculator object or
 *                                           null is returned. If no arguments are specified, an
 *                                           array of Calculator objects is returned.
 */
JSCALC.init = function (elem) {
    var calcMods = [],
        args = false,
        calcMod,
        len,
        i,
        newCalcs = [];

    // treat a string argument as an element id
    if (typeof elem === 'string') {
        elem = document.getElementById(elem);
    }

    // if the argument is an element object or an element was found by id
    if (typeof elem === 'object' && elem.nodeType === 1) {
        // add the "calc" class name to the element
        if (elem.className) {
            if (elem.className.indexOf('calc') === -1) {
                elem.className += ' calc';
            }
        } else {
            elem.className = 'calc';
        }

        // add the element to the array of calculator modules to be initialized
        calcMods[0] = elem;
        args = true;
    } else {
        // if an element node was not found or specified, get all elements
        // with a class name of "calc"
        calcMods = getElementsByClassName('calc');
    }

    len = calcMods.length;

    // if there is at least one element in the array
    if (len) {
        // loop through the array and create a calculator in each element
        for (i = 0; i < len; i += 1) {
            calcMod = calcMods[i];

            // check to ensure a calculator does not already exist in the
            // specified element
            if (!JSCALC.get(calcMod)) {
                newCalcs[newCalcs.length] = createCalc(calcMod);
            }
        }
    }

    // if an argument was specified, return a single object or null if one
    // could not be created
    // else, return the array of objects even if it is empty
    return args ? (newCalcs[0] || null) : newCalcs;
};

/**
 * Removes all calculators.
 */
JSCALC.removeAll = function () {
    var id,
        calcs = calculators;

    // remove each calculator in the calculators array (calcs)
    for (id in calcs) {
        if (calcs.hasOwnProperty(id)) {
            calcs[id].remove();
        }
    }
};

// remove all event handlers on window unload
// this will prevent a memory leak in older versions of IE
if (window.attachEvent) {
    window.attachEvent('onunload', JSCALC.removeAll);
}

});
require.register("calculator/template.js", function(exports, require, module){
module.exports = '<div class="calcContainer">\n	<form action="">\n		<span class="calcTitle">Calculator</span>\n		<div>\n			<input type="text" class="calcDisplay" />\n			<input type="button" value="Backspace" class="calcClear calcFirst calcFunction" />\n			<input type="button" value="CE" class="calcClear calcFunction" />\n			<input type="button" value="C" class="calcClear calcFunction" />\n			<input type="button" value="7" class="calcFirst calcInput" />\n			<input type="button" value="8" class="calcInput" />\n			<input type="button" value="9" class="calcInput" />\n			<input type="button" value="/" class="calcFunction" />\n			<input type="button" value="sqrt" class="calcInput" />\n			<input type="button" value="4" class="calcFirst calcInput" />\n			<input type="button" value="5" class="calcInput" />\n			<input type="button" value="6" class="calcInput" />\n			<input type="button" value="*" class="calcFunction" />\n			<input type="button" value="%" class="calcInput" />\n			<input type="button" value="1" class="calcFirst calcInput" />\n			<input type="button" value="2" class="calcInput" />\n			<input type="button" value="3" class="calcInput" />\n			<input type="button" value="-" class="calcFunction" />\n			<input type="button" value="1/x" class="calcInput" />\n			<input type="button" value="0" class="calcFirst calcInput" />\n			<input type="button" value="+/-" class="calcInput" />\n			<input type="button" value="." class="calcInput" />\n			<input type="button" value="+" class="calcFunction" />\n			<input type="submit" value="=" class="calcFunction" />\n		</div>\n	</form>\n</div>';
});

if (typeof exports == "object") {
  module.exports = require("calculator");
} else if (typeof define == "function" && define.amd) {
  define(function(){ return require("calculator"); });
} else {
  window["JSCALC"] = require("calculator");
}})();