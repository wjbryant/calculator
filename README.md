# JavaScript Calculator

This is a simple JavaScript calculator that is made to mimic the functionality
of the classic Windows calculator. It uses CSS classes for layout and unobtrusive
JavaScript for functionality. It does not rely on any external JavaScript libraries
to function.

## Features

* Support for input from both keyboard and mouse
* Keyboard shortcuts such as "Esc" for Clear and "r" for reciprocal
* Support for multiple calculators on a single page
* Public API for controlling calculators through JavaScript code

## How to Use the Calculator

First, download the zip file for the latest release and extract the contents into
a directory on your Web server. The two "min" files are compressed and should be
used in production. The other two js and css files are development versions which
are fully commented. The zip file also contains other documentation files. The
development and documentation files can be safely deleted if you do not need them.
The only two required files are the "min" files. They should be placed together
in the same directory.

To add the calculator to a web page, include the "min" js file in the page via
a script element. As of version 1.1a4, the script does not automatically create
calculators. Instead, call JSCALC.init() and any element with a class of "calc"
will have a calculator generated inside it.

Note that if you choose to rename or move the css file, it is necessary to set
the JSCALC.css property to the new file name (or full path if not in the same
directory) before calling JSCALC.init() so the script knows where to find it.
Check out the documentation and
[this post](http://wjbryant.com/2011/09/02/javascript-calculator-api/ "JavaScript Calculator API")
for information on more advanced usage.

### Example

    <div class="calc"></div>
    <script src="calc-1.1-min.js"></script>
    <script>JSCALC.init();</script>