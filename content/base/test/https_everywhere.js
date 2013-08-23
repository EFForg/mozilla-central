const gHttpTestRoot = "http://example.com/browser/browser/base/content/test/";
const numTabs = 10;
var finished = false;

var urls = [];

function test() {
  var i;

  requestLongerTimeout(5000);
  waitForExplicitFinish();

  // make sure mixed content blocking preferences are correct
  Services.prefs.setBoolPref("security.mixed_content.block_display_content", false);
  Services.prefs.setBoolPref("security.mixed_content.block_active_content", true);


  // load the list of domains and generate urls
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
    for(i=0; i<numTabs; i++) {
      newTab();
    }
  }
  req.open("get", gHttpTestRoot + "domains.txt", true); // substitute your own URL/CSV here
  req.send();

}


function newTab() {
  // start a test in this tab
  if(urls.length) {
    // open a new tab
    var url = urls.pop();
    popup(url+' ('+urls.length+' left)');
    var tab = gBrowser.addTab(url);
    gBrowser.selectedTab = tab;
    //gBrowser.selectedBrowser.contentWindow.location = url;
    
    // wait for the page to load
    var intervalId = window.setTimeout(function(){

    
      // detect mixed content blocker
      if(PopupNotifications.getNotification("mixed-content-blocked", gBrowser.getBrowserForTab(tab))) {
        ok(false, "URL caused mixed content: "+ url);

        // todo: print this in the live window
        // and also save it to a file
      }
      

      // close this tab, and open another
      closeTab(tab);

    }, 6000);

  } else {
    if (!finished) { 
      popup('Finishing test');
      finished = true;
      window.setTimeout(function(){
        finish();
      }, 10000);
    }
  }
}


function closeTab(tab) {
  //popup('closing tab');
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
