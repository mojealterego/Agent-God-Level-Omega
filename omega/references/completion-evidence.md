# Completion Evidence

Minimum applicable evidence:
- repository + branch + revision;
- final diff;
- test command and exit status;
- build/package command and exit status;
- security/static checks required by project;
- runtime verification when available;
- remote CI when acceptance requires it;
- artifact path/id/hash when requested;
- deployment revision/health when requested.

Forbidden substitutes:
- "should pass"
- "looks correct"
- "architecture is sound"
- generated source code in place of a requested binary/artifact
- local build in place of required remote CI
- unit tests described as formal proof
