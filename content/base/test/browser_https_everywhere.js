alert("test is starting");
//Components.utils.import("resource://gre/modules/FileUtils.jsm");
const gHttpTestRoot = "http://example.com/browser/browser/base/content/test/";
const numTabs = 6;
var finished = false;

var urls = [];

function test() {
  alert("testcalled")
  var i;

  requestLongerTimeout(5000);
  waitForExplicitFinish();

  // make sure mixed content blocking preferences are correct
  Services.prefs.setBoolPref("security.mixed_content.block_display_content", false);
  Services.prefs.setBoolPref("security.mixed_content.block_active_content", true);


  // load the list of domains and generate urls
  var req = new XMLHttpRequest();
  req.onload = function() {
    alert("request was loaded")
    // build urls
    var domains = this.responseText.trim().split("\n");
    for(i=0; i<domains.length; i++) {
      var domain = domains[i].trim();
      if(domain != '') {
        urls.push('https://' + domain);
      }
    alert("urls is" + urls[5])
    }
    //urls = ['https://www.google.com/', 'https://www.eff.org/', 'https://github.com/'];
    
    // start loading all the tabs
    for(i=0; i<numTabs; i++) {
      newTab();
    }
  }
  req.open("get", gHttpTestRoot + "top-1m.csv", true); // substitute your own URL/CSV here
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
    alert("newtab called")
  // start a test in this tab
  if(urls.length) {
    // open a new tab
    var url = urls.pop();
    popup('loading url '+url+' ('+urls.length+' left)');
    var tab = gBrowser.addTab(url);
    gBrowser.selectedTab = tab;
    //gBrowser.selectedBrowser.contentWindow.location = url;
    
    
    // wait for the page to load
    var intervalId = window.setTimeout(function(){

    
      // detect mixed content blocker
      if(PopupNotifications.getNotification("mixed-content-blocked", gBrowser.getBrowserForTab(tab))) {
        ok(false, "URL caused mixed content: "+ url);

        writeout(url);
        // todo: print this in the live window
        // and also save it to a file
      }
      
      
      // close this tab, and open another
      closeTab(tab);

    }, 6000);

  } else {
    if (!finished) { 
      finished = true;
      window.setTimeout(function(){
        popup('running finish');
        finish();
      }, 10000);
    }
  }
}


function closeTab(tab) {
  gBrowser.selectedTab = tab;
  gBrowser.removeCurrentTab();
  newTab();
}

function popup(text) {
  try {
    Components.classes['@mozilla.org/alerts-service;1'].
              getService(Components.interfaces.nsIAlertsService).
              showAlertNotification(null, "HTTPS Everywhere Tests", text, false, '', null);
  } catch(e) {
    // prevents runtime error on platforms that don't implement nsIAlertsService
  }
}

function writeout(weburl) {

  var file = Components.classes["@mozilla.org/file/local;1"].
           createInstance(Components.interfaces.nsILocalFile);
  file.initWithPath("/Users/lisayao/Desktop");
  
  writeoutfile = "mochilog.txt";
  file.append(writeoutfile);
 
  //need to be sure to delete existing mochilog.txt before running test
  if(!file.exists()) {
    file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
  } 
  
  var stream = Components.classes["@mozilla.org/network/file-output-stream;1"]
  .createInstance(Components.interfaces.nsIFileOutputStream);
  
  //double check permissions, perhaps use 0x02 | 0x10 only
  stream.init(file, 0x02 | 0x08 | 0x10, 0666, 0);
  
  var content = weburl + "\n";
  
  //used to deal with ascii text
  var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
                createInstance(Components.interfaces.nsIConverterOutputStream);
  converter.init(stream, "UTF-8", 0, 0);
  converter.writeString(content);
  converter.close();

  //stream.write(content,content.length);
  //stream.close();

}