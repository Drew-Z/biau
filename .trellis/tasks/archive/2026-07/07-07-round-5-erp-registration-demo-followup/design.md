# ERP Registration Demo Followup Design

## Direction

ERP demo readiness has two layers:

- code capability: registration route, bootstrap policy, default role, login/register UI, and local tests;
- production gate: deployed environment variables, low-permission demo account, and safe fixture data.

The task should improve the first layer locally and record the second layer as a manual gate.

## Candidate Improvements

- Tighten or add an ERP local check around registration bootstrap/open/closed behavior.
- Improve ERP login/register UI copy or state handling if the code shows obvious confusion.
- Update `blog-semi` status/manual-gate wording if it is stale relative to ERP code.
- Add a main-site check or doc note that distinguishes registration capability from credentialed smoke.

## Safety

Do not register a real production user, call real shop APIs, or expose demo credentials. If a real production validation is needed, write it as a manual gate with the required env keys and expected verification command.
