import { Inter, Plus_Jakarta_Sans } from "next/font/google"

// Shared reference typography. Keep the existing variable names so the resource
// illustrations and other reference-based sections use the same font instances.
const referenceBody = Inter({ display: "swap", subsets: ["latin"], variable: "--font-preview-body" })
const referenceDisplay = Plus_Jakarta_Sans({ display: "swap", subsets: ["latin"], variable: "--font-preview-display" })

const landingReferenceFonts = `${referenceBody.variable} ${referenceDisplay.variable}`

export { landingReferenceFonts }
