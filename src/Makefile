# Makefile for Panic Button

EXT_VER=`./getver.pl`
DIST_FILE=panicbutton-$(EXT_VER).xpi
EXCLUDE=*~ *\.html *\.psp *\.pl *\.idl *\.devel *\.release Makefile


$(DIST_FILE): $(COMP_FILES) 
	zip -r $(DIST_FILE) * -x $(EXCLUDE)

clean:
	rm $(DIST_FILE)

# END Makefile
