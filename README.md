# GNotesFetch & Organize

A Google Apps Script pipeline that automatically extracts email attachments and linked Google Workspace files from Gmail, then sorts them into categorized Google Drive folders using configurable keyword filters.

## The Problem

If you use services like Google Gemini Notes, shared Docs, or any workflow that sends files and links to your inbox, those files pile up fast. They sit buried in email threads, and the only way to get them into Drive is to open each one, click download or "Add to Drive," and manually drag it into the right folder. Do that across dozens of emails a week and it becomes a chore you stop doing — which means important docs get lost in your inbox.

This is especially critical for organizations on Google Workspace. Many orgs enforce a 90-day retention policy for meeting recordings and Gemini-generated meeting notes — after that window, they're automatically deleted. If you haven't manually saved them to Drive before the retention period expires, they're gone for good. Waiting around to do it by hand doesn't scale.

There's no native way in Gmail or Drive to say "grab everything from this sender" or "anything with this subject line, pull the attachments and copy the linked Docs, then file them by topic." Filters can label and archive, but they can't touch Drive.

## What This Solves

This project closes that gap with three scripts that form a two-stage pipeline:

**Stage 1 — Ingestion** pulls files out of Gmail and into a Drive staging folder. Two scripts handle this, each targeting emails differently:

- `EmailtoDrive_Sender.gs` — Targets a specific sender (configurable). Grabs all physical attachments (PDFs, images, Office files) and copies any linked Google Workspace files (Docs, Sheets, Slides) directly into Drive.
- `EmailtoDrive_Subject.gs` — Targets emails by subject line keywords (configurable). Same extraction logic, different filter. Useful for catching shared docs from multiple senders.

Both scripts label processed threads to avoid re-processing, handle deduplication by filename, and process in small batches to stay within Apps Script execution limits.

**Stage 2 — Organization** takes everything in the staging folder and sorts it:

- `MoveandOrganize.gs` — Reads a `filters.txt` config file that maps keyword patterns to folder names. Each file in staging gets matched against the filters (case-insensitive, first match wins) and moved into the corresponding subfolder. Duplicates are redirected to a separate archive folder. Every action is logged to per-category log files.

The filter config uses a simple INI-style format, so adding new categories or keywords is just editing a text file in Drive — no code changes needed.

## Project Structure

```
├── EmailtoDrive_Sender.gs   # Stage 1: Ingest by sender address
├── EmailtoDrive_Subject.gs  # Stage 1: Ingest by subject keywords
├── MoveandOrganize.gs        # Stage 2: Sort staging → categorized folders
├── filters.txt               # Category keyword config for the organizer
├── walkthrough.md            # Step-by-step deployment guide
└── README.md
```

## Quick Start

```bash
git clone https://github.com/jad0083/GNotesFetch_Organize.git
```

Then follow **[walkthrough.md](walkthrough.md)** for the full step-by-step deployment guide covering Git setup, folder creation, script configuration, permissions, and scheduling.

## Drive Folder Layout

All folders should live inside a parent folder in your Drive — either in **My Drive** or a **Shared Drive**. The scripts reference each folder by its ID, so the location doesn't matter as long as you have access.

```
My Drive (or Shared Drive)
└── Your Parent Folder/
    ├── Staging/                  ← Ingestion scripts drop files here
    ├── Notes/                    ← Parent destination for sorted files
    │   ├── <Category A>/         ← Auto-created from filters.txt categories
    │   ├── <Category B>/
    │   ├── <Category C>/
    │   └── Misc/                 ← Catches files matching no filter
    ├── Duplicates/               ← Files that already exist in their target
    ├── Logs/                     ← Per-category log files (<Category>_log.txt, etc.)
    └── Filters/                  ← Contains filters.txt
```

## How filters.txt Works

The included `filters.txt` is an example only. Categories and keywords are entirely up to you — they can be company names, project names, topics, people, or anything else that appears in your filenames.

```ini
# Lines starting with # are comments
# Blank lines are ignored

[Category A]
keyword1
keyword2
abbreviation

[Category B]
keyword3
keyword4
```

Each `[Category]` header maps to a subfolder name that gets auto-created in your destination folder. Keywords underneath are matched as case-insensitive substrings against filenames. For example, if you have a `[Acme]` category with the keyword `acme`, a file named `Acme_Q3_Review.pdf` would match and get moved to the `Acme/` folder. First matching category wins, and anything unmatched goes to `Misc/`. See `filters.txt` for a working example with sample categories.

## Requirements

- A Google account with Gmail and Google Drive
- Access to [Google Apps Script](https://script.google.com)
- Gmail API and Drive API enabled (prompted automatically on first authorization)

## License

J.Sacramento
