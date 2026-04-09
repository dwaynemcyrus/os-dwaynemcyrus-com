# v0 Test List

Pre-release manual test checklist for Personal OS. Test on iPhone (PWA) and desktop browser unless noted.

---

## Auth

- [ ] Sign in with email and password
- [ ] Invalid credentials show an error message
- [ ] Sign out from Settings clears the session and redirects to sign-in
- [ ] Navigating to a protected route while unauthenticated redirects to sign-in
- [ ] After sign-in, redirect returns to the originally requested route

---

## Home

- [ ] Today's date displays correctly in the header
- [ ] Inbox count badge reflects the real number of unprocessed captures
- [ ] "Create Today's Note" button appears when no daily note exists for today
- [ ] Tapping "Create Today's Note" creates and opens the note in the editor
- [ ] "Open Today's Note" button appears when today's note already exists
- [ ] Tapping "Open Today's Note" opens the existing note (no duplicate created)
- [ ] Missing daily template shows a modal warning with a link to settings
- [ ] Workbench section lists pinned items (up to limit)
- [ ] Tapping a workbench item opens its editor
- [ ] Workbench item shows type, subtype, and last-modified date

---

## FAB & Command Sheet

- [ ] FAB is visible on all main tab routes
- [ ] Tapping FAB opens the command sheet
- [ ] Holding FAB on iPhone (touch) opens the context sheet
- [ ] Holding FAB on desktop (mouse) opens the context sheet
- [ ] Releasing mouse off the FAB before threshold does not open context sheet
- [ ] Command sheet has no header — only label field, body, footer bar
- [ ] Rapid Log toggle is in the footer (left side)
- [ ] Cancel and Save buttons are in the footer (right side)
- [ ] Typing a title and tapping Save creates an inbox item and closes the sheet
- [ ] Save with Rapid Log enabled creates item and keeps sheet open for next capture
- [ ] Cancel closes the sheet without saving
- [ ] Label field is at least 16px (no iOS zoom on focus)

---

## Inbox

- [ ] Inbox lists all unprocessed captures in reverse chronological order
- [ ] Each row shows capture title/content preview and timestamp
- [ ] Inbox count label updates after items are processed
- [ ] Tapping an inbox item opens the editor for that item
- [ ] Tapping "Process in Wizard" from an inbox item routes to the Capture Wizard for that item
- [ ] Empty inbox shows an appropriate empty state

---

## Capture Wizard — Core Navigation

- [ ] Wizard loads with the first unprocessed capture in review (Step 0)
- [ ] Review step shows the capture title, content, and formatted timestamp
- [ ] Title is editable in the review step
- [ ] Stop button exits the wizard and navigates back to inbox
- [ ] Back button at each step returns to the previous step
- [ ] History snapshots are preserved — stepping back restores previous state
- [ ] Opening wizard from a specific inbox item via `?itemId=` starts on that capture
- [ ] "View All Captures" in the more menu toggles the capture list
- [ ] Capture list shows all unprocessed items; tapping one switches to it
- [ ] After processing a capture the wizard advances to the next one
- [ ] When all captures are processed the wizard exits to inbox

---

## Capture Wizard — Not-Actionable Branch

### Trash
- [ ] Selecting "Not actionable → Trash" shows confirmation step
- [ ] Confirming trash moves the item to trash and advances the wizard
- [ ] "No — Go Back" returns to the previous step

### Someday / Maybe
- [ ] Selecting "Someday / Maybe" → confirm saves item as `action: task, status: someday`
- [ ] Item appears in the correct view after save

### Journal
- [ ] Selecting "Journal → Istikarah" saves as `journal: istikarah`
- [ ] Selecting "Journal → Dream" saves as `journal: dream`
- [ ] Selecting "Journal → Scratch" saves as `journal: scratch`

### Log
- [ ] Selecting "Track → Contact" saves as `log: contact`
- [ ] Selecting "Track → Goal" saves as `log: goal`
- [ ] Selecting "Track → Outreach" saves as `log: outreach`

### Reference
- [ ] Selecting "Reference → Slip" saves as `reference: slip`
- [ ] Selecting "Reference → Quote" saves as `reference: quote`
- [ ] Selecting "Reference → Principle" saves as `reference: principle`
- [ ] Selecting "Reference → Directive" saves as `reference: directive`
- [ ] Selecting "Reference → Guide" saves as `reference: guide`
- [ ] Selecting "Reference → Identity" saves as `reference: identity`
- [ ] Selecting "Reference → Asset" saves as `reference: asset`
- [ ] Selecting "Reference → Software" saves as `reference: software`
- [ ] Selecting "Reference → Offer" saves as `reference: offer`
- [ ] Selecting "Reference → Literature" saves as `reference: literature`

### Consume (Source)
- [ ] Selecting "Something to consume → Article" routes to source-url step
- [ ] Selecting "Something to consume → Video" routes to source-url step
- [ ] Selecting "Something to consume → Podcast" routes to source-url step
- [ ] Selecting "Something to consume → Book" routes to source-url step
- [ ] Selecting "Something to consume → Post" routes to source-url step
- [ ] Selecting "Something to consume → Other" routes to source-url step
- [ ] If capture content is a URL it is pre-filled in the URL field
- [ ] URL field accepts input and advances to author step
- [ ] Duplicate URL detection warns when the URL already exists in library
- [ ] Author field accepts input and advances to area-assign step
- [ ] Skipping URL/author fields still advances correctly
- [ ] Final item saves as `reference: source` with correct medium

---

## Capture Wizard — Actionable Branch

