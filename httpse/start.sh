#!/bin/bash
echo Mochiscript has begun...

#setting path variables
DOMAIN_PATH="browser/base/content/test/domains.txt"
HTTPSE_PATH=`pwd`
cd ..
MOZCENTRAL_PATH=`pwd`

#remove existing domain files and obtain new domains using parser
URLS_PER_RUN=500
cd $HTTPSE_PATH
echo Parsing rulesets for domains to test...
rm domains/*
python parse.py https-everywhere $URLS_PER_RUN domains

#remove existing output file
rm mochilog.txt

echo Grabbing domain files...
#grab individual domain files
cd  domains 
DOMAINFILES=$( ls )

echo Running browser mixed content tests...
#for each list of URLs, move content to read-in file and launch mochitest
cd $MOZCENTRAL_PATH
for i in $DOMAINFILES; do
    echo $i        
    rm $DOMAIN_PATH 
    ln -s $HTTPSE_PATH/domains/$i $MOZCENTRAL_PATH/$DOMAIN_PATH
    ./mach mochitest-browser content/base/test/browser_https_everywhere.js
done

#move output file from home directory to "httpse"

mv ~/mochilog.txt ./httpse
echo Output has been saved in httpse.

python update_rulesets.py https-everywhere mochilog.txt
echo Rulesets have been updated.
