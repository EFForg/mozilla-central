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
rm domains/*
python parse.py https-everywhere $URLS_PER_RUN domains

#remove existing output file
rm mochilog.txt

#grab individual domain files
cd  domains 
DOMAINFILES=$( ls )

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

echo Mochiscript is completed.
