---
title: Versioning Strategy
description: Version numbering scheme and release process for the MCPAQL specification
version: 1.0.0-draft
status: draft
created: 2025-01-14
updated: 2025-01-14
---

This document describes the version numbering scheme and release process for the MCPAQL specification.

## Overview

MCPAQL follows [Semantic Versioning 2.0.0](https://semver.org/) (SemVer) for all specification releases. Semantic versioning provides a clear, predictable versioning scheme that communicates the nature of changes between releases to implementers and users of the specification.

## Version Format

```
MAJOR.MINOR.PATCH[-PRERELEASE]
```

### Components

| Component | Description |
|-----------|-------------|
| MAJOR | Breaking changes that require implementation updates |
| MINOR | New features, backward compatible |
| PATCH | Bug fixes, clarifications, backward compatible |
| PRERELEASE | Optional tag indicating release maturity |

### Examples

| Version | Description |
|---------|-------------|
| `1.0.0-draft` | Current working draft |
| `1.0.0` | First stable release |
| `1.1.0` | New features added (backward compatible) |
| `1.1.1` | Bug fixes or clarifications |
| `2.0.0` | Breaking changes from v1.x |

## Pre-release Tags

Pre-release versions use the following tags appended to the version number:

### `-draft`

Working draft, subject to significant change. Not recommended for production implementations.

```
1.0.0-draft
```

### `-alpha.N`

Early preview releases for initial feedback. APIs and behaviors may change substantially.

```
1.0.0-alpha.1
1.0.0-alpha.2
```

### `-beta.N`

Feature complete preview. APIs are stabilizing but may still change based on feedback.

```
1.0.0-beta.1
1.0.0-beta.2
```

### `-rc.N`

Release candidate. Final testing before stable release. Only critical bug fixes expected.

```
1.0.0-rc.1
1.0.0-rc.2
```

### Pre-release Progression

```
draft -> alpha.1 -> alpha.N -> beta.1 -> beta.N -> rc.1 -> rc.N -> stable
```

## Version Increment Rules

### MAJOR Version Increment

Increment MAJOR when making incompatible changes that require existing implementations to be updated:

- Removing or renaming required operations
- Changing the behavior of existing operations in breaking ways
- Modifying required request/response schemas incompatibly
- Removing or renaming required element types
- Changing security requirements in ways that break existing implementations

**Example**: Renaming the `list_elements` operation to `list_all` would require a MAJOR version bump.

### MINOR Version Increment

Increment MINOR when adding functionality in a backward compatible manner:

- Adding new optional operations
- Adding new element types
- Adding optional fields to existing schemas
- Extending capabilities without breaking existing implementations
- Adding new pre-defined values to enumerations (when implementations ignore unknown values)

**Example**: Adding a new `archive_element` operation would require a MINOR version bump.

### PATCH Version Increment

Increment PATCH for backward compatible bug fixes and clarifications:

- Correcting typos or unclear wording in the specification
- Adding examples or clarifications
- Fixing errors in documentation
- Non-functional improvements to the specification text

**Example**: Clarifying the expected behavior when an element is not found would be a PATCH release.

## Release Process

### 1. Create Release Branch

Create a release branch from `develop`:

```bash
git checkout develop
git pull origin develop
git checkout -b release/vX.Y.Z
```

### 2. Update Version Numbers

Update version references throughout the repository:

- Specification document in `docs/versions/`
- Version badges and references in `README.md`
- Any version constants or metadata

### 3. Update CHANGELOG

Add a new section to `CHANGELOG.md` documenting:

- New features
- Changes
- Deprecations
- Bug fixes
- Breaking changes (if MAJOR release)

### 4. Create Pull Request

Open a pull request from `release/vX.Y.Z` to `main`:

- Title: `Release vX.Y.Z`
- Description: Summary of changes, link to CHANGELOG entry
- Request reviews from maintainers

### 5. Tag Release

After PR approval and merge:

```bash
git checkout main
git pull origin main
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

### 6. Create GitHub Release

Create a GitHub release from the tag:

- Title: `vX.Y.Z`
- Description: Copy relevant CHANGELOG section
- Attach any release artifacts if applicable
- Mark as pre-release if using pre-release tags

### 7. Post-Release

After release:

```bash
git checkout develop
git merge main
git push origin develop
```

## Version Locations

Version information is maintained in the following locations:

| Location | Purpose |
|----------|---------|
| `docs/versions/vX.Y.Z.md` | Full specification document for each version |
| `CHANGELOG.md` | Complete version history with changes |
| `README.md` | Version badge showing current stable version |

### Specification Document Naming

Each version of the specification is stored as a separate document:

```
docs/versions/
  v1.0.0-draft.md
  v1.0.0.md
  v1.1.0.md
  v2.0.0.md
```

## Release Cadence

### Patch Releases

- **Frequency**: As needed
- **Trigger**: Documentation errors, clarifications, or minor corrections
- **Review**: Minimal review required

### Minor Releases

- **Frequency**: Quarterly, or as features accumulate
- **Trigger**: New features, enhancements, or accumulated improvements
- **Review**: Full review cycle with community feedback period

### Major Releases

- **Frequency**: Only when breaking changes are required
- **Trigger**: Fundamental changes to the specification that cannot be made backward compatible
- **Review**: Extended review cycle with migration guide and deprecation period

### Release Schedule Considerations

- Avoid releasing during major holidays or conference periods
- Provide adequate notice for breaking changes (MAJOR releases)
- Consider implementation burden when planning release frequency
- Batch related changes when possible to reduce release overhead

## Version Compatibility

### Backward Compatibility

MINOR and PATCH releases maintain backward compatibility:

- Implementations conforming to vX.Y.Z should work with vX.Y+1.Z specifications
- New optional features may not be supported, but existing functionality remains

### Forward Compatibility

Implementations should be designed for forward compatibility where possible:

- Ignore unknown fields in responses
- Handle unknown enumeration values gracefully
- Provide fallback behavior for unrecognized operations

## See Also

- [Semantic Versioning 2.0.0](https://semver.org/)
- [CHANGELOG.md](/CHANGELOG.md)
- [Contributing Guide](/CONTRIBUTING.md)
