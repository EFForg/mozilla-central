HTTPS Everywhere Ruleset Tests
==============================

This repository is a clone of mozilla-central, the codebase that Firefox is built from. In order to test HTTPS Everywhere rulesets for mixed content errors and other things, we're using a Firefox [mochitest](https://developer.mozilla.org/en-US/docs/Mochitest).

Getting Started
---------------

After cloning this report, the first thing you need to do is build mozilla-central. Go to the root directory of the reposity and run this to install dependencies:

    ./mach bootstrap

Then configure and build mozilla-central:

    ./mach configure
    ./mach build

Running the Test
----------------

To run the HTTPS Everywhere ruleset tests, first make sure you have built recently, then cd to the httpse directory and run start.sh.

    ./mach build
    cd httpse
    ./start.sh

How It Works
------------

Important files:

    httpse/start.sh                          Bash script to launch the tests
    httpse/parse.py                          Looks through rulesets and builds lists of domains to test
    httpse/domains/*                         Domains to test, split into files
    httpse/https-everywhere                  Git submodule for HTTPS Everywhere
    content/base/test/browser_https_everywhere.js    Mochitest
    browser/base/content/test/domains.txt    Symlink to the current domains file

When you run start.sh, your https

Important Notes
------------

When the test browsers pop up, it must be the active window on your desktop. You may need to click on the top bar to ensure this.

The test browser window may lag. It typically restores itself after a few minutes.

URLs that trigger mixed content blocking will be saved in a file named "mochilog.txt" located in the httpse folder.

You may change the number of urls tested in run in the bash script by modifying the variable: URLS_PER_RUN

You may change the desired number of tabs to run tests simultaneously in browser_https_everywhere.js by modifying the variable: numTabs. 5-7 tabs have run smoothly during our trial runs.


 

To do list
----------

* Write script that parses HTTPS Everywhere rules for domain names to test, and writes this domain names in a location that the mochitest can read them (done)
* Write the mochitest (done)
* Create bash script that git pulls the HTTPS Everywhere repo, generates the domain name files, and runs the mochitest (partway done)
* Write a script to remove tags from rulesets that no longer cause mixed content situations
* Ensure build works with httpse folder and file modifications present. If not, fix by setting ignores in compiler.
* Update submodule
