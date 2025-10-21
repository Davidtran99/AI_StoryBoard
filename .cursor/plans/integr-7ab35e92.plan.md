<!-- 7ab35e92-90cd-41bc-afe1-28265468475a 7b48f53e-68fb-4983-a6b0-e517d21847c1 -->
# Align Idea screen UI with provided screenshot

## Goal
- Make the left column show a Fashion Engine Pro card exactly like the screenshot (title, description, creative brief textarea, CTA).
- Keep tabs (Ý tưởng chung/Music Video) and the right results panel unchanged in behavior but matched in spacing/visuals.

## Files to update
- `components/storyboard/ImportManager.tsx`: reposition and render the FashionEnginePro card at the top of the left column under the tabs; unify paddings/gaps.
- `components/storyboard/FashionEnginePro.tsx`: ensure title, subtitle, brief textarea height, and CTA text match the screenshot (Vietnamese copy, styles, border-dashed teal, spacing).
- `index.css` (or Tailwind classes in-place): minor spacing/border tweaks if needed.
- (Optional) `i18n/vi.ts`: verify Vietnamese strings for exact text.

## Key changes
- Place `<FashionEnginePro storyboard={storyboard} />` as the first block in the “Ý tưởng chung” tab, above the free-form idea textarea.
- Update the card content to:
  - Title: “HỆ THỐNG SÁNG TẠO VIDEO THỜI TRANG – FASHION ENGINE PRO”.
  - Subtitle: '"Director in a Box" – AI sẽ đóng vai trò đạo diễn…'
  - Brief textarea with pre-filled Creative Brief template, tall height (~10–14 rows), scrollable.
  - CTA button text: “Tạo Storyboard Thời trang”.
- Ensure left/right columns spacing and border match: dashed teal border, rounded-xl, bg-slate-900/40, same padding as screenshot.
- Keep Tabs and right “Kết quả sẽ hiện ở đây” box intact; adjust container paddings to align visually.

## Acceptance
- The first block in the left column is the Fashion card with exact title/subtitle/brief/CTA as screenshot.
- The free-form idea textarea remains below the card.
- No change in app logic; only UI placement and copy.


### To-dos

- [ ] Move FashionEnginePro to top of left column under Ý tưởng chung tab
- [ ] Match title/subtitle/CTA/copy with screenshot in FashionEnginePro
- [ ] Adjust spacing/paddings/borders to match screenshot