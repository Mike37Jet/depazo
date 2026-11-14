import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from depazo.bootstrap import create_api_app

app = create_api_app()
