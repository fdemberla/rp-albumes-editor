# Product

## Register

product

## Users

Photographers and media production coordinators at a small studio or agency. They use this on a workstation (desktop app via Electron) to ingest shoots, organize photo albums, write EXIF metadata in bulk, and push files to SFTP storage and WordPress. The app is an internal tool, not public-facing. Users are professional but not necessarily technical; the admin role is held by a single person.

## Product Purpose

Editor de Metadatos is a desktop app for managing photo albums and EXIF metadata at scale. It lets photographers organize albums by event, edit per-photo metadata (title, description, keywords, GPS, copyright), upload to remote SFTP storage in batch, and publish to WordPress. Secondary workflows include bulk renaming and standalone image metadata editing. Success means photographers spend less time on post-production admin and more on shooting.

## Brand Personality

Professional, focused, reliable. The tool should feel like precision instrumentation — it does one job well and doesn't get in the way. No delight for its own sake, no flashy moments. Trust is earned through clarity and consistency.

## Anti-references

- No SaaS marketing aesthetics: no gradient hero sections, no big rounded CTAs, no testimonial cards, no pricing tables anywhere in the UI.
- No heavy enterprise gray: IBM-style flat grays, clunky table rows with hairline borders, indistinguishable panels. The UI should breathe.
- No dark hacker terminal aesthetic: no green-on-black, no monospace everything, no deliberate rawness.

## Accessibility & Inclusion

WCAG AA is the target. The app is used on desktop monitors under controlled lighting (studio or office). Focus indicators and keyboard navigation should work throughout. Color tags must not rely on color alone.

## Strategic Design Principles

1. **Density over decoration.** The primary users are doing production work. Information density matters more than whitespace for its own sake.
2. **One task, one surface.** Each screen should have one clear primary action. Secondary actions are reachable but visually subordinate.
3. **Status is always visible.** Connection state (DB, SFTP), upload progress, and errors should be persistent and unambiguous, not modal interruptions.
4. **Forms are the product.** EXIF editing forms are the core interface. They should be easy to scan, tab through, and batch-apply. Field labels are always visible.
5. **Dark mode is a first-class citizen.** Many users work in color-calibrated studios with controlled ambient light. Dark mode is not optional.
