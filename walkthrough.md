# Deployment Walkthrough

A step-by-step guide to setting up the GNotesFetch & Organize pipeline from scratch. By the end, you'll have automated scripts pulling files from Gmail into Drive and sorting them into categorized folders on a schedule.

---

## Prerequisites

Before starting, make sure you have:

- A Google account with Gmail and Google Drive
- Files or emails you want to organize (e.g., Gemini Notes emails, shared Google Docs notifications)
- About 15–20 minutes

---

## Step 1: Create the Drive Folder Structure

Open [Google Drive](https://drive.google.com) and create the following folders. You can name them whatever you want, but this guide uses these names for clarity.

1. **Staging** — This is the inbox where ingested files land before sorting. Both email scripts write here.
2. **Notes** — The parent folder where sorted files end up. The organizer script creates subfolders inside this automatically based on your `filters.txt` categories.
3. **Duplicates** — Files that already exist in their target category folder get moved here instead of being overwritten.
4. **Logs** — The organizer writes per-category log files here (e.g., `Target_log.txt`, `Duplicates_log.txt`).
5. **Filters** — Holds your `filters.txt` configuration file.

Your Drive should look something like this:

```
My Drive
├── Staging/
├── Notes/
├── Duplicates/
├── Logs/
└── Filters/
```

---

## Step 2: Get Your Folder IDs

Each script references folders by their Drive ID. To find a folder's ID:

1. Open the folder in Google Drive
2. Look at the URL in your browser — it will look like: `https://drive.google.com/drive/folders/1qgiSlFnzKO5Q1sRE00xi2Vzt3VGYL_qY`
3. The folder ID is the long string after `/folders/` — in this case: `1qgiSlFnzKO5Q1sRE00xi2Vzt3VGYL_qY`

Write down the IDs for all five folders. You'll need them in Step 4.

---

## Step 3: Upload filters.txt

Upload the `filters.txt` file into your **Filters** folder in Drive. If you're starting from the example, it looks like this:

```ini
# Category filters — edit keywords to match your filenames

[Target]
target
tgt
bullseye

[Walmart]
walmart
wmt
sams club
sam's club

[Sift]
sift
sift science

[Juniper]
juniper
jnpr
junos

[UKG]
ukg
kronos
ultipro
```

To customize: add a new `[Category Name]` header, then list keywords underneath — one per line. Keywords are matched as case-insensitive substrings against filenames. A file named `Juniper_Network_Config.pdf` would match the `juniper` keyword and get sorted into a `Juniper/` subfolder.

---

## Step 4: Create the Apps Script Project

1. Go to [script.google.com](https://script.google.com)
2. Click **New project**
3. Rename the project (click "Untitled project" at the top) to something like `GNotesFetch_Organize`

You'll see a default file called `Code.gs`. You can either rename it or delete it — you'll be creating three separate script files.

### Add the script files

For each of the three scripts below, click the **+** icon next to "Files" in the left sidebar, select **Script**, and name it accordingly. Then paste in the contents.

**File 1: `EmailtoDrive_Sender`**

Paste the contents of `EmailtoDrive_Sender.gs`. Then update the configuration block at the top:

```javascript
const FOLDER_ID = 'your-staging-folder-id';       // ← Staging folder ID from Step 2
const SENDER_EMAIL = 'gemini-notes@google.com';    // ← Change to your target sender
const PROCESSED_LABEL = 'ProcessedSaved';          // ← Gmail label name (auto-created)
```

- `FOLDER_ID` should be your **Staging** folder ID.
- `SENDER_EMAIL` is the email address you want to pull files from. The default targets Gemini Notes.
- `PROCESSED_LABEL` can be any label name. The script creates it automatically if it doesn't exist.

**File 2: `EmailtoDrive_Subject`**

Paste the contents of `EmailtoDrive_Subject.gs`. Update the configuration:

```javascript
const FOLDER_ID = 'your-staging-folder-id';                  // ← Same Staging folder ID
const SUBJECT_KEYWORDS = ['Document shared with you:'];       // ← Your subject filters
const PROCESSED_LABEL = 'ProcessedSaved';                     // ← Same label as above
```

- `SUBJECT_KEYWORDS` is an array — you can add multiple entries like `['Document shared with you:', 'Invoice', 'Weekly Report']`.
- Uses the same `PROCESSED_LABEL` so both scripts share a single "already processed" marker per thread.

**File 3: `MoveandOrganize`**

Paste the contents of `MoveandOrganize.gs`. Update the configuration:

```javascript
const SOURCE_FOLDER_ID  = 'your-staging-folder-id';      // ← Same Staging folder ID
const PARENT_DEST_ID    = 'your-notes-folder-id';         // ← Notes folder ID
const LOG_FOLDER_ID     = 'your-logs-folder-id';          // ← Logs folder ID
const FILTER_FOLDER_ID  = 'your-filters-folder-id';       // ← Filters folder ID
const DUP_FOLDER_ID     = 'your-duplicates-folder-id';    // ← Duplicates folder ID
```

---

## Step 5: Authorize the Scripts

The first time you run any of these scripts, Google will ask you to authorize access to Gmail and Drive. Here's how:

1. Select `downloadEverythingFromSender` from the function dropdown at the top of the editor
2. Click **Run**
3. A dialog will appear saying "Authorization required." Click **Review permissions**
4. Select your Google account
5. You may see a warning screen saying "Google hasn't verified this app." Click **Advanced**, then **Go to GNotesFetch_Organize (unsafe)**. This is normal for personal Apps Script projects.
6. Click **Allow** to grant Gmail and Drive access

You only need to do this once — all three scripts share the same permissions.

---

## Step 6: Test Each Script Manually

Before setting up automation, test each function individually to confirm they work.

### Test the Sender script

1. Make sure you have at least one unprocessed email from your target sender
2. Select `downloadEverythingFromSender` from the function dropdown
3. Click **Run**
4. Check the execution log (View → Logs) for output
5. Verify files appeared in your Staging folder
6. Verify the email thread received the `ProcessedSaved` label in Gmail

### Test the Subject script

1. Make sure you have at least one email matching your subject keywords
2. Select `downloadEverythingbySubject` from the dropdown
3. Click **Run**
4. Check logs and verify files in Staging

### Test the Organizer

1. Make sure there are files in your Staging folder (from the previous tests)
2. Select `moveStagingtoNotesV2` from the dropdown
3. Click **Run**
4. Check that files moved into categorized subfolders under Notes
5. Check the Logs folder for log entries
6. If any duplicates were detected, verify they landed in the Duplicates folder

---

## Step 7: Set Up Automated Triggers

Once everything works manually, set up time-based triggers to run the scripts automatically.

1. In the Apps Script editor, click the **clock icon** (Triggers) in the left sidebar
2. Click **+ Add Trigger** in the bottom-right corner

### Trigger 1: Sender Ingestion

| Setting                   | Value                          |
|---------------------------|--------------------------------|
| Choose which function     | `downloadEverythingFromSender` |
| Choose deployment         | Head                           |
| Select event source       | Time-driven                    |
| Select type of time-based | Minutes timer                  |
| Select minute interval    | Every 15 minutes               |

### Trigger 2: Subject Ingestion

| Setting                   | Value                          |
|---------------------------|--------------------------------|
| Choose which function     | `downloadEverythingbySubject`  |
| Choose deployment         | Head                           |
| Select event source       | Time-driven                    |
| Select type of time-based | Minutes timer                  |
| Select minute interval    | Every 15 minutes               |

### Trigger 3: Organizer

| Setting                   | Value                          |
|---------------------------|--------------------------------|
| Choose which function     | `moveStagingtoNotesV2`         |
| Choose deployment         | Head                           |
| Select event source       | Time-driven                    |
| Select type of time-based | Minutes timer                  |
| Select minute interval    | Every 15 minutes               |

**Important:** Stagger the triggers so they don't overlap. For example, if the ingestion scripts run at :00 and :15, set the organizer to run at :05 and :20 — or just use a 15-minute interval and let Google handle the offset (triggers don't fire at exact times, they fire within the interval window).

Alternatively, if volume is low, you can set ingestion to run every 15 minutes and the organizer to run every 30 minutes or hourly.

---

## Step 8: Monitor and Maintain

### Check execution logs

Go to the Apps Script editor → **Executions** (left sidebar) to see a history of all runs, including any errors.

### Common issues

**"No new emails found"** — This is normal when there are no unprocessed emails. The script skips gracefully.

**"SKIPPED LINK (Access Denied or Not a File)"** — The script found a Google Workspace link in an email but couldn't access it. This usually means the linked file requires permissions you don't have, or the link points to a folder rather than a file.

**"CRITICAL ERROR: filter file 'filters.txt' not found"** — The organizer can't find `filters.txt` in your Filters folder. Double-check the `FILTER_FOLDER_ID` and make sure the file is named exactly `filters.txt`.

**Script timeout (6 minutes exceeded)** — If your Staging folder accumulates hundreds of files between runs, the organizer may hit the Apps Script execution limit. Increase the trigger frequency to process smaller batches more often.

### Updating filters

To add a new category or keyword, simply edit `filters.txt` in your Filters folder in Drive. No code changes or redeployment needed — the organizer reads the file fresh on every run.

---

## Summary

Once deployed, the pipeline runs like this:

```
Gmail Inbox
    │
    ├─ downloadEverythingFromSender()   ← matches by sender
    ├─ downloadEverythingbySubject()    ← matches by subject
    │
    ▼
Staging Folder (Drive)
    │
    └─ moveStagingtoNotesV2()           ← reads filters.txt
        │
        ├─ Notes/Target/               ← categorized files
        ├─ Notes/Walmart/
        ├─ Notes/Sift/
        ├─ Notes/Juniper/
        ├─ Notes/UKG/
        ├─ Notes/Misc/                 ← unmatched files
        ├─ Duplicates/                 ← already existed in target
        └─ Logs/                       ← action history
```

Everything runs hands-off once the triggers are set. Just check in on the Logs folder occasionally and update `filters.txt` as your needs change.
