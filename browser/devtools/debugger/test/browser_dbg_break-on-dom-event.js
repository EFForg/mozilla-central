/*
 * Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

// Tests that the break-on-dom-events request works.

var gClient = null;
var gTab = null;
var gThreadClient = null;
var gInput = null;
var gButton = null;
const DEBUGGER_TAB_URL = EXAMPLE_URL + "test-event-listeners.html";

function test()
{
  let transport = DebuggerServer.connectPipe();
  gClient = new DebuggerClient(transport);
  gClient.connect(function(type, traits) {
    gTab = addTab(DEBUGGER_TAB_URL, function() {
      attach_thread_actor_for_url(gClient,
                                  DEBUGGER_TAB_URL,
                                  function(threadClient) {
        gThreadClient = threadClient;
        gInput = content.document.querySelector("input");
        gButton = content.document.querySelector("button");
        testBreakOnAll();
      });
    });
  });
}

// Test pause on all events.
function testBreakOnAll()
{
  gClient.addOneTimeListener("paused", function(event, packet) {
    is(packet.why.type, "debuggerStatement", "debugger statement was hit.");
    // Test calling pauseOnDOMEvents from a paused state.
    gThreadClient.pauseOnDOMEvents("*", function(packet) {
      is(packet, undefined, "The pause-on-any-event request completed successfully.");

      gClient.addOneTimeListener("paused", function(event, packet) {
        is(packet.why.type, "pauseOnDOMEvents", "A hidden breakpoint was hit.");
        is(packet.frame.callee.name, "keyupHandler", "The keyupHandler is entered.");

        gClient.addOneTimeListener("paused", function(event, packet) {
          is(packet.why.type, "pauseOnDOMEvents", "A hidden breakpoint was hit.");
          is(packet.frame.callee.name, "clickHandler", "The clickHandler is entered.");

          gClient.addOneTimeListener("paused", function(event, packet) {
            is(packet.why.type, "pauseOnDOMEvents", "A hidden breakpoint was hit.");
            is(packet.frame.callee.name, "onchange", "The onchange handler is entered.");

            gThreadClient.resume(testBreakOnDisabled);
          });

          gThreadClient.resume(function() {
            gInput.focus();
            gInput.value = "foo";
            gInput.blur();
          });
        });

        gThreadClient.resume(function() {
          EventUtils.sendMouseEvent({ type: "click" }, gButton);
        });
      });

      gThreadClient.resume(function() {
        // Make sure that the focus is not on the input box so that a focus event
        // will be triggered.
        window.focus();
        gBrowser.selectedBrowser.focus();
        gButton.focus();

        // Focus the element and wait for focus event.
        gInput.addEventListener("focus", function onfocus() {
          gInput.removeEventListener("focus", onfocus, false);
          executeSoon(function() {
            EventUtils.synthesizeKey("e", { shiftKey: 1 }, content);
          });
        }, false);

        gInput.focus();
      });
    });
  });

  EventUtils.sendMouseEvent({ type: "click" }, gButton);
}

// Test that removing events from the array disables them.
function testBreakOnDisabled()
{
  // Test calling pauseOnDOMEvents from a running state.
  gThreadClient.pauseOnDOMEvents(["click"], function(packet) {
    is(packet.error, undefined, "The pause-on-click-only request completed successfully.");

    gClient.addListener("paused", unexpectedListener);

    // This non-capturing event listener is guaranteed to run after the page's
    // capturing one had a chance to execute and modify window.foobar.
    gInput.addEventListener("keyup", function tempHandler() {
      gInput.removeEventListener("keyup", tempHandler, false);
      is(content.wrappedJSObject.foobar, "keyupHandler", "No hidden breakpoint was hit.");
      gClient.removeListener("paused", unexpectedListener);
      testBreakOnNone();
    }, false);

    // Make sure that the focus is not on the input box so that a focus event
    // will be triggered.
    window.focus();
    gBrowser.selectedBrowser.focus();
    gButton.focus();

    // Focus the element and wait for focus event.
    gInput.addEventListener("focus", function onfocus() {
      gInput.removeEventListener("focus", onfocus, false);
      executeSoon(function() {
        EventUtils.synthesizeKey("e", { shiftKey: 1 }, content);
      });
    }, false);

    gInput.focus();
  });
}

// Test that specifying an empty event array clears all hidden breakpoints.
function testBreakOnNone()
{
  // Test calling pauseOnDOMEvents from a running state.
  gThreadClient.pauseOnDOMEvents([], function(packet) {
    is(packet.error, undefined, "The pause-on-none request completed successfully.");

    gClient.addListener("paused", unexpectedListener);

    // This non-capturing event listener is guaranteed to run after the page's
    // capturing one had a chance to execute and modify window.foobar.
    gInput.addEventListener("keyup", function tempHandler() {
      gInput.removeEventListener("keyup", tempHandler, false);
      is(content.wrappedJSObject.foobar, "keyupHandler", "No hidden breakpoint was hit.");
      gClient.removeListener("paused", unexpectedListener);
      testBreakOnClick();
    }, false);

    // Make sure that the focus is not on the input box so that a focus event
    // will be triggered.
    window.focus();
    gBrowser.selectedBrowser.focus();
    gButton.focus();

    // Focus the element and wait for focus event.
    gInput.addEventListener("focus", function onfocus() {
      gInput.removeEventListener("focus", onfocus, false);
      executeSoon(function() {
        EventUtils.synthesizeKey("g", { shiftKey: 1 }, content);
      });
    }, false);

    gInput.focus();
  });
}

function unexpectedListener(event, packet, callback) {
  gClient.removeListener("paused", unexpectedListener);
  ok(false, "An unexpected hidden breakpoint was hit.");
  gThreadClient.resume(testBreakOnClick);
}

// Test pause on a single event.
function testBreakOnClick()
{
  // Test calling pauseOnDOMEvents from a running state.
  gThreadClient.pauseOnDOMEvents(["click"], function(packet) {
    is(packet.error, undefined, "The pause-on-click request completed successfully.");

    gClient.addOneTimeListener("paused", function(event, packet) {
      is(packet.why.type, "pauseOnDOMEvents", "A hidden breakpoint was hit.");
      is(packet.frame.callee.name, "clickHandler", "The clickHandler is entered.");

      gThreadClient.resume(function() {
        gClient.close(finish);
      });
    });

    EventUtils.sendMouseEvent({ type: "click" }, gButton);
  });
}

registerCleanupFunction(function() {
  removeTab(gTab);
  gTab = null;
  gClient = null;
  gThreadClient = null;
  gInput = null;
  gButton = null;
});
