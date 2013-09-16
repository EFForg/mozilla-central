const gHttpTestRoot = "http://example.com/browser/browser/base/content/test/";
const numTabs = 5;
var finished = false;

var urls = [];

//test function called by mochitest infrastructure
function test() {
  var i;

  requestLongerTimeout(5000);
  waitForExplicitFinish();

  // make sure mixed content blocking preferences are correct
  Services.prefs.setBoolPref("security.mixed_content.block_display_content", false);
  Services.prefs.setBoolPref("security.mixed_content.block_active_content", true);


  // load the list of domains via xml request and generate urls
  var req = new XMLHttpRequest();
  req.onload = function() {
    // build urls
    var domains = this.responseText.trim().split("\n");
    for(i=0; i<domains.length; i++) {
      var domain = domains[i].trim();
      if(domain != '') {
        urls.push('https://' + domain);
      }
    }
        
    // start loading all the tabs
    window.focus
    for(i=0; i<numTabs; i++) {
      newTab();
    }
  }
  req.open("get", gHttpTestRoot + "domains.txt", true); // substitute your own URL/CSV here
  req.send();
  
  /* FOR OBTAINING RULESETS from a FIREFOX EXTENSION
  HTTPSEverywhere = CC["@eff.org/https-everywhere;1"]
    .getService(Components.interfaces.nsISupports)
    .wrappedJSObject;
  var domains = []
  for(var i=0; i<HTTPSEverywhere.https_rules.rulesets.length; i++) {
    domains.push(HTTPSEverywhere.https_rules.ruleset[i].target);
  }*/
}

function newTab() {
  // start a test in this tab
  if(urls.length) {
    
    // open a new tab
    var url = urls.pop();
    var tab = gBrowser.addTab(url);
    gBrowser.selectedTab = tab;
    
    // wait for the page to load
    var intervalId = window.setTimeout(function(){

      // detect mixed content blocker
      if(PopupNotifications.getNotification("mixed-content-blocked", gBrowser.getBrowserForTab(tab))) {
        ok(false, "URL caused mixed content: "+ url);

        writeout(url);
        // todo: print this in the live window
      }
      
      // close this tab, and open another
      closeTab(tab);

    }, 10000);

  } else {
  
    //to run if urls is empty
    if (!finished) { 
      finished = true;
      window.setTimeout(function(){
        finish();
      }, 10000);
    }
  }
}

//closes tab
function closeTab(tab) {
  gBrowser.selectedTab = tab;
  gBrowser.removeCurrentTab();
  newTab();
}

//function to create alerts without interrupting test
function popup(text) {
  try {
    Components.classes['@mozilla.org/alerts-service;1'].
              getService(Components.interfaces.nsIAlertsService).
              showAlertNotification(null, "HTTPS Everywhere Tests", text, false, '', null);
  } catch(e) {
    // prevents runtime error on platforms that don't implement nsIAlertsService
  }
}

//manages write out of output mochilog.txt, which contains sites that trigger mcb
function writeout(weburl) {

  //initialize file
  var file = Components.classes["@mozilla.org/file/directory_service;1"].
           getService(Components.interfaces.nsIProperties).
           get("Home", Components.interfaces.nsIFile);
  writeoutfile = "mochilog.txt";
  file.append(writeoutfile);
 
  //create file if it does not already exist
  if(!file.exists()) {
    file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
  } 
  
  //initialize output stream
  var stream = Components.classes["@mozilla.org/network/file-output-stream;1"]
  .createInstance(Components.interfaces.nsIFileOutputStream);
  
  //permissions are set to append (will not delete existing contents)
  stream.init(file, 0x02 | 0x08 | 0x10, 0666, 0);
  
  var content = weburl + "\n";
  
  //Deal with ascii text and write out
  var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
                createInstance(Components.interfaces.nsIConverterOutputStream);
  converter.init(stream, "UTF-8", 0, 0);
  converter.writeString(content);
  converter.close();

  //alternative write out if ascii is not a concern
  //stream.write(content,content.length);
  //stream.close();

}
