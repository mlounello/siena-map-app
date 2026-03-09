# Siena UI Standards (Required)

These standards are mandatory for all new pages and major rewrites.

## 1. Foundation

- Use Siena tokens from `src/app/globals.css` only.
- Do not hardcode new color hex values in page/component class names.
- Use brand palette variables (`--brand`, `--brand-dark`, `--brand-yellow`, etc.).

## 2. Typography

- Headline: Oswald uppercase (`.siena-title` / `.headline-primary`)
- Subhead and utility labels: Gudea (`.siena-eyebrow`, `.siena-panel-title`)
- Body: Merriweather (`body` default)
- Sullivan is reserved for signature moments only (`.headline-display`).

## 3. Required Building Blocks

All new pages must be composed from:
- `PageHeader`
- `Panel`
- `Toolbar`
- `Button`
- `Badge`

from `src/components/ui/siena.tsx`.

For forms and page shells, prefer:
- `PageScaffold` / `PageSection`
- `TextInput` / `TextArea` / `SelectInput`

from `src/components/ui/page-scaffold.tsx` and `src/components/ui/form-controls.tsx`.

## 4. Layout Rhythm

- Vertical spacing: use 6/4/3 unit rhythm already used in dashboard screens.
- Avoid mixing random panel treatments; use `siena-panel` as default container.
- Keep action controls in `Toolbar` blocks.

## 5. State Styling

- Workflow/status states must use `Badge` with semantic tones.
- Destructive actions must use `Button variant="danger"`.
- Primary call-to-action per section should be `Button` default variant.

## 6. Map Surfaces

- Map wrappers must use panel framing and consistent top control bars.
- Marker/line colors should default to Siena brand colors unless data-specific.

## 7. Accessibility

- Maintain visible focus outlines (already tokenized).
- Keep text contrast high on brand backgrounds.
- Do not rely on color alone for status; include text labels.
