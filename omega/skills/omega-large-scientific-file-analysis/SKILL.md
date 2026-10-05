---
name: omega-large-scientific-file-analysis
description: Use for large-file streaming and scientific high-density formats where loading an entire file into memory would be wasteful or unsafe.
---

# Large and Scientific File Analysis

`largefile-scan` reads a file in bounded chunks, counts bytes and computes SHA-256 without loading the whole content at once. `scientific-inspect` supports HDF5 through `h5py`, returning group/dataset paths, shapes, dtypes and sizes, and supports streaming summary statistics for FASTA/FASTQ sequencing text. This does not claim BAM/CRAM support when `pysam` or another genomic backend is absent. Use explicit record/item limits to keep work bounded. Raw proprietary scientific formats should be delegated to a verified provider rather than guessed. The module is designed for structural inspection, integrity and metadata summaries, not automatic scientific interpretation of every dataset.