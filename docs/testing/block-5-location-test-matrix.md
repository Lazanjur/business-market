# Block 5 Test Matrix — Location and Geo-Privacy Engine

## Unit tests
- location visibility serialization masks exact coordinates for Basic-tier viewers
- sole trader registered-office visibility downgrades away from street-level precision
- disclosure-consent logic activates on any visible state
- viewport clustering aggregates dense map regions

## Integration tests
- create location -> geocode queued -> centroid stored -> search projection refreshed
- address update -> old verification cleared -> geocode review task opened
- document verification request -> admin review -> address verified
- postcard request -> dispatch record created -> code confirmation verifies location

## Security / privacy tests
- hidden locations never appear in nearby or map queries
- country/region visibility never leaks exact coordinates
- city visibility only returns masked coordinates
- sole trader registered addresses never return exact street-level precision to non-self viewers

## Operational tests
- failed geocodes create review tasks within the same transaction boundary as the failure state
- review queue sorts urgent document and geocode cases ahead of postcard follow-ups
- delivery coverage snapshots refresh when radius or verified coordinates change
