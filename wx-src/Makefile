# Makefile for Panic Button/wx

EXT_VER=`./getver.pl`
DIST_FILE=panicbutton-$(EXT_VER).zip
DIST_DEST=../dist/
EXCLUDE=*~ *\.pl \.devel *\.release Makefile


$(DIST_FILE):
	zip -r $(DIST_FILE) * -x $(EXCLUDE)
	cp -v $(DIST_FILE) $(DIST_DEST)

clean:
	rm -v *.zip

# END Makefile