### 2-Minute Rule
- [ ] Selecting "Actionable → Yes (< 2 min)" routes to do-now step
- [ ] Do-now step saves and advances the wizard

### Single Task
- [ ] Selecting "Actionable → No → Task" routes to task-when step
- [ ] "Today" saves task with today's date as `date_end`
- [ ] "Specific date" shows date picker; selected date saved as `date_end`
- [ ] "Anytime" saves task with no deadline
- [ ] "Someday" saves task as `status: someday`

### Project Task
- [ ] Selecting "Part of a larger project" routes to project-picker step
- [ ] Project search filters the list by name
- [ ] Selecting a project associates the task with that project
- [ ] Creating a new project from the picker works and associates the task

### Habit
- [ ] Selecting "A recurring habit" routes to habit-setup step
- [ ] Habit frequency and unit fields accept input
- [ ] Saves as `action: habit` with frequency and target populated

### Review
- [ ] Selecting "A scheduled review → Weekly" saves as `action: review-weekly`
- [ ] Selecting "Monthly" saves as `action: review-monthly`
- [ ] Selecting "Yearly" saves as `action: review-yearly`
- [ ] Selecting "Life area" saves as `action: review-area`

### Creation
- [ ] Selecting "Writing or creation → Essay" saves as `action: essay`
- [ ] Selecting "Framework" saves as `action: framework`
- [ ] Selecting "Lesson" saves as `action: lesson`
- [ ] Selecting "Manuscript" saves as `action: manuscript`
- [ ] Selecting "Comic" saves as `action: comic`
- [ ] Selecting "Poem" saves as `action: poem`
- [ ] Selecting "Story" saves as `action: story`
- [ ] Selecting "Artwork" saves as `action: artwork`
- [ ] Selecting "Case study" saves as `action: case-study`
- [ ] Selecting "Workshop" saves as `action: workshop`
- [ ] Selecting "Script" saves as `action: script`

---

## Capture Wizard — Area & Confirm Steps

- [ ] Area-assign step loads life area items from the database
- [ ] Selecting an area sets it on the item
- [ ] "Skip" on area-assign advances without setting an area
- [ ] Workbench toggle adds item to the workbench when enabled
- [ ] Confirm step shows a summary of all selections
- [ ] Confirm saves the item and advances the wizard
- [ ] Saved item appears in the correct view (library, notes, sources, etc.)

---

## Library (Items)

- [ ] `/items` lists all non-trashed items
- [ ] Settings → Library navigates to `/items`
- [ ] Search filters the list in real time
- [ ] Tapping an item opens its editor
- [ ] Pin toggle on an item adds/removes it from the workbench
- [ ] Pinned items appear on the Home workbench

---

## Notes

- [ ] Notes tab shows note subtypes with live counts
- [ ] Tapping a note type filters to that subtype list
- [ ] Each item in the list shows title and last-modified date
- [ ] Tapping an item opens its editor

---

## Sources

- [ ] Sources tab shows source items grouped or listed
- [ ] Filter views work (backlog / active / archived)
- [ ] Tapping a source item opens its editor

---

## Item Editor

- [ ] Opening an item loads its content into the editor
- [ ] Typing and saving updates the item in the database
- [ ] Frontmatter fields are preserved on save
- [ ] Chrome bar shows the item filename and back button
- [ ] Info button (i) shows item metadata
- [ ] More (•••) menu shows context actions
- [ ] Backlinks dialog shows items that link to this item via `[[wikilinks]]`
- [ ] Slash commands open the command palette (type `/`)
- [ ] `/insert` command inserts content at cursor
- [ ] Scroll-past-end toggle works when enabled
- [ ] Editor fills the full screen height with no overflow gaps (iPhone PWA)
- [ ] Chrome bar clears the iOS status bar (iPhone PWA standalone)
- [ ] Last line is reachable by scrolling above the FAB

---

## Template Editor (Settings)

- [ ] Settings → Templates lists all user templates
- [ ] Tapping a template opens the template editor
- [ ] Editing and saving persists changes
- [ ] Token fields (`{{date:YYYY-MM-DD}}` etc.) are preserved on save
- [ ] Delete template shows confirmation; confirmed delete removes it from the list
- [ ] Creating a new template opens the editor with a blank template

---

## Daily Note Settings

- [ ] Settings → Daily Note shows the template picker
- [ ] Selecting a template saves it as the daily note template
- [ ] Folder preference saves and applies to newly created daily notes
- [ ] Bulk update option updates existing daily notes to the new folder

---

## Trash

- [ ] Settings → Trash lists all trashed items
- [ ] Restoring an item removes it from Trash and returns it to the library
- [ ] Permanently deleting an item removes it from the database

---

## Settings

- [ ] Settings page shows all rows: Library, Daily Note, Templates, Keyboard Shortcuts, Slash Commands, Trash
- [ ] Each row navigates to the correct route
- [ ] Account section shows the signed-in email
- [ ] Sign Out button works and clears the session

---

## Navigation & Shell

- [ ] Bottom tab bar shows: Home, Inbox (with count badge), Notes, Sources, Settings
- [ ] Tab badge on Inbox reflects live unprocessed count
- [ ] Switching tabs preserves scroll position (where applicable)
- [ ] Shell chrome is sticky and never scrolls away
- [ ] No phantom scrollbar or empty space below content on any route (iPhone PWA)
- [ ] Safe area insets respected on iPhone notch/island (PWA standalone)

---

## Editor Keyboard & Slash Commands

- [ ] Settings → Keyboard Shortcuts page loads without error
- [ ] Settings → Slash Commands page loads without error
- [ ] Slash command list matches available commands in the editor
