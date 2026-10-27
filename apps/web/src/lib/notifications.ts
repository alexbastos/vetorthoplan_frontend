import { toast as sonnerToast, type ExternalToast } from "sonner"

type NotificationOptions = Omit<ExternalToast, "description" | "icon"> & {
  description: string
}

type Notification = (title: string, options: NotificationOptions) => string | number

// Each notification has a status icon, a short title and a required description.
// Read Sonner methods when called so updates and dismissals share its one store.
const toast: Record<"success" | "error" | "warning" | "info" | "loading", Notification> & {
  dismiss: typeof sonnerToast.dismiss
} = {
  success: (title, options) => sonnerToast.success(title, options),
  error: (title, options) => sonnerToast.error(title, options),
  warning: (title, options) => sonnerToast.warning(title, options),
  info: (title, options) => sonnerToast.info(title, options),
  loading: (title, options) => sonnerToast.loading(title, options),
  dismiss: id => sonnerToast.dismiss(id),
}

export { toast }
export type { NotificationOptions }
