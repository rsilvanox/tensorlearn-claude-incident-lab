// Regression eval for incident evt-synthetic-17 (see fixtures/incident.md).
// The prior defect removed the per-customer cache and pushed claims-core to
// 85 req/s against a limit of 50; the quick fix claimed success without a check.
// Every field must be present and well-formed: a missing value is a failure,
// never an assumed pass.

const UPSTREAM_LIMIT_PER_SECOND = 50;

export function evaluate(observation) {
  const violations = [];

  if (observation === null || typeof observation !== "object" || Array.isArray(observation)) {
    return { pass: false, violations: ["observation must be an object"] };
  }

  const calls = observation.upstreamCallsPerSecond;
  if (typeof calls !== "number" || !Number.isFinite(calls) || calls < 0) {
    violations.push("upstreamCallsPerSecond must be a finite, non-negative number");
  } else if (calls > UPSTREAM_LIMIT_PER_SECOND) {
    violations.push(
      `upstreamCallsPerSecond ${calls} exceeds the claims-core limit of ${UPSTREAM_LIMIT_PER_SECOND}`
    );
  }

  if (observation.cacheEnabled !== true) {
    violations.push("cacheEnabled must be true: the per-customer cache removal caused evt-synthetic-17");
  }

  const duplicates = observation.duplicateProposals;
  if (typeof duplicates !== "number" || !Number.isInteger(duplicates) || duplicates < 0) {
    violations.push("duplicateProposals must be a non-negative integer");
  } else if (duplicates !== 0) {
    violations.push(
      `duplicateProposals is ${duplicates}: reprocessing an event ID must not create another proposal`
    );
  }

  if (observation.clinicalPayloadLogged !== false) {
    violations.push("clinicalPayloadLogged must be false: clinical payloads must never be logged");
  }

  return { pass: violations.length === 0, violations };
}
