import importlib.util
import sys

def run_pyc(module_name, pyc_file):
    spec = importlib.util.spec_from_file_location(module_name, pyc_file)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = mod
    spec.loader.exec_module(mod)
    return mod

# Run main.pyc
main = run_pyc("main", "main.py")