APP    = guess-the-monument
DIST   = dist
ENTRY  = backend/app.py
PYINST = pyinstaller --onefile --clean

# Separator for --add-data differs by OS (: on Unix, ; on Windows)
ifeq ($(OS), Windows_NT)
  SEP         = ;
  NATIVE_NAME = $(APP)-win
else
  SEP         = :
  UNAME       := $(shell uname -s)
  ifeq ($(UNAME), Darwin)
    NATIVE_NAME = $(APP)-mac
  else
    NATIVE_NAME = $(APP)-linux
  endif
endif

DATA_NAT = --add-data "public$(SEP)public" --add-data "images$(SEP)images"
DATA_U   = --add-data "public:public" --add-data "images:images"
DATA_W   = --add-data "public;public" --add-data "images;images"

.PHONY: all native linux mac windows clean

all: linux mac windows

$(DIST):
	mkdir -p $@

# ── Native — no Docker ────────────────────────────────────────────────────────
# Builds for the current OS using the local Python environment.
# Produces a fully self-contained binary (Python + Flask + frontend bundled).
# Works on Linux, macOS, and Windows (MSYS2 / Git Bash).
# Output: dist/guess-the-monument-{linux|mac|win[.exe]}
native: | $(DIST)
	pip install -q pyinstaller flask
	$(PYINST) $(DATA_NAT) --name $(NATIVE_NAME) $(ENTRY)
	cp dist/$(NATIVE_NAME)* $(DIST)/

# ── Linux — Docker ────────────────────────────────────────────────────────────
# Builds inside a Debian-slim container for a portable glibc-linked binary.
# Output: dist/guess-the-monument-linux
linux: | $(DIST)
	docker run --rm -v "$(CURDIR):/src" -w /src python:3.12-slim sh -c \
	  'pip install -q pyinstaller flask && \
	   $(PYINST) $(DATA_U) --name $(APP)-linux $(ENTRY)'
	cp dist/$(APP)-linux $(DIST)/$(APP)-linux

# ── macOS — native only ───────────────────────────────────────────────────────
# Apple forbids running macOS in Docker; must run on a Mac.
# Equivalent to: make native   (when running on macOS)
# Output: dist/guess-the-monument-mac
mac: | $(DIST)
	pip install -q pyinstaller flask
	$(PYINST) $(DATA_U) --name $(APP)-mac $(ENTRY)
	cp dist/$(APP)-mac $(DIST)/$(APP)-mac

# ── Windows — Docker + Wine ───────────────────────────────────────────────────
# Cross-compiles via Wine inside Docker (cdrx/pyinstaller-windows).
# Output: dist/guess-the-monument-win.exe
windows: | $(DIST)
	docker run --rm \
	  -v "$(CURDIR):/src" -w /src \
	  --entrypoint bash \
	  cdrx/pyinstaller-windows:python3 \
	  -c 'wine pip install -q flask && \
	      wine pyinstaller --onefile --clean $(DATA_W) \
	        --name $(APP)-win $(ENTRY)'
	cp dist/$(APP)-win.exe $(DIST)/$(APP)-win.exe

# ── Cleanup ───────────────────────────────────────────────────────────────────
clean:
	rm -rf build dist __pycache__ *.spec
