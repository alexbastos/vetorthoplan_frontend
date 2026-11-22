# AI Assistants sketches

Current implementation:

- AI-01 (`reports`): implemented list-to-draft scene in
  `report-assistant-scene.tsx`, with server-localized Rascunho/Draft copy supplied
  by `report-assistant-sketch.tsx`.
- AI-02 (`cases`): implemented context-to-conversation scene in
  `case-assistant-scene.tsx`, with server-localized prompt and summary supplied
  by `case-assistant-sketch.tsx`. The typing dots appear only during their
  declared interval and are hidden in the completed static fallback.
- AI-03 (`workflows`): implemented document-to-agents scene in
  `workflow-scene.tsx`, with server-localized Organize/Prepare/Review labels
  supplied by `workflow-sketch.tsx`. Scoped paths carry transient blue signals
  between two agents and a document awaiting professional review.

These are planned subjects, not implemented product capabilities. Develop one
scene at a time after its composition is agreed. Keep the existing 240 × 150
native SVG viewBox, abstract supporting UI, short localized labels and project
palette. Reuse `ResourceSketchFrame`, `ResourceSketchMotion` and the actions/styles
in `../../sketches/`; do not create another playback controller.

Use scoped IDs, a completed static fallback, reduced-motion handling and the
existing initialization guard when artwork is added. Keep all examples local
and illustrative; do not invoke models, agents or clinical APIs from the scene.

## Supplied reference directions

The user supplied two native SVG scenes. Keep their geometry and normalized
timings as the basis for the next one-at-a-time implementation; their pasted
opacity, transformation matrices and dash arrays are runtime snapshots, not
canonical initial states. The existing shared controller should prepare motion.

### AI-01: report assistant

Adapt the list-to-draft reference. Its source list is at (20.5,22.5), 98 × 106,
with four abstract rows at y=40/60/80/100. The second row's pill becomes the blue
selection at .58. Its curved connector runs from (112,60) to (146,74) at .6.
The output document at (146.5,36.5), 76 × 86, draws at .5; its Draft label appears
at .6, and its abstract text lines draw at .64/.67/.7/.73. The small final arrow
control appears at .8/.82 and compresses at .88.

Change Draft to localized Rascunho/Draft; keep the other content abstract.
The sequence illustrates preparation of a draft for review, not an approved or
automatically issued clinical report. Preserve the existing project blue palette.

### AI-02: case assistant

Adapt the conversation reference. The outer context window at (10.5,18.5) is
220 × 114; its headings and supporting content remain strokes. The agent panel
at (98.5,30.5) is 122 × 94. The prompt bubble appears at .38/.4, three transient
typing dots at .5/.53/.56 disappear at .64, then the reply outline draws at .64,
reply text appears at .7 and the blue accent appears at .78.

Use brief localized case-related text such as Resumir caso/Summarize case and
Resumo pronto/Summary ready. Do not fill the diagram with long messages. The
typing dots must start hidden and remain hidden in the completed static view.

### AI-03: custom workflows

The scene keeps the shared 240 by 150 viewBox and abstract transparent panels:
an input document at (12.5,49.5), two agents at (88.5,24.5) and (88.5,87.5),
then an output document at (178.5,49.5). Source strokes draw first; blue signals
follow scoped connector paths at .3/.53/.74, activating each agent in sequence.
The output strokes draw at .87/.9/.93 before the Review label appears at .98.
Signals are hidden before travel and after arrival, including the static and
reduced-motion fallback. This is an illustrative future workflow, with no real
execution or implied clinical approval. It uses the existing follow/draw/pop/fade
actions and adds no playback controller, animation dependency or shared styles.
