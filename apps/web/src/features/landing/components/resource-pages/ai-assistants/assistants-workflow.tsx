import { ResourcePreviewVeil, ResourcePreviewVeilGradient } from "../resource-preview-backdrop"
import { AssistantsWorkflowMotion } from "./assistants-workflow-motion"
import { assistantsWorkflowNodes, assistantsWorkflowEdges, type AssistantsWorkflowCopy } from "./assistants-workflow-data"
import { AssistantsWorkflowNode } from "./assistants-workflow-node"
import styles from "./assistants-workflow.module.css"

function AssistantsWorkflow({ copy, idPrefix }: { copy: AssistantsWorkflowCopy; idPrefix: string }) {
  return (
    <svg className={styles.artwork} fill="none" viewBox="0 0 629 427" aria-hidden="true">
      <defs><ResourcePreviewVeilGradient idPrefix={idPrefix} /></defs>
      <AssistantsWorkflowMotion>
        {assistantsWorkflowEdges.map(edge => (
          <g key={edge.id}>
            <path className={styles.edge} d={edge.path} />
            <path className={styles.edgeRun} d={edge.path} data-workflow-edge={edge.id} />
          </g>
        ))}
        {assistantsWorkflowNodes.map(node => <AssistantsWorkflowNode key={node.id} node={node} copy={copy} />)}
      </AssistantsWorkflowMotion>
      <ResourcePreviewVeil idPrefix={idPrefix} />
    </svg>
  )
}

export { AssistantsWorkflow }
