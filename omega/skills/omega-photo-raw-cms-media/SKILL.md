---
name: omega-photo-raw-cms-media
description: Use for real media pipelines involving RAW-photo planning, ICC color-management execution, character-reference consistency and FFmpeg-based non-linear timeline rendering.
---

# RAW, CMS, Photo and Video Pipeline

`raw-photo-plan` identifies an explicit input/output recipe and candidate processors such as darktable, RawTherapee, dcraw or ImageMagick, while reporting that Adobe Photoshop/Lightroom automation is unavailable without a connected Adobe surface. `color-cms-execute` delegates an ICC conversion to ImageMagick when real profiles/files are supplied. `video-timeline-plan` creates an ordered edit description and `video-render` delegates trims/concatenation to FFmpeg inside the authorized workspace. Character consistency is measured only from embeddings supplied by a real vision provider; cosine similarity is not proof of identity. Preserve originals, metadata and color profiles and avoid claiming visual perfection without rendered inspection.