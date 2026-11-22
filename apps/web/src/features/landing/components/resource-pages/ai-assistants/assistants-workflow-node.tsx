import { AgentAvatar } from "../../agents/agent-avatar"
import type { AssistantsWorkflowCopy, AssistantsWorkflowNode as WorkflowNode } from "./assistants-workflow-data"
import styles from "./assistants-workflow.module.css"

function AssistantsWorkflowNode({ node, copy }: { node: WorkflowNode; copy: AssistantsWorkflowCopy }) {
  return (
    <foreignObject x={node.x} y={node.y} width={node.width} height={node.height} className={styles.nodeViewport}>
      <div className={styles.node} data-workflow-node={node.id}>
        <span className={styles.activeOutline} data-workflow-active />
        <div className={styles.head}>
          {node.kind !== "case" ? <span className={styles.avatar}>
            {node.kind === "agent" ? (
              <AgentAvatar fallbackSrc={`/agents/${node.agent}.svg`} definitionSrc={`/agents/${node.agent}.json`}
                color={node.color} restingLook={{ x: .15, y: 0 }} />
            ) : (
              <svg className={styles.nodeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="9" cy="7" r="3" /><path d="M3 21v-3a5 5 0 0 1 10 0v3M15 11l2 2 4-4" />
              </svg>
            )}
          </span> : null}
          <span className={styles.title}>{copy[node.id].title}</span>
          <span className={styles.status}>
            <span className={styles.pending} data-workflow-pending />
            <svg className={styles.spinner} viewBox="0 0 12 12" aria-hidden="true" data-workflow-spinner>
              <circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="15 11" />
            </svg>
            {node.kind !== "review" ? <svg className={styles.done} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-workflow-done>
              <path d="m2.5 6 2.3 2.3L9.5 3.5" />
            </svg> : null}
          </span>
        </div>
        <p className={styles.description}>{copy[node.id].description}</p>
        {node.kind === "review" ? <span className={styles.reviewAction} data-workflow-action>{copy.action}<span aria-hidden="true">↗</span></span> : null}
      </div>
    </foreignObject>
  )
}

export { AssistantsWorkflowNode }
