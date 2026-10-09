# OMEGA — exact original source recovery

**Historical source preserved, original code not overwritten.**

The `MANIFEST.json` file lists 11 historical Git branch heads and **448 file versions** that were missing at their original paths or differed from the current `main` tree at the point of recovery. Every one of these versions is stored at:

`recovery/historical-source-versions/<branch-with-slashes-replaced-by-__>/<original-path>`

The stored Git blob SHA exactly matches the original branch's file SHA. **All 448 source objects were independently compared against the current Git tree after restoration.** Files already byte-identical on main were not duplicated. There are 111 distinct historical blob contents within the 448 paths.

The historical branch refs have also been restored and kept. The canonical implementation remains `omega/` and `omega-mobile/`. Historical copies are inert and are **not** second active agents/tools/servers. The two removed top-level MCP descriptors remain archived rather than reactivated, preserving mobile-safe packaging.

The exact recovery contents are tested in GitHub CI by `tools/omega-assurance/test_historical_sources.py`. This preservation layer does **not** assert that every prior feature is fully integrated into the current runtime.
