# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is mozilla.org code.
#
# The Initial Developer of the Original Code is Joel Maher.
#
# Portions created by the Initial Developer are Copyright (C) 2010
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
# Joel Maher <joel.maher@gmail.com> (Original Developer)
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****

import sys
import os
import time
import socket
import tempfile

sys.path.insert(0, os.path.abspath(os.path.realpath(os.path.dirname(sys.argv[0]))))

from automation import Automation
from runtests import Mochitest
from runtests import MochitestOptions
from runtests import MochitestServer

import devicemanager

class RemoteAutomation(Automation):
    _devicemanager = None
    
    def __init__(self, deviceManager, product):
        self._devicemanager = deviceManager
        self._product = product
        Automation.__init__(self)

    def setDeviceManager(self, deviceManager):
        self._devicemanager = deviceManager
        
    def setProduct(self, productName):
        self._product = productName
        
    def waitForFinish(self, proc, utilityPath, timeout, maxTime, startTime, debuggerInfo):
        status = proc.wait()
        print proc.stdout
        # todo: consider pulling log file from remote
        return status
        
    def buildCommandLine(self, app, debuggerInfo, profileDir, testURL, extraArgs):
        cmd, args = Automation.buildCommandLine(self, app, debuggerInfo, profileDir, testURL, extraArgs)
        # Remove -foreground if it exists, if it doesn't this just returns
        try:
          args.remove('-foreground')
        except:
          pass
#TODO: figure out which platform require NO_EM_RESTART
#        return app, ['--environ:NO_EM_RESTART=1'] + args
        return app, args

    def Process(self, cmd, stdout = None, stderr = None, env = None, cwd = '.'):
        return self.RProcess(self._devicemanager, self._product, cmd, stdout, stderr, env, cwd)

    # be careful here as this inner class doesn't have access to outer class members    
    class RProcess(object):
        # device manager process
        dm = None
        def __init__(self, dm, product, cmd, stdout = None, stderr = None, env = None, cwd = '.'):
            self.dm = dm
            print "going to launch process: " + str(self.dm.host)
            self.proc = dm.launchProcess(cmd)
            exepath = cmd[0]
            name = exepath.split('/')[-1]
            self.procName = name

            # Setting timeout at 1 hour since on a remote device this takes much longer
            self.timeout = 3600
            time.sleep(15)

        @property
        def pid(self):
            hexpid = self.dm.processExist(self.procName)
            if (hexpid == '' or hexpid == None):
                hexpid = "0x0"
            return int(hexpid, 0)
    
        @property
        def stdout(self):
            return self.dm.getFile(self.proc)
 
        def wait(self, timeout = None):
            timer = 0
            interval = 5

            if timeout == None:
                timeout = self.timeout

            while (self.dm.processExist(self.procName)):
                time.sleep(interval)
                timer += interval
                if (timer > timeout):
                    break

            if (timer >= timeout):
                return 1
            return 0
 
        def kill(self):
            self.dm.killProcess(self.procName)
 

