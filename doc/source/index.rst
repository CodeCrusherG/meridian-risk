.. optbinning documentation master file, created by
   sphinx-quickstart on Thu Dec 19 10:54:06 2019.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.


Meridian Risk: modelling engine reference
========================================

Meridian Risk combines credit exposure analytics, counterparty review and model
validation with the OptBinning engine. See the project README for the dashboard
and local API. This reference documents the retained ``optbinning`` Python API.

OptBinning performs optimal discretization of numeric and categorical variables
for binary, continuous and multiclass targets. The original engine was created
by Guillermo Navas-Palencia and is distributed under the Apache 2.0 license.

.. toctree::
   :maxdepth: 1
   :caption: Getting started

   installation
   tutorials
   release_notes

.. toctree::
   :maxdepth: 1
   :caption: Optimal binning algorithms

   binning_binary
   binning_continuous
   binning_multiclass
   binning_process
   binning_tables
   binning_utilities

.. toctree::
   :maxdepth: 1
   :caption: Scorecard development

   scorecard
   counterfactual

.. toctree::
   :maxdepth: 1
   :caption: Optimal piecewise binning

   piecewise_binary
   piecewise_continuous

.. toctree::
   :maxdepth: 1
   :caption: Batch and stream optimal binning

   binning_sketch
   binning_process_sketch

.. toctree::
   :maxdepth: 1
   :caption: Binning under uncertainty

   binning_scenarios

.. toctree::
   :maxdepth: 1
   :caption: Optimal binning 2D

   binning_2d_binary
   binning_2d_continuous
   binning_2d_tables

.. toctree::
   :maxdepth: 1
   :caption: Other binning algorithms

   mdlp

.. toctree::
   :maxdepth: 1
   :caption: Utilities

   outlier