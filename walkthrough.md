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

First, choose a parent folder in Google Drive where everything will live. This can be anywhere — inside **My Drive** or on a **Shared Drive**. The scripts reference each folder by its ID, so the exact location doesn't matter as long as your Google account has access.

Open [Google Drive](https://drive.google.com), navigate to your chosen parent folder, and create the following subfolders. You can name them whatever you want, but this guide uses these names for clarity.

1. **Staging** — This is the inbox where ingested files land before sorting. Both email scripts write here.
2. **Notes** — The parent folder where sorted files end up. The organizer script creates subfolders inside this automatically based on your `filters.txt` categories.
3. **Duplicates** — Files that already exist in their target category folder get moved here instead of being overwritten.
4. **Logs** — The organizer writes per-category log files here (e.g., `<Category>_log.txt`, `Duplicates_log.txt`).
5. **Filters** — Holds your `filters.txt` configuration file.

Your Drive should look something like this:

```
My Drive (or Shared Drive)
└── Your Parent Folder/
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
2. Look at the URL in your browser — it will look like: `https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ012345`
3. The folder ID is the long string after `/folders/` — in this case: `1aBcDeFgHiJkLmNoPqRsTuVwXyZ012345`

Write down the IDs for all five folders. You'll need them in Step 4.

---

## Step 3: Upload filters.txt

Upload the `filters.txt` file into your **Filters** folder in Drive.

**The included `filters.txt` is an example only.** The categories and keywords are entirely up to you — they can be company names, project names, topics, people, departments, or anything else that appears in your filenames. Replace the example content with whatever makes sense for your workflow.

The format looks like this:

```ini
# Lines starting with # are comments
# Blank lines are ignored

[Your Category Name]
keyword1
keyword2
abbreviation

[Another Category]
keyword3
keyword4
```

Add a `[Category Name]` header for each group, then list keywords underneath — one per line. Keywords are matched as case-insensitive substrings against filenames. For example, if you have a `[Finance]` category with the keyword `invoice`, a file named `Invoice_March_2026.pdf` would match and get sorted into a `Finance/` subfolder. First match wins, and anything unmatched goes to `Misc/`.

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
const FOLDER_ID = '<your-staging-folder-id>';           // e.g. '1aBcDeFgHiJkLmNoPqRsTuVwXyZ012345' — the Drive folder where ingested files land before sorting
const SENDER_EMAIL = '<sender-email-address>';           // e.g. 'gemini-notes@google.com' — the email address to pull attachments and links from
const PROCESSED_LABEL = '<gmail-label-name>';            // e.g. 'ProcessedSaved' — label applied to threads after processing (auto-created if missing)
```

- `FOLDER_ID` — Paste your **Staging** folder ID from Step 2.
- `SENDER_EMAIL` — The email address you want to pull files from (e.g., `gemini-notes@google.com` for Gemini Notes).
- `PROCESSED_LABEL` — Any label name you choose. The script creates it automatically if it doesn't exist.

**File 2: `EmailtoDrive_Subject`**

Paste the contents of `EmailtoDrive_Subject.gs`. Update the configuration:

```javascript
const FOLDER_ID = '<your-staging-folder-id>';            // e.g. '1aBcDeFgHiJkLmNoPqRsTuVwXyZ012345' — same staging folder used by EmailtoDrive_Sender.gs
const SUBJECT_KEYWORDS = ['<subject-keyword-1>'];        // e.g. ['Document shared with you:', 'Invoice', 'Weekly Report'] — add as many as needed
const PROCESSED_LABEL = '<gmail-label-name>';            // e.g. 'ProcessedSaved' — should match the label used in EmailtoDrive_Sender.gs
```

- `FOLDER_ID` — Same **Staging** folder ID used in the Sender script.
- `SUBJECT_KEYWORDS` — An array of subject line keywords. Add as many as you need: `['Document shared with you:', 'Invoice', 'Weekly Report']`.
- `PROCESSED_LABEL` — Should match the label used in `EmailtoDrive_Sender.gs` so both scripts share a single "already processed" marker per thread.

**File 3: `MoveandOrganize`**

Paste the contents of `MoveandOrganize.gs`. Update the configuration:

```javascript
const SOURCE_FOLDER_ID  = '<your-staging-folder-id>';    // e.g. '1aBcDeFgHiJkLmNoPqRsTuVwXyZ012345' — same staging folder where ingestion scripts drop files
const PARENT_DEST_ID    = '<your-notes-folder-id>';      // e.g. '1xYzAbCdEfGhIjKlMnOpQrStUvWxYz678' — parent folder where categorized subfolders are created
const LOG_FOLDER_ID     = '<your-logs-folder-id>';       // e.g. '1pQrStUvWxYzAbCdEfGhIjKlMnOpQrS901' — folder for per-category log files
const FILTER_FOLDER_ID  = '<your-filters-folder-id>';    // e.g. '1dEfGhIjKlMnOpQrStUvWxYzAbCdEfG234' — folder containing filters.txt
const DUP_FOLDER_ID     = '<your-duplicates-folder-id>'; // e.g. '1mNoPqRsTuVwXyZaBcDeFgHiJkLmNoPq567' — folder for files that already exist in their target
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
6. Verify the email thread received your configured label (e.g., `ProcessedSaved`) in Gmail

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
        ├─ Notes/<Category A>/         ← categorized files
        ├─ Notes/<Category B>/
        ├─ Notes/<Category C>/
        ├─ Notes/Misc/                 ← unmatched files
        ├─ Duplicates/                 ← already existed in target
        └─ Logs/                       ← action history
```

Everything runs hands-off once the triggers are set. Just check in on the Logs folder occasionally and update `filters.txt` as your needs change.