class RemoteOptions(MochitestOptions):

    def __init__(self, automation, scriptdir, **kwargs):
        defaults = {}
        MochitestOptions.__init__(self, automation, scriptdir)

        self.add_option("--deviceIP", action="store",
                    type = "string", dest = "deviceIP",
                    help = "ip address of remote device to test")
        defaults["deviceIP"] = None

        self.add_option("--devicePort", action="store",
                    type = "string", dest = "devicePort",
                    help = "port of remote device to test")
        defaults["devicePort"] = 20701

        self.add_option("--remoteProductName", action="store",
                    type = "string", dest = "remoteProductName",
                    help = "The executable's name of remote product to test - either fennec or firefox, defaults to fennec")
        defaults["remoteProductName"] = "fennec"

        self.add_option("--remote-logfile", action="store",
                    type = "string", dest = "remoteLogFile",
                    help = "Name of log file on the device relative to the device root.  PLEASE ONLY USE A FILENAME.")
        defaults["remoteLogFile"] = None

        self.add_option("--remote-webserver", action = "store",
                    type = "string", dest = "remoteWebServer",
                    help = "ip address where the remote web server is hosted at")
        defaults["remoteWebServer"] = None

        self.add_option("--http-port", action = "store",
                    type = "string", dest = "httpPort",
                    help = "ip address where the remote web server is hosted at")
        defaults["httpPort"] = automation.DEFAULT_HTTP_PORT

        self.add_option("--ssl-port", action = "store",
                    type = "string", dest = "sslPort",
                    help = "ip address where the remote web server is hosted at")
        defaults["sslPort"] = automation.DEFAULT_SSL_PORT

        defaults["remoteTestRoot"] = None
        defaults["logFile"] = "mochitest.log"
        defaults["autorun"] = True
        defaults["closeWhenDone"] = True
        defaults["testPath"] = ""
        defaults["app"] = None

        self.set_defaults(**defaults)

    def verifyRemoteOptions(self, options, automation):
        options.remoteTestRoot = automation._devicemanager.getDeviceRoot()

        options.certPath = options.remoteTestRoot + "/certs"

        if options.remoteWebServer == None:
          if os.name != "nt":
            options.remoteWebServer = get_lan_ip()
          else:
            print "ERROR: you must specify a remoteWebServer ip address\n"
            return None

        options.webServer = options.remoteWebServer

        if (options.deviceIP == None):
          print "ERROR: you must provide a device IP"
          return None

        if (options.remoteLogFile == None):
          options.remoteLogFile =  automation._devicemanager.getDeviceRoot() + '/test.log'

        # Set up our options that we depend on based on the above
        productRoot = options.remoteTestRoot + "/" + automation._product

        # Set this only if the user hasn't set it
        if (options.utilityPath == None):
          options.utilityPath = productRoot + "/bin"

        # If provided, use cli value, otherwise reset as remoteTestRoot
        if (options.app == None):
          options.app = productRoot + "/" + options.remoteProductName

        # Only reset the xrePath if it wasn't provided
        if (options.xrePath == None):
          if (automation._product == "fennec"):
            options.xrePath = productRoot + "/xulrunner"
          else:
            options.xrePath = options.utilityPath

        return options

    def verifyOptions(self, options, mochitest):
        # since we are reusing verifyOptions, it will exit if App is not found
        temp = options.app
        options.app = sys.argv[0]
        tempPort = options.httpPort
        tempSSL = options.sslPort
        tempIP = options.webServer
        options = MochitestOptions.verifyOptions(self, options, mochitest)
        options.webServer = tempIP
        options.app = temp
        options.sslPort = tempSSL
        options.httpPort = tempPort

        return options 

