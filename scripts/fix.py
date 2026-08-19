import os
import pathlib

path = pathlib.Path("/data/user/0/ru.iiec.pydroid3/files/aarch64-linux-android/lib/python3.13/site-packages/pandas_ta/momentum/squeeze_pro.py")

if path.exists():
    text = path.read_text()
    fixed = text.replace("from numpy import NaN as npNaN", "from numpy import nan as npNaN")
    path.write_text(fixed)
    print("✅ Patched squeeze_pro.py successfully")
else:
    print("❌ File not found:", path)