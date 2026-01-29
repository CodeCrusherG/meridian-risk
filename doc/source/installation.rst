Installation
============

Meridian Risk requires Python 3.12 or newer. Install this project from its local
source directory; the application is not published to PyPI.

.. code-block:: bash

   uv sync --locked --extra dashboard
   npm ci --prefix dashboard
   make dev

Open http://127.0.0.1:5174 for the dashboard. See the root README for test and
production-build commands. The numerical engine remains available through the
``optbinning`` import namespace. The ``distributed`` and ``ecos`` extras are
optional and are not required to use the dashboard.
