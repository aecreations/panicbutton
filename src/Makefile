# Makefile for Panic Button

EXT_VER=`./getver.pl`
DIST_FILE=panicbutton-$(EXT_VER).xpi
COMP=./components
COMP_FILES=$(COMP)/nsIBrowserSession.xpt $(COMP)/nsBrowserSession.js
EXCLUDE=*~ *\.html *\.psp *\.pl *\.idl *\.devel *\.release Makefile $(COMP)/Makefile


$(DIST_FILE): $(COMP_FILES) 
	zip -r $(DIST_FILE) * -x $(EXCLUDE)

$(COMP_FILES):
	@cd $(COMP); make

clean:
	rm $(DIST_FILE)

clean-all:
	rm $(DIST_FILE)
	@cd $(COMP); make clean


# END Makefile
