import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { registerHooks } from "node:module"
import test, { after, afterEach } from "node:test"
import ts from "typescript"
import { JSDOM } from "jsdom"

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000" })
for (const name of ["window", "document", "navigator", "HTMLElement", "Element", "MutationObserver", "getComputedStyle"])
  Object.defineProperty(globalThis, name, { configurable: true, value: name === "getComputedStyle" ? dom.window[name].bind(dom.window) : dom.window[name] })
globalThis.IS_REACT_ACT_ENVIRONMENT = true
globalThis.requestAnimationFrame = callback => setTimeout(callback, 0)
globalThis.cancelAnimationFrame = clearTimeout
dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })

registerHooks({ resolve(specifier, context, nextResolve) {
  if (context.parentURL?.includes("/node_modules/")) return nextResolve(specifier, context)
  if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$|\.css$/.test(specifier)) {
    try { return nextResolve(`${specifier}.tsx`, context) } catch { return nextResolve(`${specifier}.ts`, context) }
  }
  return nextResolve(specifier, context)
}, load(url, context, nextLoad) {
  if (url.startsWith("file:") && url.endsWith(".module.css") && !url.includes("/node_modules/")) {
    const css = readFileSync(new URL(url), "utf8")
    const classNames = [...css.matchAll(/\.([A-Za-z_][\w-]*)/g)].map(match => match[1])
    const classes = Object.fromEntries(classNames.map(name => [name, name]))
    return {
      format: "module",
      shortCircuit: true,
      source: `const style = document.createElement("style"); style.textContent = ${JSON.stringify(css)}; document.head.append(style); export default ${JSON.stringify(classes)};`,
    }
  }
  if (url.startsWith("file:") && url.endsWith(".tsx") && !url.includes("/node_modules/")) return {
    format: "module", shortCircuit: true, source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText,
  }
  return nextLoad(url, context)
} })

const React = await import("react")
const { render, waitFor, cleanup, act } = await import("@testing-library/react")
const { NextIntlClientProvider } = await import("next-intl")
const { Toaster } = await import("../src/components/ui/sonner.tsx")
const { default: iconStyles } = await import("../src/components/ui/sonner.module.css")
const { toast } = await import("../src/lib/notifications.ts")
const common = JSON.parse(readFileSync(new URL("../src/i18n/messages/pt-BR/common.json", import.meta.url), "utf8"))
const iconCss = readFileSync(new URL("../src/components/ui/sonner.module.css", import.meta.url), "utf8")
const iconRules = new Map([...iconCss.matchAll(/\.([A-Za-z_][\w-]*)\s*\{([^}]*)\}/g)].map(([, name, declarations]) => [name, declarations]))
const iconClassesByKind = {
  success: iconStyles.iconSuccess,
  error: iconStyles.iconError,
  warning: iconStyles.iconWarning,
  info: iconStyles.iconInfo,
  loading: iconStyles.iconLoading,
}

afterEach(() => { act(() => toast.dismiss()); cleanup(); document.documentElement.classList.remove("dark") })
after(() => dom.window.close())

test("every notification status renders an icon, a title and a separate description in both themes", async () => {
  // Toasts use the same white surface in both themes, so keep the palette's
  // contrasting shades instead of the lighter feedback colors for dark surfaces.
  const palette = { success: "sage-700", error: "coral-700", warning: "amber-500", info: "steel-700" }
  for (const kind of ["success", "error", "warning", "info"]) {
    const declarations = iconRules.get(iconClassesByKind[kind])
    assert.match(declarations, new RegExp(`color:\\s*var\\(--color-${palette[kind]}\\)`))
  }
  assert.match(iconRules.get(iconClassesByKind.loading), /color:\s*var\(--color-pewter\)/)

  for (const dark of [false, true]) {
    document.documentElement.classList.toggle("dark", dark)
    const view = render(React.createElement(NextIntlClientProvider, { locale: "pt-BR", timeZone: "UTC", messages: { common } }, React.createElement(Toaster)))
    for (const kind of ["success", "error", "warning", "info", "loading"]) {
      const id = `${dark ? "dark" : "light"}-${kind}`
      act(() => toast[kind](`Title ${kind}`, { description: `Description ${kind}`, duration: Infinity, testId: id }))
      const notification = await view.findByTestId(id)
      const icon = notification.querySelector("[data-icon]")
      const graphic = icon?.querySelector("svg")
      const content = notification.querySelector("[data-content]")
      const title = notification.querySelector("[data-title]")
      const description = notification.querySelector("[data-description]")

      assert.ok(graphic, `${kind} has a status icon`)
      assert.ok(graphic.classList.contains(iconStyles.statusIcon), `${kind} uses the shared icon dimensions`)
      assert.ok(graphic.classList.contains(iconClassesByKind[kind]), `${kind} uses its semantic icon color rule`)
      assert.equal(icon.nextElementSibling, content, "the icon and content share the top row")
      assert.equal(getComputedStyle(notification).display, "flex", "Sonner lays the toast out as a row")
      assert.equal(getComputedStyle(notification).alignItems, "flex-start", "the icon follows the first line rather than the entire text block")
      assert.equal(getComputedStyle(icon).alignItems, "center")
      assert.equal(getComputedStyle(icon).marginTop, "0px", "alignment does not depend on an offset")
      assert.equal(getComputedStyle(icon).width, "14px")
      assert.equal(getComputedStyle(icon).height, getComputedStyle(title).lineHeight, "the icon box and title line have the same height")
      assert.equal(getComputedStyle(icon).height, "20px")
      assert.equal(getComputedStyle(graphic).width, "14px")
      assert.equal(getComputedStyle(graphic).height, "14px")
      if (kind !== "loading") {
        assert.ok(graphic.querySelector('circle[fill="currentColor"], path[fill="currentColor"]'), `${kind} has a solid colored body`)
        assert.ok(graphic.querySelector(`.${iconStyles.iconMark}`), `${kind} keeps its identifying mark distinct from the body`)
      }
      assert.equal(getComputedStyle(content).display, "flex")
      assert.equal(getComputedStyle(content).flexDirection, "column", "the description sits below the title")
      assert.equal(title.textContent, `Title ${kind}`)
      assert.equal(description.textContent, `Description ${kind}`)
      assert.equal(title.parentElement, content)
      assert.equal(description.parentElement, content)
      assert.equal(description.previousElementSibling, title)
    }
    await waitFor(() => assert.equal(view.container.querySelector("[data-sonner-toaster]").getAttribute("data-sonner-theme"), dark ? "dark" : "light"))
    act(() => toast.dismiss())
    view.unmount()
  }
})
