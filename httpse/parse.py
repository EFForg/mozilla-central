#!/usr/bin/env python
# This script pulls all target urls from HTTPS-Everywhere Rulesets. 
# It does not print any domain names containing *, any containing "www." 
# (which is taken care of by the mochitest), and all rulesets that 
# are already deactivated by designation as "default_off".
# The test can be configured to also ignore rulesets already tagged 
# as "mixedcontent".

import xml.parsers.expat
import glob
import os
import sys

class HTTPSERuleParser:

		
	
	def __init__(self, httpse_dir, urls_path, urlsperfile):
		#checks for valid path name
		rules_dir = httpse_dir+'/src/chrome/content/rules'
		if not os.path.exists(os.path.dirname(rules_dir)):
			print "Please submit valid path: {0} [https-everywhere git repository directory]".format(sys.argv[0])
			return

		root = os.getcwd()
		
		#changes directory to user input
		os.chdir(rules_dir)

		self.num = 0
		self.domains = []

		#prints the name of the file and the url for each target tag
		for filename in glob.glob("*.xml"):
			text = open(filename, "r").read()

			self.disabled_by_default = False
			self.domains_for_this_rule = []

			p = xml.parsers.expat.ParserCreate()
			p.StartElementHandler = self.start_element
			p.Parse(text, 1)

			#if the rule isn't disabled, add domains to self.domains
			if not self.disabled_by_default and len(self.domains_for_this_rule) > 0:
				self.domains += self.domains_for_this_rule

		# dedupe and sort the domains
		deduped_domains = []
		for domain in self.domains:
			if domain not in deduped_domains:
				deduped_domains.append(domain)
		deduped_domains.sort()	
		print "There are " + str(len(deduped_domains)) + " domains to test"

		index = 1
		filenum = 1
		
		
		os.chdir(root)

		if not os.path.exists(urls_path):
			os.makedirs(urls_path)
			
		os.chdir(urls_path)	
 
		filename = 'top' + str(filenum) + 'pizza.csv'
		f = open(filename, 'w')
		filenum += 1
		print f
		
		for domain in deduped_domains:
			if index % urlsperfile == 0:
				f.close
				filename = 'top' + str(filenum) + 'pizza.csv'
				f = open(filename, 'w')			
				filenum += 1
				print f
							
			index += 1
			try:
				f.write(domain.encode('ascii', 'xmlcharrefreplace') + '\n')
				#f.write("{0}\n".format(domain))
			
			except:
				print "PASSING" + domain + " NOW *****"
				pass	
	
	
	
	def start_element(self, name, attrs):
		# exec 'checkable = 1' in globals()
		if name == "ruleset":
			for n in range(0, len(attrs)):
				key = attrs.keys()[n]
				value = attrs.values()[n]
				if key == "default_off":
					self.disabled_by_default = True
				elif (key == "platform") and ('mixedcontent' in value):
					self.disabled_by_default = False 
					#set above to True to ignore rulesets marked as mixedcontent
	
		if name == "target":
			# print 'Start element:', name, attrs
			for n in range(0, len(attrs)):
				domain = attrs.values()[n]
				if '*' not in domain and 'www' not in domain:
					self.domains_for_this_rule.append(domain)
			
if __name__ == '__main__':
	#checks for correct number of user arguments
	if len(sys.argv) != 4 :
		print "Usage: {0} [https-everywhere git repository directory] [num urls per csv] [path to domain files]".format(sys.argv[0])
		sys.exit()

	httpse_dir = sys.argv[1]
	urlsperfile = float(sys.argv[2])
	urls_path = sys.argv[3]
	HTTPSERuleParser(httpse_dir, urls_path, urlsperfile);

