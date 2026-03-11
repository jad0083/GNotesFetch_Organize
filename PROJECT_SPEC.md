# Project Spec — GNotesFetch & Organize

**Author:** J.Sacramento
**Last Updated:** 2026-03-11
**Status:** Active
**Repo:** [github.com/jad0083/GNotesFetch_Organize](https://github.com/jad0083/GNotesFetch_Organize)

---

## Purpose

Automate the extraction of email attachments and linked Google Workspace files from Gmail, then sort them into categorized Google Drive folders based on configurable keyword filters.

The primary motivation is Google Workspace's org-level 90-day retention policy for meeting recordings and Gemini-generated meeting notes. Files that aren't manually saved to Drive before the retention window expires are permanently deleted. This pipeline eliminates that manual process entirely.

---

## Architecture

The system is a two-stage pipeline built entirely on Google Apps Script, requiring no external infrastructure.

```
Stage 1: INGESTION                         Stage 2: ORGANIZATION
┌─────────────────────────┐                ┌──────────────────────────┐
│  Gmail Inbox            │                │  Staging Folder (Drive)  │
│                         │                │                          │
│  EmailtoDrive_Sender.gs │──── files ───▶│  MoveandOrganize.gs      │
│  EmailtoDrive_Subject.gs│──── files ───▶│  reads filters.txt       │
│                         │                │                          │
└─────────────────────────┘                └────────┬─────────────────┘
                                                    │
                                           ┌────────▼─────────────────┐
                                           │  Destination Folders     │
                                           │  ├── <Category>/         │
                                           │  ├── Misc/               │
                                           │  ├── Duplicates/         │
                                           │  └── Logs/               │
                                           └──────────────────────────┘
```

---

## Components

### EmailtoDrive_Sender.gs

**Function:** `downloadEverythingFromSender()`

Searches Gmail for emails from a configured sender address. For each unprocessed thread, it saves physical attachments (PDFs, images, Office files, ZIPs) and copies any linked Google Workspace files (Docs, Sheets, Slides, etc.) into a staging folder in Drive.

| Config Variable   | Purpose                                       |
|-------------------|-----------------------------------------------|
| `FOLDER_ID`       | Drive ID of the staging folder                |
| `SENDER_EMAIL`    | Target sender address to filter by            |
| `PROCESSED_LABEL` | Gmail label applied to processed threads      |

**Batch size:** 10 threads per execution.

**Deduplication:** Filename-based. If a file with the same name already exists in the staging folder, it is skipped.

**Link extraction regex:** `https://(docs|drive|script|sites).google.com/[^\s"'>]+`
**File ID extraction regex:** `[-\w]{25,}`

---

### EmailtoDrive_Subject.gs

**Function:** `downloadEverythingbySubject()`

Same extraction logic as the Sender script, but filters by subject line keywords instead of sender address. Supports multiple keywords combined with OR logic.

| Config Variable    | Purpose                                        |
|--------------------|------------------------------------------------|
| `FOLDER_ID`        | Drive ID of the staging folder                 |
| `SUBJECT_KEYWORDS` | Array of subject line substrings to match      |
| `PROCESSED_LABEL`  | Gmail label applied to processed threads       |

**Batch size:** 15 threads per execution.

**Gmail search query format:** `(subject:"keyword1" OR subject:"keyword2") -label:ProcessedSaved in:anywhere`

---

### MoveandOrganize.gs

**Function:** `moveStagingtoNotesV2()`

Reads all files from the staging folder, matches each filename against keyword patterns defined in `filters.txt`, and moves files into categorized subfolders under a parent destination folder.

| Config Variable    | Purpose                                              |
|--------------------|------------------------------------------------------|
| `SOURCE_FOLDER_ID` | Drive ID of the staging folder (input)               |
| `PARENT_DEST_ID`   | Drive ID of the parent folder for sorted output      |
| `LOG_FOLDER_ID`    | Drive ID of the folder for log files                 |
| `FILTER_FOLDER_ID` | Drive ID of the folder containing `filters.txt`      |
| `DUP_FOLDER_ID`    | Drive ID of the folder for duplicate files           |
| `FILTER_FILE_NAME` | Name of the filter config file (default: `filters.txt`) |
| `UNSORTED_NAME`    | Subfolder name for unmatched files (default: `Misc`) |

**Helper functions:**

| Function                | Purpose                                                |
|-------------------------|--------------------------------------------------------|
| `parseAllFilters()`     | Parses INI-style `filters.txt` into a category map     |
| `getOrCreateSubfolder()`| Gets or creates a subfolder by name under a parent     |
| `updateSpecificLog()`   | Appends a log entry to a per-category log file         |

**Matching logic:** Case-insensitive substring match. First matching category wins. Unmatched files go to the `Misc` subfolder.

**Duplicate handling:** If a file with the same name already exists in the target category folder, the incoming file is moved to the Duplicates folder instead.

**Logging:** Every move and duplicate detection is logged to `<Category>_log.txt` and `Duplicates_log.txt` respectively.

---

### filters.txt

INI-style configuration file that defines sorting categories and their associated keywords. Stored in Drive and read fresh on every execution — no code changes needed to update categories.

**Format:**

```ini
# Comments start with #
# Blank lines are ignored

[Category Name]
keyword1
keyword2

[Another Category]
keyword3
```

The included `filters.txt` is an example only. Categories and keywords can be anything relevant to the user's workflow.

---

## Drive Folder Structure

All folders live inside a user-chosen parent folder, which can be in My Drive or a Shared Drive.

| Folder       | Purpose                                           | Referenced By                          |
|--------------|---------------------------------------------------|----------------------------------------|
| Staging      | Ingestion landing zone                            | All three scripts (`FOLDER_ID` / `SOURCE_FOLDER_ID`) |
| Notes        | Parent for categorized subfolders                 | `MoveandOrganize.gs` (`PARENT_DEST_ID`)  |
| Duplicates   | Files that already exist in their target folder   | `MoveandOrganize.gs` (`DUP_FOLDER_ID`)   |
| Logs         | Per-category log files                            | `MoveandOrganize.gs` (`LOG_FOLDER_ID`)   |
| Filters      | Contains `filters.txt`                            | `MoveandOrganize.gs` (`FILTER_FOLDER_ID`)|

---

## Execution Model

All scripts run on Google Apps Script's time-driven triggers.

| Script                       | Recommended Interval | Batch Size |
|------------------------------|----------------------|------------|
| `downloadEverythingFromSender` | Every 15 minutes     | 10 threads |
| `downloadEverythingbySubject`  | Every 15 minutes     | 15 threads |
| `moveStagingtoNotesV2`         | Every 15 minutes     | Unbounded  |

**Execution time limit:** 6 minutes per run (Apps Script constraint). The ingestion scripts are batch-limited to stay within this. The organizer processes all files in the staging folder per run and has no built-in batch limit — if the staging folder grows very large between runs, it could hit the timeout.

**Trigger staggering:** Ingestion and organization triggers should be offset to avoid overlapping execution on the same staging folder.

---

## Shared State

| Resource           | Shared Between                     | Purpose                        |
|--------------------|------------------------------------|--------------------------------|
| Staging folder     | All three scripts                  | Ingestion output / organizer input |
| `ProcessedSaved` label | Both ingestion scripts          | Prevents re-processing threads |
| `filters.txt`      | User ↔ `MoveandOrganize.gs`       | Category configuration         |

---

## Known Limitations

- **Filename-based dedup only.** Two different files with identical names will collide — the second is silently skipped during ingestion, or routed to Duplicates during organization.
- **Thread-level labeling.** The `ProcessedSaved` label is applied per-thread, not per-message. New messages added to an already-processed thread won't be picked up.
- **`makeCopy` creates snapshots.** Copied Workspace files are point-in-time copies, not live links. Future edits to the original are not reflected.
- **No execution time guard on organizer.** Large staging folder backlogs could exceed the 6-minute limit.
- **Log append pattern.** `updateSpecificLog` reads and rewrites the full log file on each append, which slows as logs grow.
- **Unused variable.** `isMatch` (line 51 of `MoveandOrganize.gs`) is assigned but never read.

---

## Dependencies

| Dependency              | Version / Notes                             |
|-------------------------|---------------------------------------------|
| Google Apps Script      | V8 runtime                                  |
| GmailApp service        | Requires Gmail read/write scope             |
| DriveApp service        | Requires Drive read/write scope             |
| Google Workspace account| Gmail + Drive access required               |

No external libraries or npm packages.

---

## File Manifest

| File                      | Type   | Purpose                              |
|---------------------------|--------|--------------------------------------|
| `EmailtoDrive_Sender.gs`  | Script | Stage 1: Ingest by sender address    |
| `EmailtoDrive_Subject.gs` | Script | Stage 1: Ingest by subject keywords  |
| `MoveandOrganize.gs`      | Script | Stage 2: Sort staging into categories|
| `filters.txt`             | Config | Example category keyword filters     |
| `README.md`               | Docs   | Project overview and quick start     |
| `walkthrough.md`          | Docs   | Step-by-step deployment guide        |
| `PROJECT_SPEC.md`         | Docs   | This file                            |
