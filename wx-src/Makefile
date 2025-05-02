# Makefile for Panic Button/wx

EXT_VER=`./getver.py`
DIST_FILE=panicbutton-$(EXT_VER).zip
EXCLUDE=*~ *\.py \.devel *\.release Makefile


$(DIST_FILE):
	zip -r $(DIST_FILE) * -x $(EXCLUDE)

clean:
	rm -v *.zip

# END Makefile
