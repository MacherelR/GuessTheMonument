# PyInstaller spec — run from the project root:
#   pyinstaller guessthemonument.spec
#
# The resulting binary embeds the Flask backend, public/ UI files, and images/.
# On launch it serves the game at http://localhost:3000.

from PyInstaller.utils.hooks import collect_all

datas = [
    ('public', 'public'),
    ('images', 'images'),
]
hiddenimports = []

# Collect all Flask sub-packages that PyInstaller might miss.
for pkg in ('flask', 'werkzeug', 'jinja2', 'click', 'itsdangerous'):
    pkg_datas, pkg_binaries, pkg_hiddenimports = collect_all(pkg)
    datas     += pkg_datas
    hiddenimports += pkg_hiddenimports

a = Analysis(
    ['backend/app.py'],
    pathex=['backend'],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='guessthemonument',
    debug=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
)
