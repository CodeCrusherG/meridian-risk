.PHONY: dev build test

dev:
	.venv/bin/python scripts/dev.py

build:
	npm run build --prefix dashboard

test:
	.venv/bin/python -m pytest -q
	npm run test:e2e --prefix dashboard
