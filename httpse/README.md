HTTPS Everywhere Ruleset Tests
==============================

This repository is a clone of mozilla-central, the codebase that Firefox is built from. In order to test HTTPS Everywhere rulesets for mixed content errors and other things, we're using a Firefox [mochitest](https://developer.mozilla.org/en-US/docs/Mochitest).

To do list
----------

* Write script that parses HTTPS Everywhere rules for domain names to test, and writes this domain names in a location that the mochitest can read them
* Write the mochitest
* Create bash script that git pulls the HTTPS Everywhere repo, generates the domain name files, and runs the mochitest