class MochiRemote(Mochitest):

    _automation = None
    _dm = None

    def __init__(self, automation, devmgr, options):
        self._automation = automation
        Mochitest.__init__(self, self._automation)
        self._dm = devmgr
        self.runSSLTunnel = False
        self.remoteProfile = options.remoteTestRoot + "/profile"
        self.remoteLog = options.remoteLogFile

    def cleanup(self, manifest, options):
        self._dm.getFile(self.remoteLog, self.localLog)
        self._dm.removeFile(self.remoteLog)
        self._dm.removeDir(self.remoteProfile)

    def findPath(self, paths, filename = None):
      for path in paths:
        p = path
        if filename:
          p = os.path.join(p, filename)
        if os.path.exists(self.getFullPath(p)):
          return path
      return None

    def startWebServer(self, options):
      """ Create the webserver on the host and start it up """
      remoteXrePath = options.xrePath
      remoteProfilePath = options.profilePath
      remoteUtilityPath = options.utilityPath
      localAutomation = Automation()

      paths = [options.xrePath, localAutomation.DIST_BIN, self._automation._product, os.path.join('..', self._automation._product)]
      options.xrePath = self.findPath(paths)
      if options.xrePath == None:
        print "ERROR: unable to find xulrunner path for %s, please specify with --xre-path" % (os.name)
        sys.exit(1)
      paths.append("bin")
      paths.append(os.path.join("..", "bin"))

      xpcshell = "xpcshell"
      if (os.name == "nt"):
        xpcshell += ".exe"

      if (options.utilityPath):
        paths.insert(0, options.utilityPath)
      options.utilityPath = self.findPath(paths, xpcshell)
      if options.utilityPath == None:
        print "ERROR: unable to find utility path for %s, please specify with --utility-path" % (os.name)
        sys.exit(1)

      options.profilePath = tempfile.mkdtemp()
      self.server = MochitestServer(localAutomation, options)
      self.server.start()

      self.server.ensureReady(self.SERVER_STARTUP_TIMEOUT)
      options.xrePath = remoteXrePath
      options.utilityPath = remoteUtilityPath
      options.profilePath = remoteProfilePath
         
    def stopWebServer(self, options):
        self.server.stop()
        
    def runExtensionRegistration(self, options, browserEnv):
        pass
        
    def buildProfile(self, options):
        manifest = Mochitest.buildProfile(self, options)
        self.localProfile = options.profilePath
        if self._dm.pushDir(options.profilePath, self.remoteProfile) == None:
            raise devicemanager.FileError("Unable to copy profile to device.")

        options.profilePath = self.remoteProfile
        return manifest
        
    def buildURLOptions(self, options):
        self.localLog = options.logFile
        options.logFile = self.remoteLog
        retVal = Mochitest.buildURLOptions(self, options)
        options.logFile = self.localLog
        return retVal

    def installChromeFile(self, filename, options):
        parts = options.app.split('/')
        if (parts[0] == options.app):
          return "NO_CHROME_ON_DROID"
        path = '/'.join(parts[:-1])
        manifest = path + "/chrome/" + os.path.basename(filename)
        if self._dm.pushFile(filename, manifest) == None:
            raise devicemanager.FileError("Unable to install Chrome files on device.")
        return manifest

    def getLogFilePath(self, logFile):             
        return logFile

#
# utilities to get the local ip address
#
if os.name != "nt":
  import fcntl
  import struct
  def get_interface_ip(ifname):
      s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
      return socket.inet_ntoa(fcntl.ioctl(
                      s.fileno(),
                      0x8915,  # SIOCGIFADDR
                      struct.pack('256s', ifname[:15])
                      )[20:24])

def get_lan_ip():
  ip = socket.gethostbyname(socket.gethostname())
  if ip.startswith("127.") and os.name != "nt":
    interfaces = ["eth0","eth1","eth2","wlan0","wlan1","wifi0","ath0","ath1","ppp0"]
    for ifname in interfaces:
      try:
        ip = get_interface_ip(ifname)
        break;
      except IOError:
        pass
  return ip


def main():
    scriptdir = os.path.abspath(os.path.realpath(os.path.dirname(__file__)))
    dm = devicemanager.DeviceManager(None, None)
    auto = RemoteAutomation(dm, "fennec")
    parser = RemoteOptions(auto, scriptdir)
    options, args = parser.parse_args()

    dm = devicemanager.DeviceManager(options.deviceIP, options.devicePort)
    auto.setDeviceManager(dm)
    options = parser.verifyRemoteOptions(options, auto)
    if (options == None):
      print "ERROR: Invalid options specified, use --help for a list of valid options"
      sys.exit(1)

    productPieces = options.remoteProductName.split('.')
    if (productPieces != None):
      auto.setProduct(productPieces[0])
    else:
      auto.setProduct(options.remoteProductName)

    mochitest = MochiRemote(auto, dm, options)

    options = parser.verifyOptions(options, mochitest)
    if (options == None):
      sys.exit(1)
    
    auto.setServerInfo(options.webServer, options.httpPort, options.sslPort)
    sys.exit(mochitest.runTests(options))
    
if __name__ == "__main__":
  main()

