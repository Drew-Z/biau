# Playlab Game Showcase Contract Design

## Direction

Separate Playlab/Game status into independent signals:

- public hub entry availability;
- individual playable game entries;
- project-detail case-study evidence and screenshots;
- mobile/desktop interaction caveats;
- future deployment or asset gates.

## Candidate Improvements

- Tighten `playlab-synthetic.json` contract so required checks cannot disappear or be mislabeled.
- Ensure the main site distinguishes Playlab hub, individual games, and project case pages.
- Add or refine UI/status checks for external links, title/favicon alignment, and playable-entry status.

## Safety

Only use public static URLs and low-sensitive local evidence. Do not expose private deployment dashboards, unpublished builds, local absolute paths, or platform tokens.

