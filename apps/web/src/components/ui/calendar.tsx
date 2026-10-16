"use client"

import * as React from "react"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { Select } from "radix-ui"
import { DayPicker, getDefaultClassNames } from "react-day-picker"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

function Calendar({
  className,
  classNames,
  components,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const t = useTranslations("common.accessibility")
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      className={cn("w-fit p-2", className)}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-3", defaultClassNames.month),
        nav: cn("absolute inset-x-0 top-0 flex w-full items-center justify-between", defaultClassNames.nav),
        button_previous: cn(
          "inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-capta-text-secondary hover:bg-capta-surface-subtle hover:text-capta-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-capta-brand-primary disabled:pointer-events-none disabled:opacity-40",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          "inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-capta-text-secondary hover:bg-capta-surface-subtle hover:text-capta-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-capta-brand-primary disabled:pointer-events-none disabled:opacity-40",
          defaultClassNames.button_next,
        ),
        month_caption: cn("flex h-8 w-full items-center justify-center px-16", defaultClassNames.month_caption),
        dropdowns: cn("flex h-8 items-center justify-center gap-1.5 text-ui-semibold", defaultClassNames.dropdowns),
        dropdown_root: cn("relative inline-flex items-center rounded-md", defaultClassNames.dropdown_root),
        dropdown: cn("absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0", defaultClassNames.dropdown),
        caption_label: cn("inline-flex items-center gap-1 rounded-md pr-4 text-ui-semibold text-capta-text-primary", defaultClassNames.caption_label),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn(defaultClassNames.weekdays),
        weekday: cn("size-9 p-0 text-center text-caption font-medium text-capta-text-muted", defaultClassNames.weekday),
        week: cn(defaultClassNames.week),
        day: cn("size-9 p-0 text-center", defaultClassNames.day),
        day_button: cn(
          "flex size-9 cursor-pointer items-center justify-center rounded-md text-ui text-capta-text-primary hover:bg-capta-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-capta-brand-primary",
          defaultClassNames.day_button,
        ),
        today: cn("[&>button]:border [&>button]:border-capta-brand-primary", defaultClassNames.today),
        selected: cn("[&>button]:bg-capta-brand-primary [&>button]:font-semibold [&>button]:text-white hover:[&>button]:bg-capta-brand-primary", defaultClassNames.selected),
        outside: cn("text-capta-text-muted opacity-50", defaultClassNames.outside),
        disabled: cn("text-capta-text-muted opacity-40", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        MonthsDropdown: CalendarDropdown,
        YearsDropdown: CalendarDropdown,
        Nav: ({
          className,
          nextMonth,
          onNextClick,
          onPreviousClick,
          previousMonth,
          ...navProps
        }) => (
          <nav
            {...navProps}
            className={cn(
              "!absolute pointer-events-none inset-x-0 top-0 flex h-8 items-center justify-between",
              className,
            )}
          >
            <button
              aria-label={t("previousMonth")}
              className="pointer-events-auto inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-capta-text-secondary hover:bg-capta-surface-subtle hover:text-capta-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-capta-brand-primary disabled:pointer-events-none disabled:opacity-40"
              disabled={!previousMonth}
              onClick={onPreviousClick}
              type="button"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
            <button
              aria-label={t("nextMonth")}
              className="pointer-events-auto inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-capta-text-secondary hover:bg-capta-surface-subtle hover:text-capta-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-capta-brand-primary disabled:pointer-events-none disabled:opacity-40"
              disabled={!nextMonth}
              onClick={onNextClick}
              type="button"
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </nav>
        ),
        Chevron: ({ className, orientation, ...chevronProps }) => {
          const Icon = orientation === "left" ? ChevronLeft : orientation === "right" ? ChevronRight : ChevronDown

          return <Icon aria-hidden="true" className={cn("size-3.5", className)} {...chevronProps} />
        },
        ...components,
      }}
      showOutsideDays={showOutsideDays}
      {...props}
    />
  )
}

export { Calendar }

type CalendarDropdownOption = {
  disabled: boolean
  label: string
  value: number
}

type CalendarDropdownProps = {
  "aria-label"?: string
  className?: string
  disabled?: boolean
  onChange?: React.ChangeEventHandler<HTMLSelectElement>
  options?: CalendarDropdownOption[]
  style?: React.CSSProperties
  value?: number | readonly string[] | string
}

function CalendarDropdown({
  "aria-label": ariaLabel,
  disabled = false,
  onChange,
  options = [],
  value,
}: CalendarDropdownProps) {
  const selectedValue = String(value ?? "")
  const selectedOption = options.find((option) => String(option.value) === selectedValue)

  return (
    <Select.Root
      disabled={disabled}
      onValueChange={(nextValue) => {
        onChange?.({ target: { value: nextValue } } as React.ChangeEvent<HTMLSelectElement>)
      }}
      value={selectedValue}
    >
      <Select.Trigger
        aria-label={ariaLabel}
        className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1 text-ui-semibold text-capta-text-primary outline-none hover:bg-capta-surface-subtle focus-visible:ring-2 focus-visible:ring-capta-brand-primary disabled:pointer-events-none disabled:opacity-40"
      >
        <Select.Value>{selectedOption?.label}</Select.Value>
        <Select.Icon>
          <ChevronDown aria-hidden="true" className="size-3.5 text-capta-text-secondary" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Content
        align="start"
        className="z-[60] max-h-64 overflow-hidden rounded-md border border-capta-border-default bg-capta-surface-card p-1 shadow-lg"
        position="popper"
        side="bottom"
        sideOffset={4}
      >
        <Select.Viewport className="max-h-64 overflow-y-auto">
          {options.map((option) => (
            <Select.Item
              className="relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-ui text-capta-text-primary outline-none select-none data-[highlighted]:bg-capta-surface-subtle data-[disabled]:pointer-events-none data-[disabled]:opacity-40"
              disabled={option.disabled}
              key={option.value}
              value={String(option.value)}
            >
              <Select.ItemText>{option.label}</Select.ItemText>
            </Select.Item>
          ))}
        </Select.Viewport>
      </Select.Content>
    </Select.Root>
  )
}
