# Contributing

1. Keep personal DSH configuration out of this repository.
2. Search the existing packages before adding a helper or dependency.
3. Keep package source dependency-free unless a dependency is justified and approved.
4. Run `pnpm run check` and the official npm audit command before opening a pull request.
5. Do not commit generated tarballs, `node_modules`, `.env`, credential files, or local profile patches.
6. Treat DSH internal contracts as version-sensitive; update `COMPATIBILITY.md` only after a real profile check.
