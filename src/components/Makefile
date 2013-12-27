# Makefile for compiling Panic Button XPCOM type libraries

XPIDL_INC=c:/xulrunner-sdk/idl
XPIDL=xpidl.exe

nsIBrowserSession.xpt: nsIBrowserSession.idl nsBrowserSession.js
	$(XPIDL) -m typelib -w -v -I $(XPIDL_INC) -o nsIBrowserSession nsIBrowserSession.idl

clean:
	rm *.xpt

# END Makefile
